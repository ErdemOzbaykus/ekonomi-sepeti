import { guard, redis } from "../lib/admin.js";
import { toGoogle } from "./yorumlar.js";

// İzmir University of Economics (İEÜ) main campus coordinates
export const IEU_LAT = 38.38883;
export const IEU_LNG = 27.04495;

// Generic city center fallback (İzmir metropolitan center in Google Maps static fallback)
export const IZMIR_CENTER_LAT = 38.44014;
export const IZMIR_CENTER_LNG = 27.14828;

export function isGenericCityCenter(lat, lng) {
  if (lat == null || lng == null) return false;
  return Math.abs(Number(lat) - IZMIR_CENTER_LAT) < 0.01 && Math.abs(Number(lng) - IZMIR_CENTER_LNG) < 0.01;
}

export function calcDistance(lat1, lon1, lat2 = IEU_LAT, lon2 = IEU_LNG) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const walkingKm = Math.max(0.1, c * R * 1.25); // standard ~1.25x street grid factor, minimum 0.1 km
  return `${walkingKm.toFixed(1)} km`;
}

export function parseCoordinates(url, html = "") {
  if (!url) return { lat: null, lng: null };

  // 1. Check coordinates directly in URL
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const d3Match = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const qMatch = url.match(/[?&](?:q|ll|query|sll)=(-?\d+\.\d+),(-?\d+\.\d+)/);

  let lat = atMatch?.[1] || d3Match?.[1] || qMatch?.[1] || null;
  let lng = atMatch?.[2] || d3Match?.[2] || qMatch?.[2] || null;

  // 2. If coordinates weren't in URL, inspect HTML content (embedded markers / links)
  if ((!lat || !lng) && html) {
    const markerMatch = html.match(/markers=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) ||
                        html.match(/markers=(-?\d+\.\d+),(-?\d+\.\d+)/) ||
                        html.match(/ll=(-?\d+\.\d+)%2C(-?\d+\.\d+)/);
    const htmlAtMatch = html.match(/\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const htmlD3Match = html.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);

    lat = markerMatch?.[1] || htmlAtMatch?.[1] || htmlD3Match?.[1] || null;
    lng = markerMatch?.[2] || htmlAtMatch?.[2] || htmlD3Match?.[2] || null;
  }

  // 3. Reject generic city center fallback of İzmir (38.44014, 27.14828)
  if (lat && lng && isGenericCityCenter(lat, lng)) {
    lat = null;
    lng = null;
  }

  return {
    lat: lat ? Number(lat) : null,
    lng: lng ? Number(lng) : null,
  };
}

export async function GET(request) {
  const denied = await guard(request, redis());
  if (denied) return denied;

  const urlParam = new URL(request.url).searchParams.get("url");
  if (!urlParam) {
    return Response.json({ error: "Lütfen bir harita linki girin." }, { status: 400 });
  }

  let rawUrl = urlParam.trim();
  if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
    rawUrl = "https://" + rawUrl;
  }

  let expandedUrl = rawUrl;
  let lat = null;
  let lng = null;
  let placeId = null;
  let name = null;
  let phone = null;
  let google = null;

  try {
    const res = await fetch(rawUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      },
    });

    expandedUrl = res.url || rawUrl;

    // Check place name in URL path (e.g. /maps/place/Pavo+Coffee+Co/...)
    const nameMatch = expandedUrl.match(/\/place\/([^/@?]+)/);
    if (nameMatch && !nameMatch[1].startsWith("?") && !nameMatch[1].startsWith("place_id")) {
      try {
        const decoded = decodeURIComponent(nameMatch[1].replace(/\+/g, " ")).trim();
        if (decoded && !decoded.includes("=")) name = decoded;
      } catch {}
    }

    const parsedCoords = parseCoordinates(expandedUrl);
    if (parsedCoords.lat && parsedCoords.lng) {
      lat = parsedCoords.lat;
      lng = parsedCoords.lng;
    } else {
      const html = await res.text();
      const htmlCoords = parseCoordinates(expandedUrl, html);
      lat = htmlCoords.lat;
      lng = htmlCoords.lng;
    }
  } catch (err) {
    console.error("Map link fetch error:", err);
  }

  // Extract placeId if present
  const pidMatch = expandedUrl.match(/place_id:([\w-]+)/) ||
                   expandedUrl.match(/[?&]query_place_id=([\w-]+)/) ||
                   rawUrl.match(/place_id:([\w-]+)/);
  if (pidMatch) {
    placeId = pidMatch[1];
  }

  // If Places API key is configured and placeId is known, fetch live Google place details
  if (placeId && process.env.GOOGLE_PLACES_API_KEY) {
    try {
      const gRes = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=tr`, {
        headers: {
          "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsUri,location,displayName,nationalPhoneNumber",
        },
      });
      if (gRes.ok) {
        const p = await gRes.json();
        if (p.location?.latitude && p.location?.longitude) {
          lat = p.location.latitude;
          lng = p.location.longitude;
        }
        google = toGoogle(p, expandedUrl);
        if (p.displayName?.text) name = p.displayName.text;
        if (p.nationalPhoneNumber) phone = p.nationalPhoneNumber;
      }
    } catch (err) {
      console.error("Places API lookup error:", err);
    }
  } else if (placeId) {
    google = {
      url: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
      rating: null,
      count: null,
      reviews: [],
    };
  }

  let distance = null;
  if (lat && lng) {
    distance = calcDistance(Number(lat), Number(lng));
  } else {
    // If coords could not be extracted from URL, fallback to known database vendor if exists
    try {
      const r = redis();
      const allVendors = Object.values((await r.hgetall("esnaflar")) || {});
      const matched = allVendors.find(v =>
        (placeId && v.google?.url?.includes(placeId)) ||
        (placeId && v.map?.includes(placeId)) ||
        (v.map && (v.map === rawUrl || v.map === expandedUrl)) ||
        (name && v.name && v.name.toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR"))
      );
      if (matched?.distance) {
        distance = matched.distance;
      }
    } catch {}
  }

  return Response.json({
    ok: true,
    url: expandedUrl,
    distance,
    lat: lat ? Number(lat) : null,
    lng: lng ? Number(lng) : null,
    placeId,
    name,
    phone,
    google,
  });
}

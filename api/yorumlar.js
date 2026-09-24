import seed from "../esnaflar.json" with { type: "json" };
import { redis } from "../lib/admin.js";

// Live Google rating + reviews for one vendor, via Places API (New).
// Only vendors we already know are looked up, so the key can't be used for arbitrary places.
// ponytail: 1-day CDN cache keeps ~20 vendors inside the free monthly Places quota; shorten if fresher reviews matter
export async function GET(request) {
  const id = new URL(request.url).searchParams.get("id");
  const esnaf = (id && (await redis().hget("esnaflar", id))) || seed.find(m => m.id === id);
  const placeId = esnaf?.google?.url.match(/place_id:([\w-]+)/)?.[1];
  if (!placeId) return Response.json({ error: "Bu esnafın Google kaydı yok." }, { status: 404 });
  if (!process.env.GOOGLE_PLACES_API_KEY) return Response.json({ error: "GOOGLE_PLACES_API_KEY tanımlı değil." }, { status: 503 });

  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=tr`, {
    headers: { "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY, "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsUri" },
  });
  if (!res.ok) {
    console.error("Places API", res.status, await res.text());
    return Response.json({ error: "Google yorumları alınamadı." }, { status: 502 });
  }
  const p = await res.json();
  return Response.json(toGoogle(p, esnaf.google.url), { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400" } });
}

// Same shape as esnaflar.json's `google` field: reviews = [stars, text, when, author], newest first.
export const toGoogle = (p, fallbackUrl) => ({
  rating: p.rating ?? null,
  count: p.userRatingCount ?? null,
  url: p.googleMapsUri || fallbackUrl,
  reviews: (p.reviews || [])
    .filter(r => r.text?.text)
    .sort((a, b) => (b.publishTime || "").localeCompare(a.publishTime || ""))
    .map(r => [r.rating, r.text.text, r.relativePublishTimeDescription, r.authorAttribution?.displayName || ""]),
});

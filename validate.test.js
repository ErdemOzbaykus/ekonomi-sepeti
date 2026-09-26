import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "./api/esnaflar.js";

const ok = {
  name: "Bizim Kokoreç", type: "Kokoreç", map: "https://maps.app.goo.gl/abc123", hours: "12:00-02:00",
  distance: "0.2 km",
  phone: "+905393299140", phoneText: "0539 329 91 40", color: "#fbd9c4", evil: "<script>",
  cats: [{ name: "Kokoreç", cols: ["Yarım", "Tam"], items: [["Kokoreç", 245, -1]] }, { name: "İçecek", cols: ["Fiyat"], items: [["Ayran", 40]] }],
};

test("accepts a valid vendor and drops unknown fields", () => {
  const v = validate(ok);
  assert.match(v.id, /^bizim-kokorec-/);
  assert.equal(v.evil, undefined);
  assert.equal(v.distance, "0.2 km");
  assert.deepEqual(v.cats[1], { name: "İçecek", items: [["Ayran", 40]] });
});

test("allows unknown hours", () => assert.equal(validate({ ...ok, hours: null }).hours, null));

test("rejects bad input", () => {
  assert.throws(() => validate({ ...ok, name: "" }));
  assert.throws(() => validate({ ...ok, hours: "25:00-02:00" }));
  assert.throws(() => validate({ ...ok, phone: "javascript:alert(1)" }));
  assert.throws(() => validate({ ...ok, cats: [{ name: "X", items: [["Y", 1, "javascript:alert(1)"]] }] }));
  assert.throws(() => validate({ ...ok, map: "javascript:alert(1)" }));
  assert.throws(() => validate({ ...ok, image: "https://evil.com/x.jpg" }));
  assert.throws(() => validate({ ...ok, map: "https://evil.com/maps/" }));
  assert.throws(() => validate({ ...ok, cats: [{ name: "X", cols: ["A", "B"], items: [["Y", 1]] }] }));
});

test("editing keeps the existing id and allows an empty menu", () => {
  const v = validate({ ...ok, cats: [] }, "bizim-kokorec");
  assert.equal(v.id, "bizim-kokorec");
  assert.deepEqual(v.cats, []);
});

test("keeps uploaded cover and item images, ignores client emoji/color", () => {
  const url = "https://abc123.public.blob.vercel-storage.com/resimler/0b9c-4f.webp";
  const v = validate({ ...ok, image: url, emoji: "🍔", color: "#000000", cats: [{ name: "X", items: [["Y", 1, url], ["Z", 2]] }] });
  assert.equal(v.image, url);
  assert.equal(v.emoji, undefined);
  assert.equal(v.color, undefined);
  assert.equal(v.featured, undefined);
  assert.equal(validate({ ...ok, featured: true }).featured, true);
  assert.equal(validate({ ...ok, featured: "yes" }).featured, undefined);
  assert.deepEqual(v.cats[0].items, [["Y", 1, url], ["Z", 2]]);
});

test("maps a Places API response to our google shape, newest review first", async () => {
  const { toGoogle } = await import("./api/yorumlar.js");
  const g = toGoogle({
    rating: 4.4, userRatingCount: 120,
    reviews: [
      { rating: 3, text: { text: "eski" }, relativePublishTimeDescription: "2 ay önce", publishTime: "2026-07-01T00:00:00Z", authorAttribution: { displayName: "A" } },
      { rating: 5, text: { text: "yeni" }, relativePublishTimeDescription: "3 gün önce", publishTime: "2026-09-21T00:00:00Z", authorAttribution: { displayName: "B" } },
      { rating: 4, relativePublishTimeDescription: "1 gün önce", publishTime: "2026-09-23T00:00:00Z" }, // star-only, no text
    ],
  }, "https://fallback");
  assert.deepEqual(g, { rating: 4.4, count: 120, url: "https://fallback", reviews: [[5, "yeni", "3 gün önce", "B"], [3, "eski", "2 ay önce", "A"]] });
});

test("harita: parseCoordinates extracts coordinates and ignores 13.3km Izmir city center fallback", async () => {
  const { parseCoordinates, calcDistance, isGenericCityCenter } = await import("./api/harita.js");

  // Valid Google Maps place URL with @lat,lng (Pavo Coffee Co at Vali Hüseyin Öğütçen Cd.)
  const coords1 = parseCoordinates("https://www.google.com/maps/place/Pavo+Coffee+Co/@38.3917,27.0360,17z");
  assert.deepEqual(coords1, { lat: 38.3917, lng: 27.036 });
  assert.equal(calcDistance(coords1.lat, coords1.lng), "1.1 km");

  // Google Maps URL with !3d and !4d
  const coords2 = parseCoordinates("https://www.google.com/maps/place/Data/!3d38.3894!4d27.0461");
  assert.deepEqual(coords2, { lat: 38.3894, lng: 27.0461 });

  // Generic Izmir center fallback from staticmap meta should be rejected
  assert.equal(isGenericCityCenter(38.4401408, 27.148288), true);
  const coordsFallback = parseCoordinates("https://www.google.com/maps/search/?api=1", `<meta content="https://maps.google.com/maps/api/staticmap?center=38.4401408%2C27.148288&zoom=14">`);
  assert.deepEqual(coordsFallback, { lat: null, lng: null });
});


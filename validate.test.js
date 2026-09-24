import { test } from "node:test";
import assert from "node:assert/strict";
import { validate } from "./api/esnaflar.js";

const ok = {
  name: "Bizim Kokoreç", type: "Kokoreç", map: "https://maps.app.goo.gl/abc123", hours: "12:00-02:00",
  phone: "+905393299140", phoneText: "0539 329 91 40", color: "#fbd9c4", evil: "<script>",
  cats: [{ name: "Kokoreç", cols: ["Yarım", "Tam"], items: [["Kokoreç", 245, -1]] }, { name: "İçecek", cols: ["Fiyat"], items: [["Ayran", 40]] }],
};

test("accepts a valid vendor and drops unknown fields", () => {
  const v = validate(ok);
  assert.match(v.id, /^bizim-kokorec-/);
  assert.equal(v.evil, undefined);
  assert.deepEqual(v.cats[1], { name: "İçecek", items: [["Ayran", 40]] });
});

test("allows unknown hours", () => assert.equal(validate({ ...ok, hours: null }).hours, null));

test("rejects bad input", () => {
  assert.throws(() => validate({ ...ok, name: "" }));
  assert.throws(() => validate({ ...ok, hours: "25:00-02:00" }));
  assert.throws(() => validate({ ...ok, phone: "javascript:alert(1)" }));
  assert.throws(() => validate({ ...ok, cats: [{ name: "X", items: [["Y", 1, "javascript:alert(1)"]] }] }));
  assert.throws(() => validate({ ...ok, map: "javascript:alert(1)" }));
  assert.throws(() => validate({ ...ok, map: "https://evil.com/maps/" }));
  assert.throws(() => validate({ ...ok, cats: [{ name: "X", cols: ["A", "B"], items: [["Y", 1]] }] }));
});

test("editing keeps the existing id and allows an empty menu", () => {
  const v = validate({ ...ok, cats: [] }, "bizim-kokorec");
  assert.equal(v.id, "bizim-kokorec");
  assert.deepEqual(v.cats, []);
});

test("keeps uploaded item images, ignores client emoji/color/cover image", () => {
  const url = "https://abc123.public.blob.vercel-storage.com/resimler/0b9c-4f.webp";
  const v = validate({ ...ok, image: url, emoji: "🍔", color: "#000000", cats: [{ name: "X", items: [["Y", 1, url], ["Z", 2]] }] });
  assert.equal(v.image, undefined);
  assert.equal(v.emoji, undefined);
  assert.equal(v.color, undefined);
  assert.equal(v.featured, undefined);
  assert.equal(validate({ ...ok, featured: true }).featured, true);
  assert.equal(validate({ ...ok, featured: "yes" }).featured, undefined);
  assert.deepEqual(v.cats[0].items, [["Y", 1, url], ["Z", 2]]);
});

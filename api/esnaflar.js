import seed from "../esnaflar.json" with { type: "json" };
import { guard, redis } from "../lib/admin.js";

// All vendors live in one Redis hash: id -> vendor object. esnaflar.json only seeds it once.
const KEY = "esnaflar", SEEDED = "esnaflar:seeded";
// Card color; picked once when a vendor is added and kept on edits.
// 12 hues 30° apart (oklch L .92 C .055), so cards stay distinguishable in the vivid dark theme too.
export const COLORS = ["#ffd7d5", "#ffdbc5", "#f8e1bc", "#e6e8bf", "#d2eecc", "#c1f1df", "#baf0f3", "#c0ecff", "#d0e6ff", "#e3dfff", "#f6d9fc", "#ffd6ea"];

async function all(r) {
  if (await r.set(SEEDED, 1, { nx: true })) await r.hset(KEY, Object.fromEntries(seed.map(m => [m.id, m])));
  return Object.values((await r.hgetall(KEY)) || {}).sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export async function GET(request) {
  const r = redis();
  // ?login: lets the admin page check a password before showing anything
  if (new URL(request.url).searchParams.has("login")) return (await guard(request, r)) || new Response(null, { status: 204 });
  return Response.json(await all(r), { headers: { "Cache-Control": "no-store" } });
}

export const POST = request => write(request, null);
export const PUT = request => write(request, new URL(request.url).searchParams.get("id"));

export async function DELETE(request) {
  const r = redis();
  const denied = await guard(request, r);
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get("id");
  await all(r); // make sure the seed exists before deleting from it
  return (await r.hdel(KEY, id)) ? new Response(null, { status: 204 }) : Response.json({ error: "Esnaf bulunamadı." }, { status: 404 });
}

async function write(request, id) {
  const r = redis();
  const denied = await guard(request, r);
  if (denied) return denied;
  let esnaf, prev;
  if (id) {
    await all(r);
    prev = await r.hget(KEY, id);
    if (!prev) return Response.json({ error: "Esnaf bulunamadı." }, { status: 404 });
  }
  try {
    esnaf = validate(await request.json(), id);
  } catch (e) {
    return Response.json({ error: e.message || "Geçersiz istek." }, { status: 400 });
  }
  if (prev?.google) esnaf.google = prev.google; // Google rating/reviews aren't editable in the panel; keep them
  esnaf.color = prev?.color || COLORS[Math.floor(Math.random() * COLORS.length)];
  await r.hset(KEY, { [esnaf.id]: esnaf });
  return Response.json(esnaf, { status: id ? 200 : 201 });
}

const str = (v, field, max, { optional = false } = {}) => {
  if (optional && (v == null || v === "")) return undefined;
  if (typeof v !== "string" || !v.trim() || v.length > max) throw new Error(`${field} geçersiz (en fazla ${max} karakter).`);
  return v.trim();
};
// Only images uploaded through /api/upload (our Blob store) are accepted.
const IMG = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/resimler\/[\w-]+\.(webp|jpg|png)$/i;
const img = v => {
  if (v == null || v === "") return undefined;
  if (typeof v !== "string" || !IMG.test(v)) throw new Error("Resim linki geçersiz; resmi panelden yükleyin.");
  return v;
};
const price = v => {
  if (typeof v !== "number" || !Number.isFinite(v) || (v !== -1 && (v < 0 || v > 100000))) throw new Error("Fiyatlar 0-100000 arası sayı olmalı (yoksa -1).");
  return v;
};

// Whitelists every field the page renders; anything else in the body is dropped.
export function validate(b, id = null) {
  const name = str(b.name, "İsim", 80);
  const hours = b.hours == null || b.hours === "" ? null : b.hours;
  if (hours !== null && !/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(hours)) throw new Error("Saat SS:DD-SS:DD biçiminde olmalı.");
  const phone = str(b.phone, "Telefon", 20, { optional: true });
  if (phone && !/^\+?\d{7,15}$/.test(phone)) throw new Error("Telefon sadece rakam olmalı (ör. +905321234567).");
  const map = str(b.map, "Harita linki", 300, { optional: true });
  if (map && !/^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps)\//.test(map)) throw new Error("Harita linki Google Haritalar linki olmalı.");
  if (!Array.isArray(b.cats) || b.cats.length > 20) throw new Error("En fazla 20 menü kategorisi olabilir.");
  const cats = b.cats.map(c => {
    const cols = c.cols == null ? ["Fiyat"] : c.cols;
    if (!Array.isArray(cols) || !cols.length || cols.length > 4) throw new Error("Her kategoride 1-4 fiyat sütunu olmalı.");
    if (!Array.isArray(c.items) || !c.items.length || c.items.length > 80) throw new Error("Her kategoride 1-80 ürün olmalı.");
    return {
      name: str(c.name, "Kategori adı", 60),
      ...(cols.length === 1 && cols[0] === "Fiyat" ? {} : { cols: cols.map(h => str(h, "Sütun adı", 20)) }),
      items: c.items.map(it => {
        // item = [name, ...prices] with an optional image URL as the last element
        if (!Array.isArray(it) || it.length < cols.length + 1 || it.length > cols.length + 2) throw new Error("Her ürünün fiyat sayısı sütun sayısıyla aynı olmalı.");
        const out = [str(it[0], "Ürün adı", 80), ...it.slice(1, cols.length + 1).map(price)];
        const photo = img(it[cols.length + 1]);
        return photo ? [...out, photo] : out;
      }),
    };
  });
  const slug = name.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return {
    id: id || `${slug || "esnaf"}-${Date.now().toString(36)}`,
    name,
    type: str(b.type, "Tür", 40),
    ...(img(b.image) && { image: img(b.image) }),
    ...(b.featured === true && { featured: true }),
    hours,
    ...(phone && { phone, phoneText: str(b.phoneText, "Telefon yazımı", 25, { optional: true }) || phone }),
    ...(map && { map }),
    ...(b.note && { note: str(b.note, "Not", 300) }),
    cats,
  };
}

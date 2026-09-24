import { put } from "@vercel/blob";
import { guard, redis } from "../lib/admin.js";

const TYPES = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };
const MAX = 3 * 1024 * 1024; // the admin page shrinks images before upload; this is just a ceiling

// ponytail: images of deleted vendors/items stay in Blob; add cleanup if storage cost ever matters
export async function POST(request) {
  const denied = await guard(request, redis());
  if (denied) return denied;
  const ext = TYPES[request.headers.get("content-type")];
  if (!ext) return Response.json({ error: "Sadece JPG, PNG veya WebP yüklenebilir." }, { status: 415 });
  const body = await request.arrayBuffer();
  if (!body.byteLength || body.byteLength > MAX) return Response.json({ error: "Resim en fazla 3 MB olabilir." }, { status: 413 });
  const blob = await put(`resimler/${crypto.randomUUID()}.${ext}`, body, { access: "public", contentType: request.headers.get("content-type") });
  return Response.json({ url: blob.url }, { status: 201 });
}

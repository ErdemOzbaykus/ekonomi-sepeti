import { timingSafeEqual } from "node:crypto";
import { Redis } from "@upstash/redis";

export const redis = () => new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });

function authorized(request) {
  const header = request.headers.get("authorization"), want = process.env.ADMIN_PASSWORD;
  if (!want || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7)), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Returns an error Response, or null when the password is right. 10 wrong tries per IP -> 15 min lockout.
export async function guard(request, r) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `admin-fail:${ip}`;
  if ((await r.get(key)) >= 10) return Response.json({ error: "Çok fazla hatalı deneme. 15 dakika sonra tekrar deneyin." }, { status: 429 });
  if (authorized(request)) return null;
  await r.incr(key);
  await r.expire(key, 900);
  return Response.json({ error: "Şifre hatalı." }, { status: 401 });
}

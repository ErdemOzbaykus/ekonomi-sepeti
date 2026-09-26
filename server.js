import express from "express";
import compression from "compression";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esnaflarApi from "./api/esnaflar.js";
import * as uploadApi from "./api/upload.js";
import * as yorumlarApi from "./api/yorumlar.js";
import * as haritaApi from "./api/harita.js";
import { uploadDir } from "./lib/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local or .env if present
try {
  process.loadEnvFile(".env.local");
} catch {
  try {
    process.loadEnvFile(".env");
  } catch {}
}

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV === "development";
const distDir = path.join(__dirname, "dist");
const useDist = !isDev && fs.existsSync(path.join(distDir, "index.html"));
const clientDir = useDist ? distDir : __dirname;

if (useDist) {
  app.disable("x-powered-by");
}

// Enable gzip/deflate compression for all text/html/json responses
app.use(compression());

// Trust proxy headers from reverse proxies (Coolify, Traefik, Caddy, etc.)
app.set("trust proxy", true);

// Buffer raw request bodies so we can forward them to standard Request objects
app.use(express.raw({ type: "*/*", limit: "10mb" }));

// Adapter: Converts Express (req, res) to Web Standard Request/Response
function createWebHandler(handlers) {
  return async (req, res, next) => {
    let handler = handlers[req.method];
    if (!handler && req.method === "HEAD" && handlers.GET) {
      handler = handlers.GET;
    }
    if (!handler) {
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    try {
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
      const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost";
      const url = new URL(req.originalUrl, `${protocol}://${host}`);

      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            for (const v of value) headers.append(key, v);
          } else {
            headers.set(key, value);
          }
        }
      }

      if (!headers.has("x-forwarded-for") && req.ip) {
        headers.set("x-forwarded-for", req.ip);
      }

      const init = {
        method: req.method,
        headers,
      };

      if (req.method !== "GET" && req.method !== "HEAD" && req.body && Buffer.isBuffer(req.body) && req.body.length > 0) {
        init.body = req.body;
        init.duplex = "half";
      }

      const webReq = new Request(url, init);
      const webRes = await handler(webReq);

      if (!webRes) {
        return res.status(404).end();
      }

      res.status(webRes.status);
      webRes.headers.forEach((val, key) => {
        res.setHeader(key, val);
      });

      if (!webRes.body) {
        return res.end();
      }

      const buffer = Buffer.from(await webRes.arrayBuffer());
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  };
}

// API Routes
app.all("/api/esnaflar", createWebHandler({
  GET: esnaflarApi.GET,
  POST: esnaflarApi.POST,
  PUT: esnaflarApi.PUT,
  DELETE: esnaflarApi.DELETE,
}));

app.all("/api/upload", createWebHandler({
  POST: uploadApi.POST,
}));

app.all("/api/yorumlar", createWebHandler({
  GET: yorumlarApi.GET,
}));

app.all("/api/harita", createWebHandler({
  GET: haritaApi.GET,
}));

// Static uploads
app.use("/uploads", express.static(uploadDir));

// Favicon
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Page Routes & Clean URLs
app.get("/", (req, res) => res.sendFile(path.join(clientDir, "index.html")));
app.get("/index.html", (req, res) => res.sendFile(path.join(clientDir, "index.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(clientDir, "admin.html")));
app.get("/admin.html", (req, res) => res.sendFile(path.join(clientDir, "admin.html")));
app.get("/esnaflar.json", (req, res) => res.sendFile(path.join(clientDir, "esnaflar.json")));

// Error Handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${PORT} [${useDist ? "PRODUCTION: minified dist/" : "DEVELOPMENT: root"}]`);
});

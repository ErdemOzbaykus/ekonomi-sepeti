import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "data");
export const uploadDir = process.env.UPLOAD_DIR || path.join(dataDir, "uploads");

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const dbPath = process.env.DB_PATH || path.join(dataDir, "ekonomi.sqlite");
const db = new DatabaseSync(dbPath);

process.on("exit", () => {
  try { db.close(); } catch {}
});

// Enable WAL mode for fast concurrent reads and writes
db.exec("PRAGMA journal_mode = WAL;");
db.exec(`
  CREATE TABLE IF NOT EXISTS kv (
    key TEXT PRIMARY KEY,
    val TEXT,
    expires_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS hashes (
    hash TEXT,
    key TEXT,
    val TEXT,
    PRIMARY KEY (hash, key)
  );
`);

const stmtGetKv = db.prepare("SELECT val, expires_at FROM kv WHERE key = ?");
const stmtSetKv = db.prepare("INSERT INTO kv (key, val, expires_at) VALUES (?, ?, NULL) ON CONFLICT(key) DO UPDATE SET val = excluded.val, expires_at = NULL");
const stmtSetKvNx = db.prepare("INSERT OR IGNORE INTO kv (key, val, expires_at) VALUES (?, ?, NULL)");
const stmtDeleteKv = db.prepare("DELETE FROM kv WHERE key = ?");
const stmtUpdateExpire = db.prepare("UPDATE kv SET expires_at = ? WHERE key = ?");

const stmtHget = db.prepare("SELECT val FROM hashes WHERE hash = ? AND key = ?");
const stmtHgetAll = db.prepare("SELECT key, val FROM hashes WHERE hash = ?");
const stmtHset = db.prepare("INSERT INTO hashes (hash, key, val) VALUES (?, ?, ?) ON CONFLICT(hash, key) DO UPDATE SET val = excluded.val");
const stmtHdel = db.prepare("DELETE FROM hashes WHERE hash = ? AND key = ?");

export class SqliteRedisAdapter {
  async set(key, val, opts) {
    const serialized = typeof val === "string" ? val : JSON.stringify(val);
    if (opts?.nx) {
      const info = stmtSetKvNx.run(key, serialized);
      return info.changes > 0 ? "OK" : null;
    }
    stmtSetKv.run(key, serialized);
    return "OK";
  }

  async get(key) {
    const row = stmtGetKv.get(key);
    if (!row) return null;
    if (row.expires_at && Date.now() > row.expires_at) {
      stmtDeleteKv.run(key);
      return null;
    }
    try {
      return JSON.parse(row.val);
    } catch {
      return row.val;
    }
  }

  async incr(key) {
    const current = Number(await this.get(key)) || 0;
    const next = current + 1;
    stmtSetKv.run(key, String(next));
    return next;
  }

  async expire(key, seconds) {
    const expiresAt = Date.now() + seconds * 1000;
    stmtUpdateExpire.run(expiresAt, key);
    return 1;
  }

  async hset(hash, fieldOrObj, val) {
    if (typeof fieldOrObj === "object" && fieldOrObj !== null) {
      for (const [k, v] of Object.entries(fieldOrObj)) {
        stmtHset.run(hash, k, typeof v === "string" ? v : JSON.stringify(v));
      }
    } else {
      stmtHset.run(hash, fieldOrObj, typeof val === "string" ? val : JSON.stringify(val));
    }
    return 1;
  }

  async hget(hash, field) {
    const row = stmtHget.get(hash, field);
    if (!row) return null;
    try {
      return JSON.parse(row.val);
    } catch {
      return row.val;
    }
  }

  async hgetall(hash) {
    const rows = stmtHgetAll.all(hash);
    if (!rows.length) return null;
    const out = {};
    for (const row of rows) {
      try {
        out[row.key] = JSON.parse(row.val);
      } catch {
        out[row.key] = row.val;
      }
    }
    return out;
  }

  async hdel(hash, field) {
    const info = stmtHdel.run(hash, field);
    return info.changes;
  }
}

export const sqliteAdapter = new SqliteRedisAdapter();

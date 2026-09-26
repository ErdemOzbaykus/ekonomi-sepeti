import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { minify } from "html-minifier-terser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const distDir = path.join(rootDir, "dist");

const minOptions = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  useShortDoctype: true,
  minifyCSS: true,
  minifyJS: true,
};

function formatSize(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

async function build() {
  console.log("🚀 Building optimized production bundle...\n");
  const startTime = Date.now();

  // Clean and recreate dist directory
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });

  // 1. Minify index.html
  const indexSrc = await fs.readFile(path.join(rootDir, "index.html"), "utf8");
  const indexMin = await minify(indexSrc, minOptions);
  await fs.writeFile(path.join(distDir, "index.html"), indexMin, "utf8");
  console.log(`✓ index.html:    ${formatSize(indexSrc.length)} → ${formatSize(indexMin.length)} (${Math.round((1 - indexMin.length / indexSrc.length) * 100)}% smaller)`);

  // 2. Minify admin.html
  const adminSrc = await fs.readFile(path.join(rootDir, "admin.html"), "utf8");
  const adminMin = await minify(adminSrc, minOptions);
  await fs.writeFile(path.join(distDir, "admin.html"), adminMin, "utf8");
  console.log(`✓ admin.html:    ${formatSize(adminSrc.length)} → ${formatSize(adminMin.length)} (${Math.round((1 - adminMin.length / adminSrc.length) * 100)}% smaller)`);

  // 3. Minify esnaflar.json
  const jsonSrc = await fs.readFile(path.join(rootDir, "esnaflar.json"), "utf8");
  const jsonMin = JSON.stringify(JSON.parse(jsonSrc));
  await fs.writeFile(path.join(distDir, "esnaflar.json"), jsonMin, "utf8");
  console.log(`✓ esnaflar.json: ${formatSize(jsonSrc.length)} → ${formatSize(jsonMin.length)} (${Math.round((1 - jsonMin.length / jsonSrc.length) * 100)}% smaller)`);

  console.log(`\n✨ Build completed in ${Date.now() - startTime}ms → Output directory: dist/\n`);
}

build().catch(err => {
  console.error("Build failed:", err);
  process.exit(1);
});

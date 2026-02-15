#!/usr/bin/env node

/**
 * Batch AI background generation for product images using Mokker AI.
 *
 * Usage:
 *   node scripts/mokker-backgrounds.mjs [options]
 *
 * Options:
 *   --dry-run              List images without processing
 *   --start-from <file>    Resume from a specific filename (skip earlier ones)
 *   --delay <ms>           Delay between requests in ms (default: 2000)
 *
 * Environment variables (from .env):
 *   MOKKER_API_KEY          Mokker API bearer token
 */

import dns from "node:dns";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Bypass local DNS (returns NXDOMAIN for api.mokker.ai) — use Google DNS
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const INPUT_DIR = resolve(PROJECT_ROOT, "product-images-nobg");
const OUTPUT_DIR = resolve(PROJECT_ROOT, "product-images-bg");
const ENV_PATH = resolve(PROJECT_ROOT, ".env");

const API_URL = "https://api.mokker.ai/v2/replace-background";

// --- Parse .env ---
function loadEnv() {
  if (!existsSync(ENV_PATH)) return {};
  const env = {};
  for (const line of readFileSync(ENV_PATH, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = val;
  }
  return env;
}

// --- Parse CLI args ---
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { dryRun: false, startFrom: null, delay: 2000 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") opts.dryRun = true;
    else if (args[i] === "--start-from" && args[i + 1]) opts.startFrom = args[++i];
    else if (args[i] === "--delay" && args[i + 1]) opts.delay = parseInt(args[++i], 10);
  }
  return opts;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Process a single image ---
async function processImage(apiKey, filePath, fileName, retries = 3) {
  const fileBuffer = readFileSync(filePath);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const formData = new FormData();
      formData.append(
        "image",
        new Blob([fileBuffer], { type: "image/png" }),
        fileName,
      );

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "image/png, application/json",
        },
        body: formData,
        signal: AbortSignal.timeout(120_000),
      });

      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get("retry-after") || "30",
          10,
        );
        console.log(`  Rate limited. Waiting ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody.slice(0, 300)}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const json = await response.json();
        if (json.url) {
          const imgRes = await fetch(json.url, {
            signal: AbortSignal.timeout(60_000),
          });
          return Buffer.from(await imgRes.arrayBuffer());
        }
        throw new Error(`Unexpected JSON response: ${JSON.stringify(json).slice(0, 300)}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (err) {
      if (err.name === "TimeoutError") {
        console.log(`  Timeout on attempt ${attempt}/${retries}`);
      }
      if (attempt < retries) {
        const backoff = Math.pow(2, attempt) * 1000;
        console.log(
          `  Attempt ${attempt}/${retries} failed: ${err.message}. Retrying in ${backoff / 1000}s...`,
        );
        await sleep(backoff);
      } else {
        throw err;
      }
    }
  }
}

// --- Main ---
async function main() {
  const opts = parseArgs();
  const env = loadEnv();
  const apiKey = env.MOKKER_API_KEY;

  if (!apiKey) {
    console.error("MOKKER_API_KEY not found in .env");
    process.exit(1);
  }

  if (!existsSync(INPUT_DIR)) {
    console.error(`Input directory not found: ${INPUT_DIR}`);
    process.exit(1);
  }

  // Discover images
  const allImages = readdirSync(INPUT_DIR)
    .filter((f) => f.endsWith(".png"))
    .sort();

  if (allImages.length === 0) {
    console.error("No PNG files found in product-images-nobg/");
    process.exit(1);
  }

  // Create output dir
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  // Already processed
  const existing = new Set(
    readdirSync(OUTPUT_DIR)
      .filter((f) => f.endsWith(".png"))
      .map((f) => f.replace(/-bg\.png$/, ".png")),
  );

  // Apply --start-from filter
  let images = allImages;
  if (opts.startFrom) {
    const idx = images.indexOf(opts.startFrom);
    if (idx === -1) {
      console.error(`--start-from file not found: ${opts.startFrom}`);
      process.exit(1);
    }
    images = images.slice(idx);
  }

  console.log("\n========================================");
  console.log("  Mokker AI — Background Generation");
  console.log("========================================\n");
  console.log(`Input:    ${INPUT_DIR}`);
  console.log(`Output:   ${OUTPUT_DIR}`);
  console.log(`Images:   ${images.length} of ${allImages.length} total`);
  console.log(`Existing: ${existing.size} already processed`);
  console.log(`Delay:    ${opts.delay}ms between requests`);
  if (opts.dryRun) console.log(`Mode:     DRY RUN\n`);
  else console.log("");

  if (opts.dryRun) {
    for (let i = 0; i < images.length; i++) {
      const skip = existing.has(images[i]) ? " (skip — already exists)" : "";
      console.log(`  [${i + 1}/${images.length}] ${images[i]}${skip}`);
    }
    console.log(`\n${images.length} images would be processed.\n`);
    return;
  }

  const results = { success: [], failed: [] };

  for (let i = 0; i < images.length; i++) {
    const fileName = images[i];
    const inputPath = resolve(INPUT_DIR, fileName);
    const outputName = fileName.replace(/\.png$/, "-bg.png");
    const outputPath = resolve(OUTPUT_DIR, outputName);

    console.log(`[${i + 1}/${images.length}] ${fileName}`);

    if (existing.has(fileName)) {
      console.log("  Skipped (already exists)");
      results.success.push(fileName);
      continue;
    }

    try {
      const imageBuffer = await processImage(apiKey, inputPath, fileName);
      writeFileSync(outputPath, imageBuffer);
      const sizeKB = (imageBuffer.length / 1024).toFixed(0);
      console.log(`  Saved: ${outputName} (${sizeKB} KB)`);
      results.success.push(fileName);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      results.failed.push({ fileName, error: err.message });
    }

    if (i < images.length - 1) {
      await sleep(opts.delay);
    }
  }

  // Summary
  console.log("\n========================================");
  console.log(`  Results: ${results.success.length}/${images.length} succeeded`);
  if (results.failed.length > 0) {
    console.log(`  Failed (${results.failed.length}):`);
    for (const { fileName, error } of results.failed) {
      console.log(`    - ${fileName}: ${error}`);
    }
  }
  console.log("========================================\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

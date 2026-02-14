#!/usr/bin/env node

/**
 * One-time OAuth script to obtain a Shopify Admin API access token.
 *
 * Prerequisites:
 *   1. Create an app in the Shopify Dev Dashboard
 *   2. Set App URL to: https://localhost:3000
 *   3. Set Allowed redirection URL to: https://localhost:3000/callback
 *   4. Configure Admin API access scopes
 *
 * Usage:
 *   node scripts/get-admin-token.mjs <client_id> <client_secret>
 */

import { createServer } from "node:https";
import { execSync } from "node:child_process";
import { readFileSync, appendFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, generateKeyPairSync } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "..", ".env");
const SHOP = "moderncre8ve.myshopify.com";
const SCOPES =
  "write_products,read_products,write_redirects,read_redirects,write_files,read_files";
const REDIRECT_URI = "https://localhost:3000/callback";

const clientId = process.argv[2];
const clientSecret = process.argv[3];

if (!clientId || !clientSecret) {
  console.error(
    "\nUsage: node scripts/get-admin-token.mjs <client_id> <client_secret>\n"
  );
  console.error("Get these from Dev Dashboard → your app → Client credentials\n");
  process.exit(1);
}

// Generate self-signed cert for HTTPS localhost
function generateSelfSignedCert() {
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  // Use openssl to generate a self-signed cert (available on macOS)
  const keyPath = resolve(__dirname, ".tmp-key.pem");
  const certPath = resolve(__dirname, ".tmp-cert.pem");
  writeFileSync(keyPath, privateKey);

  execSync(
    `openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 1 -subj "/CN=localhost" 2>/dev/null`
  );

  const key = readFileSync(keyPath, "utf-8");
  const cert = readFileSync(certPath, "utf-8");

  // Clean up temp files
  try {
    execSync(`rm "${keyPath}" "${certPath}"`);
  } catch {}

  return { key, cert };
}

const nonce = randomBytes(16).toString("hex");
const { key, cert } = generateSelfSignedCert();

const authUrl =
  `https://${SHOP}/admin/oauth/authorize?` +
  `client_id=${clientId}` +
  `&scope=${SCOPES}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&state=${nonce}`;

const server = createServer({ key, cert }, async (req, res) => {
  if (!req.url?.startsWith("/callback")) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const url = new URL(req.url, "https://localhost:3000");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const shop = url.searchParams.get("shop");

  if (state !== nonce) {
    res.writeHead(400);
    res.end("State mismatch — possible CSRF. Try again.");
    server.close();
    return;
  }

  if (!code) {
    res.writeHead(400);
    res.end("No authorization code received.");
    server.close();
    return;
  }

  console.log(`\nReceived auth code from ${shop}. Exchanging for token...`);

  try {
    const tokenRes = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      }
    );

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      throw new Error(`Token exchange failed (${tokenRes.status}): ${text}`);
    }

    const { access_token, scope } = await tokenRes.json();

    console.log(`\nToken obtained! Granted scopes: ${scope}`);

    // Check if already in .env
    if (existsSync(ENV_PATH)) {
      const envContent = readFileSync(ENV_PATH, "utf-8");
      if (envContent.includes("SHOPIFY_ADMIN_API_TOKEN")) {
        console.warn(
          "\nWARNING: SHOPIFY_ADMIN_API_TOKEN already exists in .env."
        );
        console.warn("The new token will be appended — remove the old line manually.\n");
      }
    }

    appendFileSync(ENV_PATH, `\n# Shopify Admin API (OAuth — ${new Date().toISOString().slice(0, 10)})\nSHOPIFY_ADMIN_API_TOKEN=${access_token}\n`);
    console.log(`Token saved to .env as SHOPIFY_ADMIN_API_TOKEN`);

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <html><body style="font-family:system-ui;text-align:center;padding:60px">
        <h1>Admin API token obtained!</h1>
        <p>Scopes: <code>${scope}</code></p>
        <p>Token saved to <code>.env</code>. You can close this tab.</p>
      </body></html>
    `);
  } catch (err) {
    console.error("\nError exchanging token:", err.message);
    res.writeHead(500);
    res.end(`Token exchange failed: ${err.message}`);
  } finally {
    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 1000);
  }
});

server.listen(3000, () => {
  console.log("\n========================================");
  console.log("  Shopify Admin API — OAuth Flow (HTTPS)");
  console.log("========================================\n");
  console.log(`Shop:   ${SHOP}`);
  console.log(`Scopes: ${SCOPES}`);
  console.log(`\nOpening browser...\n`);
  console.log(`If it doesn't open, visit:\n${authUrl}\n`);
  console.log("NOTE: Your browser will show a security warning for the self-signed cert.");
  console.log("Click 'Advanced' → 'Proceed to localhost' to continue.\n");

  try {
    execSync(`open "${authUrl}"`);
  } catch {}

  console.log("Waiting for OAuth callback on https://localhost:3000/callback ...\n");
});

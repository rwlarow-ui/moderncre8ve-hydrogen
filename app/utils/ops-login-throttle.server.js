/**
 * Brute-force protection for the ops login.
 *
 * State lives in the Oxygen Cache API (`context.cache`). That cache is
 * per-datacenter and best-effort, so this slows an attacker down rather than
 * providing a hard global lockout. It is deliberately per client IP: a global
 * lock would let anyone lock the team out.
 */

export const FREE_ATTEMPTS = 4;
export const BASE_LOCK_SECONDS = 15;
export const MAX_LOCK_SECONDS = 15 * 60;
const STATE_TTL_SECONDS = 60 * 60;
const CACHE_ORIGIN = "https://ops-login-throttle.internal";

export function getClientKey(request) {
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown";
  return ip.toLowerCase();
}

function cacheRequest(clientKey) {
  return new Request(`${CACHE_ORIGIN}/${encodeURIComponent(clientKey)}`);
}

export function lockSecondsForFailures(failures) {
  if (failures < FREE_ATTEMPTS + 1) {
    return 0;
  }
  const exponent = failures - FREE_ATTEMPTS - 1;
  return Math.min(MAX_LOCK_SECONDS, BASE_LOCK_SECONDS * 2 ** exponent);
}

async function readState(cache, clientKey) {
  try {
    const hit = await cache.match(cacheRequest(clientKey));
    if (!hit) {
      return { failures: 0, lockedUntil: 0 };
    }
    const state = await hit.json();
    return {
      failures: Number(state.failures) || 0,
      lockedUntil: Number(state.lockedUntil) || 0,
    };
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

async function writeState(cache, clientKey, state) {
  try {
    await cache.put(
      cacheRequest(clientKey),
      new Response(JSON.stringify(state), {
        headers: { "Cache-Control": `public, max-age=${STATE_TTL_SECONDS}` },
      }),
    );
  } catch {}
}

export async function checkThrottle(cache, clientKey, now = Date.now()) {
  const { lockedUntil } = await readState(cache, clientKey);
  if (lockedUntil > now) {
    return {
      locked: true,
      retryAfterSeconds: Math.ceil((lockedUntil - now) / 1000),
    };
  }
  return { locked: false, retryAfterSeconds: 0 };
}

export async function recordFailure(cache, clientKey, now = Date.now()) {
  const { failures } = await readState(cache, clientKey);
  const next = failures + 1;
  const lockSeconds = lockSecondsForFailures(next);
  await writeState(cache, clientKey, {
    failures: next,
    lockedUntil: lockSeconds ? now + lockSeconds * 1000 : 0,
  });
  return { failures: next, lockSeconds };
}

export async function clearFailures(cache, clientKey) {
  try {
    await cache.delete(cacheRequest(clientKey));
  } catch {}
}

/**
 * Constant-time string comparison. Both sides are hashed first so the
 * comparison cost does not depend on length or on where they differ.
 */
export async function safeEqual(a, b) {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(String(a))),
    crypto.subtle.digest("SHA-256", encoder.encode(String(b))),
  ]);
  const viewA = new Uint8Array(hashA);
  const viewB = new Uint8Array(hashB);
  let diff = 0;
  for (let i = 0; i < viewA.length; i += 1) {
    diff |= viewA[i] ^ viewB[i];
  }
  return diff === 0;
}

import { CompactEncrypt, compactDecrypt } from "jose";
import { opsStore } from "./ops-store.server.js";

function encryptionKey(env) {
  if (!/^[a-f0-9]{64}$/i.test(env.OPS_CONNECTION_ENCRYPTION_KEY || ""))
    throw new Error("Private connection encryption is not configured.");
  return Uint8Array.from(env.OPS_CONNECTION_ENCRYPTION_KEY.match(/../g), (s) =>
    Number.parseInt(s, 16),
  );
}
export async function savePersonalConnection(env, user, tokens) {
  if (user.role !== "owner") throw new Response("Forbidden", { status: 403 });
  const scopes = new Set(String(tokens.scope || "").split(" "));
  if (
    !tokens.refresh_token ||
    !scopes.has("https://www.googleapis.com/auth/gmail.readonly") ||
    !scopes.has("https://www.googleapis.com/auth/calendar.events.readonly")
  ) {
    throw new Error(
      "Please grant the requested read-only mail and calendar access.",
    );
  }
  const encrypted = await new CompactEncrypt(
    new TextEncoder().encode(tokens.refresh_token),
  )
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .encrypt(encryptionKey(env));
  await opsStore(env, "rpc/ops_save_connection", {
    method: "POST",
    body: { p_email: user.email, p_token: encrypted },
  });
}
export async function loadPersonalDay(env, user) {
  if (user.role !== "owner") return null;
  const rows = await opsStore(
    env,
    `ops_connections?user_email=eq.${encodeURIComponent(user.email)}&select=refresh_token&limit=1`,
  );
  if (!rows.length) return { connected: false };
  try {
    const { plaintext } = await compactDecrypt(
      rows[0].refresh_token,
      encryptionKey(env),
    );
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: new TextDecoder().decode(plaintext),
        client_id: env.OPS_GOOGLE_CLIENT_ID,
        client_secret: env.OPS_GOOGLE_CLIENT_SECRET,
      }),
    });
    if (!tokenResponse.ok) throw new Error("Please reconnect Google.");
    const { access_token: accessToken } = await tokenResponse.json();
    const get = async (url) => {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!response.ok)
        throw new Error("Google data is temporarily unavailable.");
      return response.json();
    };
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 86400000);
    const [mail, calendar] = await Promise.allSettled([
      (async () => {
        const list = await get(
          "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=is%3Aunread%20category%3Aprimary",
        );
        return Promise.all(
          (list.messages || []).map(async ({ id }) => {
            const item = await get(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
            );
            return {
              id,
              subject:
                item.payload?.headers?.find(
                  (h) => h.name.toLowerCase() === "subject",
                )?.value || "(No subject)",
              from:
                item.payload?.headers?.find(
                  (h) => h.name.toLowerCase() === "from",
                )?.value || "",
              url: `https://mail.google.com/mail/u/0/#all/${id}`,
            };
          }),
        );
      })(),
      get(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${new URLSearchParams({ timeMin: now.toISOString(), timeMax: end.toISOString(), singleEvents: "true", orderBy: "startTime", maxResults: "50" })}`,
      ).then((data) =>
        (data.items || []).map((item) => ({
          id: item.id,
          title: item.summary || "Busy",
          start: item.start?.dateTime || item.start?.date,
          url: item.htmlLink,
        })),
      ),
    ]);
    return {
      connected: true,
      fetchedAt: now.toISOString(),
      mail: mail.status === "fulfilled" ? mail.value : null,
      calendar: calendar.status === "fulfilled" ? calendar.value : null,
    };
  } catch {
    return {
      connected: true,
      error: "Your Google connection needs attention. Reconnect to try again.",
    };
  }
}

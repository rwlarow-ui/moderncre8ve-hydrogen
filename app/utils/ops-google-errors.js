// Why a Google connect or sign-in did not complete. The callback redirects
// with one of these codes so the page can say what actually went wrong
// instead of a generic "could not be completed". Codes only ever go in the
// URL; the page looks the message up here, so nothing in the query string is
// rendered as text.

export const GOOGLE_CONNECT_ERRORS = {
  cancelled:
    "Google sign-in was cancelled before access was approved. Start again from Connect Google.",
  expired:
    "The connect request expired or was finished in a different tab. Start again from Connect Google and approve within 10 minutes.",
  token_exchange:
    "Google refused the sign-in code. Check OPS_GOOGLE_CLIENT_ID and OPS_GOOGLE_CLIENT_SECRET on Oxygen and that /ops/auth/callback is an authorised redirect URI in the Google OAuth client.",
  identity:
    "Google's identity response could not be verified. Try again; if it repeats, check OPS_GOOGLE_CLIENT_ID on Oxygen.",
  not_allowed: "That Google account is not one of the approved Ops accounts.",
  signed_out:
    "Your Ops session ended before Google returned. Sign in again, then connect.",
  wrong_account:
    "You approved with a different Google account from the one signed in to Ops. Connect again and choose the same account.",
  missing_scopes:
    "Google did not grant both read-only permissions. Connect again and tick both the Gmail and the Calendar boxes on the consent screen.",
  no_refresh_token:
    "Google did not return offline access. Remove the Ops app under Google Account → Security → Third-party connections, then connect again.",
  no_key:
    "OPS_CONNECTION_ENCRYPTION_KEY on this deployment is not a 64-character hex value. Set it on Oxygen, redeploy, then connect again.",
  save_failed:
    "Google approved access, but the hub could not save it to its database. Check the Ops store (ops_sessions, ops_save_connection, ops_care_save_sender).",
  care_account: "Only Haven's mailbox can be the care@ sender.",
  care_missing_scopes:
    "Google did not grant both the send and read mail permissions. Connect again and tick both boxes.",
  unknown: "Google sign-in could not be completed. Try again.",
};

/** The message for a code from the URL, or null for anything unrecognised. */
export function googleConnectErrorMessage(code) {
  return Object.hasOwn(GOOGLE_CONNECT_ERRORS, code || "")
    ? GOOGLE_CONNECT_ERRORS[code]
    : null;
}

/** An Error that carries one of the codes above. */
export function googleConnectError(code, message) {
  return Object.assign(new Error(message), { googleConnectCode: code });
}

/** Append ?googleError=<code> to an in-app path. */
export function withGoogleError(path, code) {
  const url = new URL(path, "https://ops.invalid");
  url.searchParams.set("googleError", code);
  return url.pathname + url.search;
}

/**
 * Where a failed Google *sign-in* goes: the login page in individual mode,
 * so a legacy shared-password session (before the individual-login cutover)
 * does not bounce the user past the message to a page that never shows it.
 */
export function googleSignInFailurePath(code, returnTo) {
  const params = new URLSearchParams({
    individual: "1",
    error: "google",
    reason: code,
  });
  if (returnTo) params.set("redirectTo", returnTo);
  return `/ops/login?${params}`;
}

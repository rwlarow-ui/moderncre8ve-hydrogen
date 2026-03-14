/**
 * Verify a Cloudflare Turnstile token server-side.
 * Returns true if valid, false otherwise.
 * If no secret key is configured, returns true (graceful degradation).
 */
export async function verifyTurnstile(
  token: string | null,
  secretKey: string | undefined,
  remoteIp?: string,
): Promise<boolean> {
  if (!secretKey) {
    return true;
  }
  if (!token) {
    return false;
  }

  try {
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteIp) {
      formData.append("remoteip", remoteIp);
    }

    const result = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      },
    );
    const outcome = (await result.json()) as { success: boolean };
    return outcome.success;
  } catch {
    return false;
  }
}

export function safeOpsRedirect(value) {
  if (
    typeof value !== "string" ||
    value.length > 2500 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    [...value].some((char) => char.charCodeAt(0) <= 32 || char === "\\")
  )
    return "/ops/daily";
  const parsed = new URL(value, "https://ops.invalid");
  return parsed.origin === "https://ops.invalid" &&
    /^\/ops(?:\/|$)/.test(parsed.pathname) &&
    !parsed.pathname.startsWith("/ops/login")
    ? parsed.pathname + parsed.search
    : "/ops/daily";
}

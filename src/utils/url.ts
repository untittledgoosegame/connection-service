export function safeReturnUrl(returnTo: string): URL | null {
  try {
    const url = new URL(returnTo);
    return url.protocol === "https:" || url.hostname === "localhost" ? url : null;
  } catch {
    return null;
  }
}

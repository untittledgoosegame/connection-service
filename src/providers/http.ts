export const TIMEOUT_MS = 15_000;

export function bearerHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

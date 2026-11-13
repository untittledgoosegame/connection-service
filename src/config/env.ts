export function cleanEnvValue(value: string | undefined): string {
  return typeof value === "string"
    ? value
        .replace(/^[-"'\s]+/, "")
        .replace(/["'\s]+$/, "")
        .trim()
    : "";
}

export function apiBaseUrl(): string {
  return (process.env.API_BASE_URL ?? "").replace(/\/+$/, "");
}

export function stateSecret(): string {
  const secret = process.env.SOCIAL_STATE_SECRET || process.env.SESSION_SECRET || "";
  if (!secret) throw new Error("Set SOCIAL_STATE_SECRET or SESSION_SECRET before starting OAuth flow.");
  return secret;
}

export function port(): number {
  return Number(process.env.PORT || 8777);
}

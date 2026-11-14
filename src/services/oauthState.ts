import crypto from "node:crypto";
import { stateSecret } from "../config/env.ts";
import type { OAuthState, OAuthStateData } from "../types/oauth.ts";

const DEFAULT_MAX_AGE_MS = 10 * 60 * 1000;

export function signStatePayload(payload: string): string {
  return crypto.createHmac("sha256", stateSecret()).update(payload).digest("base64url");
}

export function createState(data: OAuthStateData, maxAgeMs = DEFAULT_MAX_AGE_MS): string {
  const state: OAuthState = {
    ...data,
    exp: Date.now() + maxAgeMs,
    nonce: crypto.randomBytes(16).toString("base64url"),
  };
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${signStatePayload(payload)}`;
}

export function parseState(state: string | undefined): OAuthState | null {
  try {
    if (!state) return null;
    const [payload, signature] = state.split(".");
    if (!payload || !signature) return null;
    const supplied = Buffer.from(signature);
    const expected = Buffer.from(signStatePayload(payload));
    if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OAuthState;
    return parsed.exp > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

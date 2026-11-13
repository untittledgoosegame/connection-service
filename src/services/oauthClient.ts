import crypto from "node:crypto";
import axios from "axios";
import { TIMEOUT_MS } from "../providers/http.ts";
import { callbackUri, PROVIDERS, providerCredentials, providerScope } from "../providers/index.ts";
import type {
  OAuthState,
  OAuthTokenResponse,
  Provider,
  ProviderProfile,
  TokenExchanger,
  TokenSet,
} from "../types/oauth.ts";

const exchangeWithForm: TokenExchanger = async ({
  tokenUrl,
  clientId,
  clientSecret,
  code,
  redirectUri,
  codeVerifier,
}) => {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  if (codeVerifier) body.set("code_verifier", codeVerifier);
  const { data } = await axios.post<OAuthTokenResponse>(tokenUrl, body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: TIMEOUT_MS,
  });
  if (!data.access_token) throw new Error(data.error_description || data.error || "OAuth token exchange failed");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresIn: data.expires_in || null,
  };
};

export function usesPkce(provider: Provider): boolean {
  return PROVIDERS[provider].pkce === true;
}

export function createCodeVerifier(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function buildAuthorizeUrl(provider: Provider, state: string, codeVerifier: string | null): string {
  const definition = PROVIDERS[provider];
  const params = new URLSearchParams({
    client_id: providerCredentials(provider).clientId,
    redirect_uri: callbackUri(provider),
    response_type: "code",
    scope: providerScope(provider),
    state,
    ...definition.authorizeParams,
  });
  if (definition.pkce && codeVerifier) {
    params.set("code_challenge", crypto.createHash("sha256").update(codeVerifier).digest("base64url"));
    params.set("code_challenge_method", "S256");
  }
  return `${definition.authorizeUrl}?${params.toString()}`;
}

export function exchangeCode(provider: Provider, code: string, state: OAuthState): Promise<TokenSet> {
  const definition = PROVIDERS[provider];
  const exchange = definition.exchangeCode ?? exchangeWithForm;
  return exchange({
    ...providerCredentials(provider),
    tokenUrl: definition.tokenUrl,
    code,
    redirectUri: state.redirectUri || callbackUri(provider),
    codeVerifier: definition.pkce ? state.codeVerifier : null,
  });
}

export function fetchProfile(provider: Provider, accessToken: string): Promise<ProviderProfile> {
  return PROVIDERS[provider].fetchProfile(accessToken);
}

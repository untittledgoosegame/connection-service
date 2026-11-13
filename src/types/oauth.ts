import type { PROVIDERS } from "../providers/index.ts";

export type Provider = keyof typeof PROVIDERS;

export interface ProviderCredentials {
  clientId: string;
  clientSecret: string;
}

export interface OAuthStateData {
  type: "chatapp_connect";
  provider: Provider;
  redirectUri: string;
  codeVerifier: string | null;
  returnTo: string | null;
}

export interface OAuthState extends OAuthStateData {
  exp: number;
  nonce: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresIn?: number | null;
}

export interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

export interface ProviderProfile {
  username: string;
  name: string;
  subscribers?: number | null;
  followers?: number | null;
  connections?: number | null;
}

export interface TokenRequest {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string | null;
}

export type TokenExchanger = (request: TokenRequest) => Promise<TokenSet>;

export type ProfileFetcher = (accessToken: string) => Promise<ProviderProfile>;

export interface ProviderDefinition {
  aliases: readonly string[];
  credentialEnvPrefix: string;
  authorizeUrl: string;
  tokenUrl: string;
  defaultScope: string;
  authorizeParams?: Record<string, string>;
  pkce?: boolean;
  exchangeCode?: TokenExchanger;
  fetchProfile: ProfileFetcher;
}

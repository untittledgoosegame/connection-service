import axios from "axios";
import type { OAuthTokenResponse, ProviderDefinition } from "../types/oauth.ts";
import { bearerHeaders, TIMEOUT_MS } from "./http.ts";

const USER_AGENT = "ChatAppOAuth";

interface GitHubUser {
  login?: string;
  name?: string | null;
  followers?: number;
}

export const github: ProviderDefinition = {
  aliases: ["github"],
  credentialEnvPrefix: "GITHUB",
  authorizeUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  defaultScope: "read:user user:email",
  async exchangeCode({ tokenUrl, clientId, clientSecret, code, redirectUri }) {
    const { data } = await axios.post<OAuthTokenResponse>(
      tokenUrl,
      { client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri },
      { headers: { Accept: "application/json", "User-Agent": USER_AGENT }, timeout: TIMEOUT_MS },
    );
    if (data.error || !data.access_token) {
      throw new Error(data.error_description || data.error || "GitHub token exchange failed");
    }
    return { accessToken: data.access_token, refreshToken: data.refresh_token || null };
  },
  async fetchProfile(accessToken) {
    const { data } = await axios.get<GitHubUser>("https://api.github.com/user", {
      headers: { ...bearerHeaders(accessToken), Accept: "application/vnd.github+json", "User-Agent": USER_AGENT },
      timeout: TIMEOUT_MS,
    });
    return { username: data.login || "", name: data.name || data.login || "", followers: Number(data.followers || 0) };
  },
};

import axios from "axios";
import type { ProviderDefinition } from "../types/oauth.ts";
import { bearerHeaders, TIMEOUT_MS } from "./http.ts";

interface FacebookTokenResponse {
  access_token?: string;
  error?: { message?: string };
}

interface FacebookUser {
  id?: string;
  name?: string;
}

export const facebook: ProviderDefinition = {
  aliases: ["facebook"],
  credentialEnvPrefix: "FACEBOOK",
  authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
  tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
  defaultScope: "email public_profile",
  async exchangeCode({ tokenUrl, clientId, clientSecret, code, redirectUri }) {
    const { data } = await axios.get<FacebookTokenResponse>(tokenUrl, {
      params: { client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code },
      timeout: TIMEOUT_MS,
    });
    if (!data.access_token) throw new Error(data.error?.message || "Facebook token exchange failed");
    return { accessToken: data.access_token, refreshToken: null };
  },
  async fetchProfile(accessToken) {
    const { data } = await axios.get<FacebookUser>("https://graph.facebook.com/me", {
      params: { fields: "id,name" },
      headers: bearerHeaders(accessToken),
      timeout: TIMEOUT_MS,
    });
    return { username: data.id || "", name: data.name || "", followers: null };
  },
};

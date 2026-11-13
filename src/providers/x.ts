import axios from "axios";
import type { ProviderDefinition } from "../types/oauth.ts";
import { bearerHeaders, TIMEOUT_MS } from "./http.ts";

interface XUserResponse {
  data?: {
    id?: string;
    name?: string;
    username?: string;
    public_metrics?: { followers_count?: number };
  };
}

export const x: ProviderDefinition = {
  aliases: ["x", "twitter"],
  credentialEnvPrefix: "TWITTER",
  authorizeUrl: "https://twitter.com/i/oauth2/authorize",
  tokenUrl: "https://api.twitter.com/2/oauth2/token",
  defaultScope: "tweet.read users.read",
  pkce: true,
  async fetchProfile(accessToken) {
    const { data } = await axios.get<XUserResponse>("https://api.twitter.com/2/users/me", {
      params: { "user.fields": "id,name,username,public_metrics" },
      headers: bearerHeaders(accessToken),
      timeout: TIMEOUT_MS,
    });
    const user = data.data ?? {};
    const followers = user.public_metrics?.followers_count;
    return {
      username: user.username || "",
      name: user.name || user.username || "",
      followers: typeof followers === "number" ? followers : null,
    };
  },
};

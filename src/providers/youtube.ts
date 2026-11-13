import axios from "axios";
import type { ProviderDefinition } from "../types/oauth.ts";
import { bearerHeaders, TIMEOUT_MS } from "./http.ts";

interface YouTubeChannelsResponse {
  items?: Array<{
    id: string;
    snippet?: { title?: string; customUrl?: string };
    statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
  }>;
}

interface GoogleUserInfo {
  email?: string;
  name?: string;
}

export const youtube: ProviderDefinition = {
  aliases: ["youtube"],
  credentialEnvPrefix: "YOUTUBE",
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  defaultScope: "openid email profile https://www.googleapis.com/auth/youtube.readonly",
  authorizeParams: { access_type: "offline", prompt: "consent" },
  async fetchProfile(accessToken) {
    const headers = bearerHeaders(accessToken);
    const [channels, profile] = await Promise.all([
      axios.get<YouTubeChannelsResponse>("https://www.googleapis.com/youtube/v3/channels", {
        params: { part: "snippet,statistics", mine: "true" },
        headers,
        timeout: TIMEOUT_MS,
      }),
      axios
        .get<GoogleUserInfo>("https://www.googleapis.com/oauth2/v2/userinfo", { headers, timeout: TIMEOUT_MS })
        .catch(() => ({ data: {} as GoogleUserInfo })),
    ]);
    const channel = channels.data.items?.[0];
    if (!channel) throw new Error("No YouTube channel found for this Google account");
    return {
      username: channel.snippet?.customUrl || profile.data.email?.split("@")[0] || channel.id,
      name: channel.snippet?.title || profile.data.name || "",
      subscribers: channel.statistics?.hiddenSubscriberCount ? null : Number(channel.statistics?.subscriberCount || 0),
    };
  },
};

import axios from "axios";
import type { ProviderDefinition } from "../types/oauth.ts";
import { bearerHeaders, TIMEOUT_MS } from "./http.ts";

interface LinkedInUserInfo {
  sub?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

export const linkedin: ProviderDefinition = {
  aliases: ["linkedin"],
  credentialEnvPrefix: "LINKEDIN",
  authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
  tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
  defaultScope: "openid profile email",
  async fetchProfile(accessToken) {
    const { data } = await axios.get<LinkedInUserInfo>("https://api.linkedin.com/v2/userinfo", {
      headers: bearerHeaders(accessToken),
      timeout: TIMEOUT_MS,
    });
    const username = data.email?.split("@")[0] || data.sub || "";
    const fullName = `${data.given_name || ""} ${data.family_name || ""}`.trim();
    return { username, name: data.name || fullName || username, connections: null };
  },
};

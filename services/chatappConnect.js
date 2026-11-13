import axios from "axios";
import crypto from "crypto";

const API_BASE_URL = (process.env.API_BASE_URL || "").replace(/\/+$/, "");

function stateSecret() {
  const secret = process.env.SOCIAL_STATE_SECRET || process.env.SESSION_SECRET || "";
  if (!secret) throw new Error("Set SOCIAL_STATE_SECRET or SESSION_SECRET before starting OAuth flow.");
  return secret;
}

export const CONNECT_PROVIDERS = ["youtube", "github", "facebook", "x", "linkedin"];

export function signStatePayload(payload) {
  return crypto.createHmac("sha256", stateSecret()).update(payload).digest("base64url");
}

export function createState(data, maxAgeMs = 10 * 60 * 1000) {
  const payload = Buffer.from(JSON.stringify({
    ...data,
    exp: Date.now() + maxAgeMs,
    nonce: crypto.randomBytes(16).toString("base64url"),
  })).toString("base64url");
  return `${payload}.${signStatePayload(payload)}`;
}

export function parseState(state) {
  try {
    if (typeof state !== "string") return null;
    const [payload, signature] = state.split(".");
    if (!payload || !signature) return null;
    const expected = signStatePayload(payload);
    const suppliedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return parsed.exp > Date.now() ? parsed : null;
  } catch {
    return null;
  }
}

function providerCredentials(provider) {
  const envPrefix = provider === "x" ? "TWITTER" : provider.toUpperCase();
  return {
    clientId: clean(process.env[`${envPrefix}_CLIENT_ID`]),
    clientSecret: clean(process.env[`${envPrefix}_CLIENT_SECRET`]),
  };
}

function clean(value) {
  return typeof value === "string" ? value.replace(/^[-"'\s]+/, "").replace(/["'\s]+$/, "").trim() : "";
}

function configured(provider) {
  const { clientId, clientSecret } = providerCredentials(provider);
  return Boolean(clientId && clientSecret);
}

function callbackUri(provider) {
  const envPrefix = provider === "x" ? "X" : provider.toUpperCase();
  return process.env[`CHATAPP_${envPrefix}_REDIRECT_URI`]
    || process.env[`PUBLIC_${envPrefix}_REDIRECT_URI`]
    || process.env[`PUBLIC_${provider.toUpperCase()}_REDIRECT_URI`]
    || `${API_BASE_URL}/chatapp/connect/${provider === "x" ? "x" : provider}/callback`;
}

function providerScope(provider) {
  const configuredScope = process.env[`${provider === "x" ? "TWITTER" : provider.toUpperCase()}_SCOPES`];
  if (configuredScope) return configuredScope;
  switch (provider) {
    case "youtube": return "openid email profile https://www.googleapis.com/auth/youtube.readonly";
    case "github": return "read:user user:email";
    case "facebook": return "email public_profile";
    case "x": return "tweet.read users.read";
    case "linkedin": return "openid profile email";
    default: return "";
  }
}

function providerEndpoints(provider) {
  switch (provider) {
    case "youtube": return { authorize: "https://accounts.google.com/o/oauth2/v2/auth", token: "https://oauth2.googleapis.com/token" };
    case "github": return { authorize: "https://github.com/login/oauth/authorize", token: "https://github.com/login/oauth/access_token" };
    case "facebook": return { authorize: "https://www.facebook.com/v19.0/dialog/oauth", token: "https://graph.facebook.com/v19.0/oauth/access_token" };
    case "x": return { authorize: "https://twitter.com/i/oauth2/authorize", token: "https://api.twitter.com/2/oauth2/token" };
    case "linkedin": return { authorize: "https://www.linkedin.com/oauth/v2/authorization", token: "https://www.linkedin.com/oauth/v2/accessToken" };
    default: throw new Error(`Unsupported provider: ${provider}`);
  }
}

function buildAuthorizeUrl(provider, state, codeVerifier) {
  const { clientId } = providerCredentials(provider);
  const redirectUri = callbackUri(provider);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: providerScope(provider),
    state,
  });
  if (provider === "youtube") {
    params.set("access_type", "offline");
    params.set("prompt", "consent");
  }
  if (provider === "x") {
    const challenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
    params.set("code_challenge", challenge);
    params.set("code_challenge_method", "S256");
  }
  return `${providerEndpoints(provider).authorize}?${params.toString()}`;
}

async function exchangeCode(provider, code, state) {
  const { clientId, clientSecret } = providerCredentials(provider);
  const redirectUri = state.redirectUri || callbackUri(provider);
  const { token } = providerEndpoints(provider);

  if (provider === "github") {
    const response = await axios.post(token, {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }, { headers: { Accept: "application/json", "User-Agent": "ChatAppOAuth" }, timeout: 15000 });
    if (response.data.error || !response.data.access_token) throw new Error(response.data.error_description || response.data.error || "GitHub token exchange failed");
    return { accessToken: response.data.access_token, refreshToken: response.data.refresh_token || null };
  }

  if (provider === "facebook") {
    const response = await axios.get(token, { params: { client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, code }, timeout: 15000 });
    if (!response.data.access_token) throw new Error(response.data.error?.message || "Facebook token exchange failed");
    return { accessToken: response.data.access_token, refreshToken: null };
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  if (provider === "x") body.set("code_verifier", state.codeVerifier);
  const response = await axios.post(token, body, { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 });
  if (!response.data.access_token) throw new Error(response.data.error_description || response.data.error || "OAuth token exchange failed");
  return {
    accessToken: response.data.access_token,
    refreshToken: response.data.refresh_token || null,
    expiresIn: response.data.expires_in || null,
  };
}

async function fetchProviderData(provider, accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  if (provider === "youtube") {
    const [channels, profile] = await Promise.all([
      axios.get("https://www.googleapis.com/youtube/v3/channels", { params: { part: "snippet,statistics", mine: "true" }, headers, timeout: 15000 }),
      axios.get("https://www.googleapis.com/oauth2/v2/userinfo", { headers, timeout: 15000 }).catch(() => ({ data: {} })),
    ]);
    const channel = channels.data?.items?.[0];
    if (!channel) throw new Error("No YouTube channel found for this Google account");
    return {
      provider,
      username: channel.snippet?.customUrl || profile.data.email?.split("@")[0] || channel.id,
      name: channel.snippet?.title || profile.data.name || "",
      subscribers: channel.statistics?.hiddenSubscriberCount ? null : Number(channel.statistics?.subscriberCount || 0),
    };
  }
  if (provider === "github") {
    const { data } = await axios.get("https://api.github.com/user", { headers: { ...headers, Accept: "application/vnd.github+json", "User-Agent": "ChatAppOAuth" }, timeout: 15000 });
    return { provider, username: data.login || "", name: data.name || data.login || "", followers: Number(data.followers || 0) };
  }
  if (provider === "facebook") {
    const { data } = await axios.get("https://graph.facebook.com/me", { params: { fields: "id,name" }, headers, timeout: 15000 });
    return { provider, username: data.id || "", name: data.name || "", followers: null };
  }
  if (provider === "x") {
    const { data } = await axios.get("https://api.twitter.com/2/users/me?user.fields=id,name,username,public_metrics", { headers, timeout: 15000 });
    const user = data.data || {};
    return { provider, username: user.username || "", name: user.name || user.username || "", followers: typeof user.public_metrics?.followers_count === "number" ? user.public_metrics.followers_count : null };
  }
  if (provider === "linkedin") {
    const { data } = await axios.get("https://api.linkedin.com/v2/userinfo", { headers, timeout: 15000 });
    const username = data.email?.split("@")[0] || data.sub || "";
    return { provider, username, name: data.name || `${data.given_name || ""} ${data.family_name || ""}`.trim() || username, connections: null };
  }
  throw new Error(`Unsupported provider: ${provider}`);
}

export function formatSuccess(provider, data) {
  return { success: true, succcess: true, status: "success", data: { provider, ...data } };
}

export function formatFailure(provider, error) {
  const message = typeof error === "string" ? error : error?.response?.data?.detail || error?.response?.data?.error_description || error?.response?.data?.error?.message || error?.response?.data?.error || error?.message || "Connection failed";
  return { success: false, succcess: false, status: "failed", error: message, data: { provider, error: message } };
}

export function makeOAuthStart(provider) {
  return (req, res) => {
    if (!configured(provider)) return res.status(503).json(formatFailure(provider, "OAuth provider is not configured"));
    const codeVerifier = provider === "x" ? crypto.randomBytes(32).toString("hex") : null;
    const state = createState({
      type: "chatapp_connect",
      provider,
      redirectUri: callbackUri(provider),
      codeVerifier,
      returnTo: req.query.redirect_to || req.query.return_to || null,
    });
    const authUrl = buildAuthorizeUrl(provider, state, codeVerifier);
    if (req.query.format === "json" || req.headers.accept?.includes("application/json")) {
      return res.json({ success: true, status: "pending", data: { provider, authUrl } });
    }
    return res.redirect(authUrl);
  };
}

export function makeOAuthCallback(provider) {
  return async (req, res) => {
    const state = parseState(req.query.state);
    if (!state || state.type !== "chatapp_connect" || state.provider !== provider) {
      return res.status(400).json(formatFailure(provider, "Invalid or expired OAuth state"));
    }
    if (req.query.error || !req.query.code) {
      return res.status(400).json(formatFailure(provider, req.query.error_description || req.query.error || "Authorization was cancelled"));
    }
    try {
      const tokens = await exchangeCode(provider, String(req.query.code), state);
      const data = await fetchProviderData(provider, tokens.accessToken);
      const result = formatSuccess(provider, data);
      if (state.returnTo) {
        const redirect = new URL(state.returnTo);
        if (redirect.protocol !== "https:" && redirect.hostname !== "localhost") return res.status(400).json(formatFailure(provider, "redirect_to must use HTTPS"));
        redirect.searchParams.set("success", "true");
        redirect.searchParams.set("status", "success");
        redirect.searchParams.set("data", JSON.stringify(result.data));
        return res.redirect(redirect.toString());
      }
      return res.json(result);
    } catch (error) {
      const result = formatFailure(provider, error);
      if (state.returnTo) {
        try {
          const redirect = new URL(state.returnTo);
          if (redirect.protocol !== "https:" && redirect.hostname !== "localhost") return res.status(400).json(result);
          redirect.searchParams.set("success", "false");
          redirect.searchParams.set("status", "failed");
          redirect.searchParams.set("data", JSON.stringify(result.data));
          return res.redirect(redirect.toString());
        } catch {
          return res.status(400).json(result);
        }
      }
      return res.status(400).json(result);
    }
  };
}

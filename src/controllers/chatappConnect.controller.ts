import { callbackUri, isConfigured } from "../providers/index.ts";
import {
  buildAuthorizeUrl,
  createCodeVerifier,
  exchangeCode,
  fetchProfile,
  usesPkce,
} from "../services/oauthClient.ts";
import { createState, parseState } from "../services/oauthState.ts";
import type { ProviderRequest, ProviderResponse } from "../types/express.ts";
import type { ConnectResult, FailureResponse, PendingResponse } from "../types/response.ts";
import { queryString } from "../utils/query.ts";
import { formatFailure, formatSuccess } from "../utils/response.ts";
import { safeReturnUrl } from "../utils/url.ts";

function wantsJson(req: ProviderRequest): boolean {
  return req.query.format === "json" || Boolean(req.headers.accept?.includes("application/json"));
}

export function startConnect(req: ProviderRequest, res: ProviderResponse<PendingResponse | FailureResponse>): void {
  const { provider } = res.locals;
  if (!isConfigured(provider)) {
    res.status(503).json(formatFailure(provider, "OAuth provider is not configured"));
    return;
  }

  const codeVerifier = usesPkce(provider) ? createCodeVerifier() : null;
  const state = createState({
    type: "chatapp_connect",
    provider,
    redirectUri: callbackUri(provider),
    codeVerifier,
    returnTo: queryString(req.query.redirect_to) ?? queryString(req.query.return_to) ?? null,
  });
  const authUrl = buildAuthorizeUrl(provider, state, codeVerifier);

  if (wantsJson(req)) {
    res.json({ success: true, status: "pending", data: { provider, authUrl } });
    return;
  }
  res.redirect(authUrl);
}

export async function handleCallback(req: ProviderRequest, res: ProviderResponse<ConnectResult>): Promise<void> {
  const { provider } = res.locals;
  const state = parseState(queryString(req.query.state));
  if (state?.type !== "chatapp_connect" || state.provider !== provider) {
    res.status(400).json(formatFailure(provider, "Invalid or expired OAuth state"));
    return;
  }

  const code = queryString(req.query.code);
  const oauthError = queryString(req.query.error);
  if (oauthError || !code) {
    const reason = queryString(req.query.error_description) ?? oauthError ?? "Authorization was cancelled";
    res.status(400).json(formatFailure(provider, reason));
    return;
  }

  let result: ConnectResult;
  try {
    const tokens = await exchangeCode(provider, code, state);
    result = formatSuccess(provider, await fetchProfile(provider, tokens.accessToken));
  } catch (error) {
    result = formatFailure(provider, error);
  }

  if (!state.returnTo) {
    res.status(result.success ? 200 : 400).json(result);
    return;
  }
  const redirect = safeReturnUrl(state.returnTo);
  if (!redirect) {
    res.status(400).json(formatFailure(provider, "redirect_to must use HTTPS"));
    return;
  }
  redirect.searchParams.set("success", String(result.success));
  redirect.searchParams.set("status", result.status);
  redirect.searchParams.set("data", JSON.stringify(result.data));
  res.redirect(redirect.toString());
}

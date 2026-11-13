import type { Provider, ProviderProfile } from "./oauth.ts";

export type ProviderName = string;

export interface SuccessResponse {
  success: true;
  succcess: true;
  status: "success";
  data: ProviderProfile & { provider: ProviderName };
}

export interface FailureResponse {
  success: false;
  succcess: false;
  status: "failed";
  error: string;
  data: { provider: ProviderName; error: string };
}

export interface PendingResponse {
  success: true;
  status: "pending";
  data: { provider: Provider; authUrl: string };
}

export type ConnectResult = SuccessResponse | FailureResponse;

export interface HealthResponse {
  ok: true;
}

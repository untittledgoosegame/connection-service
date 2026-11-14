import { isAxiosError } from "axios";
import type { ProviderProfile } from "../types/oauth.ts";
import type { FailureResponse, ProviderName, SuccessResponse } from "../types/response.ts";

interface ProviderErrorBody {
  detail?: string;
  error_description?: string;
  error?: string | { message?: string };
}

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (isAxiosError<ProviderErrorBody>(error)) {
    const body = error.response?.data;
    const nested = typeof body?.error === "object" ? body.error.message : body?.error;
    const message = body?.detail || body?.error_description || nested;
    if (message) return message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Connection failed";
}

export function formatSuccess(provider: ProviderName, profile: ProviderProfile): SuccessResponse {
  return { success: true, succcess: true, status: "success", data: { provider, ...profile } };
}

export function formatFailure(provider: ProviderName, error: unknown): FailureResponse {
  const message = errorMessage(error);
  return { success: false, succcess: false, status: "failed", error: message, data: { provider, error: message } };
}

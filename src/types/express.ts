import type { Request, Response } from "express";
import type { Provider } from "./oauth.ts";

export interface ProviderLocals extends Record<string, unknown> {
  provider: Provider;
}

export interface ProviderParams {
  provider: string;
  [key: string]: string;
}

export type ProviderRequest = Request<ProviderParams>;

export type ProviderResponse<Body = unknown> = Response<Body, ProviderLocals>;

import type { NextFunction } from "express";
import { resolveProvider } from "../providers/index.ts";
import type { ProviderRequest, ProviderResponse } from "../types/express.ts";
import { formatFailure } from "../utils/response.ts";

export function resolveProviderParam(req: ProviderRequest, res: ProviderResponse, next: NextFunction): void {
  const provider = resolveProvider(req.params.provider);
  if (!provider) {
    res.status(404).json(formatFailure(req.params.provider, `Unsupported ChatApp provider: ${req.params.provider}`));
    return;
  }
  res.locals.provider = provider;
  next();
}

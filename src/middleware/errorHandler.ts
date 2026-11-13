import type { NextFunction, Request, Response } from "express";

export function errorHandler(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }
  console.error(error);
  res.status(500).json({ success: false, status: "failed", error: "Internal server error" });
}

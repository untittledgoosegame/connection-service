import type { Request, Response } from "express";

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ success: false, status: "failed", error: `Route not found: ${req.method} ${req.path}` });
}

import express, { type Express } from "express";
import { errorHandler } from "./middleware/errorHandler.ts";
import { notFound } from "./middleware/notFound.ts";
import routes from "./routes/index.ts";

export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(routes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

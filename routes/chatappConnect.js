import express from "express";
import { CONNECT_PROVIDERS, formatFailure, makeOAuthCallback, makeOAuthStart } from "../services/chatappConnect.js";

const router = express.Router();

for (const provider of CONNECT_PROVIDERS) {
  const alias = provider === "x" ? ["x", "twitter"] : [provider];
  for (const routeName of alias) {
    router.get(`/${routeName}`, makeOAuthStart(provider));
    router.get(`/${routeName}/callback`, makeOAuthCallback(provider));
  }
}

router.use((req, res) => {
  const provider = req.path.split("/").filter(Boolean)[0] || "unknown";
  res.status(404).json(formatFailure(provider, `Unsupported ChatApp provider: ${provider}`));
});

export default router;

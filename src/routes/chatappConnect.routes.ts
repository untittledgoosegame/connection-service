import { Router } from "express";
import { handleCallback, startConnect } from "../controllers/chatappConnect.controller.ts";
import { resolveProviderParam } from "../middleware/resolveProvider.ts";

const router = Router();

router.get("/:provider", resolveProviderParam, startConnect);
router.get("/:provider/callback", resolveProviderParam, handleCallback);

export default router;

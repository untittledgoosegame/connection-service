import { Router } from "express";
import chatappConnectRoutes from "./chatappConnect.routes.ts";
import healthRoutes from "./health.routes.ts";

const router = Router();

router.use("/health", healthRoutes);
router.use("/chatapp/connect", chatappConnectRoutes);

export default router;

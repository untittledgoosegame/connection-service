import express from "express";
import dotenv from "dotenv";
import chatappConnectRouter from "./routes/chatappConnect.js";

dotenv.config();

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use("/chatapp/connect", chatappConnectRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT || 8777);
app.listen(port, () => console.log(`OAuth service listening on ${port}`));

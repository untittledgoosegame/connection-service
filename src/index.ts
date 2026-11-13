import "dotenv/config";
import { createApp } from "./app.ts";
import { port } from "./config/env.ts";

const listenPort = port();
createApp().listen(listenPort, () => console.log(`OAuth service listening on ${listenPort}`));

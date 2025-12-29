import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config.js";
import { healthcheckDb } from "./db.js";
import authRoutes from "./routes/authRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { setupSocket } from "./socket.js";

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  const dbOk = await healthcheckDb().catch(() => false);
  res.json({
    ok: true,
    dbOk,
    env: config.nodeEnv,
    time: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

// HTTP + Socket
const server = http.createServer(app);
await setupSocket(server);

server.listen(config.port, () => {
  console.log(`Backend listening on http://localhost:${config.port}`);
});

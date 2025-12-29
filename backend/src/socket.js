import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { config } from "./config.js";
import { verifyToken } from "./auth.js";
import { pool } from "./db.js";
import { v4 as uuidv4 } from "uuid";

function sanitizeRoom(room) {
  // allow simple room names like "general", "uf-dwi", "project:123"
  const s = String(room ?? "").trim();
  if (!s || s.length > 64) return null;
  if (!/^[a-zA-Z0-9:_-]+$/.test(s)) return null;
  return s;
}

function sanitizeMessage(content) {
  const s = String(content ?? "").trim();
  if (!s) return null;
  if (s.length > config.messageMaxLen) return null;
  return s;
}

export async function setupSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigin, credentials: true },
    transports: ["websocket", "polling"],
  });

  // Redis adapter for horizontal scaling
  const pub = new Redis(config.redisUrl);
  const sub = pub.duplicate();
  io.adapter(createAdapter(pub, sub));

  // Socket handshake auth (JWT)
  io.use((socket, next) => {
    try {
      // Prefer auth token, fallback to Authorization header
      const token = socket.handshake.auth?.token
        ?? (socket.handshake.headers?.authorization?.startsWith("Bearer ")
          ? socket.handshake.headers.authorization.slice("Bearer ".length)
          : null);

      if (!token) return next(new Error("unauthorized"));
      const user = verifyToken(token);
      socket.data.user = user; // { userId, email, iat, exp }
      return next();
    } catch {
      return next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    const userEmail = user?.email ?? "unknown";
    const userId = user?.userId ?? null;

    socket.emit("system", { message: `Connected as ${userEmail}` });

    socket.on("join_room", async (payload) => {
      const room = sanitizeRoom(payload?.room);
      if (!room) {
        socket.emit("system", { message: "Invalid room name." });
        return;
      }
      await socket.join(room);
      socket.emit("system", { message: `Joined room: ${room}` });
      socket.to(room).emit("system", { message: `${userEmail} joined ${room}` });
    });

    socket.on("send_message", async (payload) => {
      const room = sanitizeRoom(payload?.room);
      const content = sanitizeMessage(payload?.content);
      if (!room || !content) {
        socket.emit("system", { message: "Invalid message payload." });
        return;
      }

      // Persist to Postgres
      const id = uuidv4();
      const createdAt = new Date().toISOString();

      try {
        if (!userId) throw new Error("missing userId");
        await pool.query(
          "INSERT INTO messages(id, room, sender_id, sender_email, content, created_at) VALUES ($1,$2,$3,$4,$5, NOW())",
          [id, room, userId, userEmail, content]
        );
      } catch (e) {
        console.error("Persist message failed:", e);
        socket.emit("system", { message: "Failed to save message." });
        return;
      }

      io.to(room).emit("message", {
        id,
        room,
        senderEmail: userEmail,
        content,
        createdAt,
      });
    });

    socket.on("disconnect", () => {
      // could broadcast leave events if you track rooms
    });
  });

  return io;
}

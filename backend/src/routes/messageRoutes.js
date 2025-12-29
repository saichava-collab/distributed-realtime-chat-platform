import express from "express";
import { authMiddleware } from "../auth.js";
import { pool } from "../db.js";

const router = express.Router();

router.get("/:room", authMiddleware, async (req, res) => {
  const room = req.params.room;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);

  try {
    const result = await pool.query(
      "SELECT id, room, sender_email, content, created_at FROM messages WHERE room=$1 ORDER BY created_at DESC LIMIT $2",
      [room, limit]
    );
    // return newest-last for UI
    const rows = (result.rows ?? []).reverse().map(r => ({
      id: r.id,
      room: r.room,
      senderEmail: r.sender_email,
      content: r.content,
      createdAt: r.created_at,
    }));
    return res.json({ messages: rows });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

export default router;

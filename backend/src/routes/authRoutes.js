import express from "express";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { pool } from "../db.js";
import { signToken } from "../auth.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/register", authLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });
  if (typeof email !== "string" || typeof password !== "string") return res.status(400).json({ error: "invalid payload" });
  if (password.length < 8) return res.status(400).json({ error: "password must be at least 8 chars" });

  const passwordHash = await bcrypt.hash(password, 12);
  const id = uuidv4();

  try {
    await pool.query(
      "INSERT INTO users(id, email, password_hash) VALUES ($1, $2, $3)",
      [id, email.toLowerCase(), passwordHash]
    );
    const token = signToken({ userId: id, email: email.toLowerCase() });
    return res.json({ token });
  } catch (e) {
    if (String(e?.message).includes("duplicate key")) {
      return res.status(409).json({ error: "email already registered" });
    }
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  try {
    const result = await pool.query("SELECT id, email, password_hash FROM users WHERE email=$1", [String(email).toLowerCase()]);
    const user = result.rows?.[0];
    if (!user) return res.status(401).json({ error: "invalid credentials" });

    const ok = await bcrypt.compare(String(password), user.password_hash);
    if (!ok) return res.status(401).json({ error: "invalid credentials" });

    const token = signToken({ userId: user.id, email: user.email });
    return res.json({ token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server error" });
  }
});

export default router;

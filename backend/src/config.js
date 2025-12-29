import dotenv from "dotenv";
dotenv.config();

function required(name, fallback = undefined) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") throw new Error(`Missing env var: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwtSecret: required("JWT_SECRET", "dev_secret_change_me"),
  databaseUrl: required("DATABASE_URL"),
  redisUrl: required("REDIS_URL", "redis://localhost:6379"),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  messageMaxLen: Number(process.env.MESSAGE_MAX_LEN ?? 2000),
};

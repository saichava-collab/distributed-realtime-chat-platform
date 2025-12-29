# Distributed Real-Time Chat Platform

A production-style, scalable chat app:
- **Backend:** Node.js + Express + Socket.io
- **Scale-out:** Redis adapter (Pub/Sub)
- **Storage:** PostgreSQL (users + messages)
- **Auth/Security:** JWT login, Socket handshake verification, basic rate-limits, Helmet, CORS
- **Frontend:** React (Vite) + socket.io-client
- **Deploy/Run:** Docker Compose (recommended) or local dev
---

## 1) Quick Start (Docker Compose) ✅

### Prereqs
- Docker Desktop (or Docker Engine) installed

### Run
```bash
# from repo root
docker compose up --build
```

### Open
- Frontend: http://localhost:5173
- Backend health: http://localhost:4000/health

### Stop
```bash
docker compose down
```

---

## 2) Local Dev (no Docker)

### Prereqs
- Node 18+ (or 20+)
- Redis running locally
- PostgreSQL running locally

### Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

---

## 3) Environment Variables

### Backend (`backend/.env`)
See `backend/.env.example`.

Key ones:
- `PORT=4000`
- `JWT_SECRET=change_me`
- `DATABASE_URL=postgres://chat_user:chat_pass@postgres:5432/chatdb`
- `REDIS_URL=redis://redis:6379`

### Frontend (`frontend/.env`)
See `frontend/.env.example`.
- `VITE_API_URL=http://localhost:4000`
- `VITE_SOCKET_URL=http://localhost:4000`

---

## 4) Database Schema

When using Docker Compose, PostgreSQL auto-initializes tables using:
- `backend/db/init.sql` (mounted into `/docker-entrypoint-initdb.d/`)

Tables:
- `users(id, email, password_hash, created_at)`
- `messages(id, room, sender_id, sender_email, content, created_at)`

---

## 5) API

### Auth
- `POST /api/auth/register` `{ email, password }`
- `POST /api/auth/login` `{ email, password }` -> `{ token }`

### Messages
- `GET /api/messages/:room?limit=50` (requires `Authorization: Bearer <token>`)

---

## 6) Socket Events

### Client -> Server
- `join_room` `{ room }`
- `send_message` `{ room, content }`

### Server -> Client
- `message` `{ id, room, senderEmail, content, createdAt }`
- `system` `{ message }` (join/leave notifications)

---

## 7) Security Notes

Implemented:
- JWT auth for REST + Socket handshake verification
- Basic rate limiting on auth endpoints
- Helmet defaults
- CORS allow-list via env
- Simple input checks + message length limits

Recommended upgrades:
- Refresh tokens + rotation
- CSRF hardening for cookie-based auth (if you switch)
- WAF / CDN, IP allow-lists, bot detection
- Better validation (zod/ajv)
- Observability (OpenTelemetry + Prometheus/Grafana)

---

## 8) Project Structure

```
distributed-realtime-chat/
  backend/
  frontend/
  docker-compose.yml
```

---

## 9) Common Troubleshooting

### “database does not exist” / migrations not applied
If you previously ran containers, reset:
```bash
docker compose down -v
docker compose up --build
```

### Socket connect fails with 401
Ensure you logged in and the token exists in localStorage.
Also confirm `VITE_SOCKET_URL` matches backend host/port.

---

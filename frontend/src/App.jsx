import React, { useEffect, useMemo, useRef, useState } from "react";
import { register, login, fetchMessages } from "./api.js";
import { createSocket } from "./socket.js";

const DEFAULT_ROOM = "general";

function nowTime(ts) {
  try {
    const d = ts ? new Date(ts) : new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [room, setRoom] = useState(DEFAULT_ROOM);
  const [joined, setJoined] = useState(false);

  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("Not connected");
  const [error, setError] = useState("");

  const socketRef = useRef(null);
  const chatBoxRef = useRef(null);

  const authed = Boolean(token);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // connect socket once token exists
    if (!token) return;

    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => setStatus("Socket connected"));
    socket.on("disconnect", () => setStatus("Socket disconnected"));
    socket.on("connect_error", (e) => setStatus(`Socket error: ${e?.message || "connect_error"}`));

    socket.on("system", (payload) => {
      const text = payload?.message || "system";
      setMessages((m) => m.concat([{
        id: `sys-${Date.now()}-${Math.random()}`,
        room,
        senderEmail: "system",
        content: text,
        createdAt: new Date().toISOString(),
        system: true
      }]));
    });

    socket.on("message", (msg) => {
      setMessages((m) => m.concat([msg]));
    });

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  async function handleRegister() {
    setError("");
    try {
      const t = await register(email, password);
      localStorage.setItem("token", t);
      setToken(t);
      setPassword("");
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleLogin() {
    setError("");
    try {
      const t = await login(email, password);
      localStorage.setItem("token", t);
      setToken(t);
      setPassword("");
    } catch (e) {
      setError(e.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setToken("");
    setJoined(false);
    setMessages([]);
    setStatus("Not connected");
  }

  async function joinRoom() {
    setError("");
    const r = room.trim();
    if (!r) return;

    try {
      // Load message history first
      const history = await fetchMessages(r, token, 50);
      setMessages(history);

      socketRef.current?.emit("join_room", { room: r });
      setJoined(true);
    } catch (e) {
      setError(e.message);
    }
  }

  function sendMessage() {
    setError("");
    const r = room.trim();
    const content = draft.trim();
    if (!content) return;

    socketRef.current?.emit("send_message", { room: r, content });
    setDraft("");
  }

  return (
    <div className="container">
      <div className="card">
        <div className="h1">Distributed Real-Time Chat</div>
        <div className="small">Socket.io + Redis adapter + Postgres persistence + JWT auth</div>
      </div>

      <div style={{ height: 12 }} />

      {!authed ? (
        <div className="card col">
          <div className="h2">Sign in</div>
          <div className="row">
            <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1 }} />
            <input placeholder="password (min 8 chars)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ flex: 1 }} />
          </div>
          <div className="row">
            <button onClick={handleRegister}>Register</button>
            <button className="secondary" onClick={handleLogin}>Login</button>
          </div>
          {error ? <div className="small" style={{ color: "#ffb4b4" }}>{error}</div> : null}
          <div className="small">Tip: Use a real email format (it’s stored as-is).</div>
        </div>
      ) : (
        <div className="col">
          <div className="card row" style={{ justifyContent: "space-between" }}>
            <div className="small">Status: {status}</div>
            <button className="secondary" onClick={handleLogout}>Logout</button>
          </div>

          <div className="card col">
            <div className="row">
              <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="room name (e.g. general)" style={{ flex: 1 }} />
              <button onClick={joinRoom}>Join</button>
            </div>
            <div className="small">Room names: letters, numbers, <code>:</code> <code>_</code> <code>-</code></div>
            {error ? <div className="small" style={{ color: "#ffb4b4" }}>{error}</div> : null}
          </div>

          <div className="card col">
            <div className="h2">Room: {room}</div>
            <div ref={chatBoxRef} className="chatBox">
              {messages.map((m) => {
                const isYou = m.senderEmail !== "system" && m.senderEmail?.toLowerCase() === email?.toLowerCase();
                const cls = m.senderEmail === "system" ? "other" : (isYou ? "you" : "other");
                return (
                  <div key={m.id} className={`msg ${cls}`}>
                    <div className="meta">
                      <b>{m.senderEmail}</b> • {nowTime(m.createdAt)}
                    </div>
                    <div className="content">{m.content}</div>
                  </div>
                );
              })}
            </div>

            <div className="row">
              <textarea
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={joined ? "Type a message..." : "Join a room to start chatting"}
                style={{ flex: 1, resize: "none" }}
                disabled={!joined}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (joined) sendMessage();
                  }
                }}
              />
              <button onClick={sendMessage} disabled={!joined}>Send</button>
            </div>
            <div className="small">Press Enter to send (Shift+Enter for newline).</div>
          </div>
        </div>
      )}
    </div>
  );
}

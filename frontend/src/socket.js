import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export function createSocket(token) {
  return io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    auth: { token },
    reconnectionAttempts: 5,
    timeout: 8000,
  });
}

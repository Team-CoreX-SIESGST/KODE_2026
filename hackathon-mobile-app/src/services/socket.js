import { io } from "socket.io-client";

const SOCKET_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export function createSocket() {
  return io(SOCKET_BASE_URL, {
    transports: ["websocket"],
    autoConnect: true,
  });
}

export { SOCKET_BASE_URL };

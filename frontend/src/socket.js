import { io } from "socket.io-client";

const SOCKET_SERVER_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Singleton socket instance được sử dụng chung cho toàn bộ app
// autoConnect: true giúp tự động kết nối ngay khi file JS được load
export const socket = io(SOCKET_SERVER_URL, {
    autoConnect: true,
    reconnection: true, 
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

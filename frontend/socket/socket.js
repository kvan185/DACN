import { io } from "socket.io-client";

const host = import.meta.env.VITE_API_URL || "http://localhost:5000";

const socket = io(host, {
    transports: ["websocket"],
    autoConnect: false, // không tự động kết nối, sẽ kết nối khi cần thiết
});

export default socket;
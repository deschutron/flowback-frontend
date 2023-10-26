import {writable} from "svelte/store";

const messageStore = writable("");

const createSocket = (userId: number) => {
	const
		token = localStorage.getItem("token") || "",
		link = `${import.meta.env.VITE_WEBSOCKET_API}/chat/ws?token=${token}`,
		socket: WebSocket = new WebSocket(link);
	socket.onopen = e =>
		console.log("[open] Connection established", socket);
	socket.onmessage = e => {
		const msgId = JSON.parse(event.data).user.id;
		if (msgId !== userId)
			messageStore.set(e.data);
		console.log("[message] Data received from server:", e.data);
	};
	socket.onclose = e => {
		if (e.wasClean)
			console.log("[close] Connection closed cleanly,",
				"code:", e.code, "reason:", e.reason
			);
		else
			console.warn("[close] Connection died");
	}
	socket.onerror = e =>
		console.error("[error]", e);
	return socket;
};

const sendMessage = async (socket: WebSocket) => {
	// returns true or false to say whether a message was sent to the socket.
	return async (
		message: string, target: number, targetType: "direct"|"group"
	) => {
		if (socket.readyState <= 1 && message.length > 0) {
			await socket.send(JSON.stringify({message, target, targetType}));
			return true;
		}
		return false;
	};
};

export default {
	createSocket,
	subscribe: messageStore.subscribe,
	sendMessage
};	

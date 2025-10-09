import { WS_URL } from "./config";

let ws: WebSocket | null = null;
let messageCallback: ((data: any) => void) | null = null;

const connect = () => {
  if (ws && ws.readyState !== WebSocket.CLOSED) {
    return;
  }

  ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log("WebSocket Service: Connection established");
  };

  ws.onmessage = (event) => {
    if (messageCallback) {
      const data = JSON.parse(event.data);
      messageCallback(data);
    }
  };

  ws.onclose = () => {
    console.log("WebSocket Service: Connection closed. Reconnecting...");
    setTimeout(connect, 3000);
  };

  ws.onerror = (error) => {
    console.error("WebSocket Service: Error:", error);
    ws?.close();
  };
};

const onMessage = (callback: (data: any) => void) => {
  messageCallback = callback;
};

const disconnect = () => {
  if (ws) {
    ws.onclose = null;
    ws.close();
    console.log("WebSocket Service: Disconnected.");
  }
};

export const websocketService = {
  connect,
  onMessage,
  disconnect,
};

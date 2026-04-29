import { useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs";

export default function useWebSocket(topics = [], onMessage) {
  const clientRef = useRef(null);

  useEffect(() => {
    if (!topics.length || typeof onMessage !== "function") {
      return;
    }

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
      reconnectDelay: 5000,
      debug: () => {},
      onConnect: () => {
        topics.forEach((topic) => {
          client.subscribe(topic, (message) => {
            try {
              const body = JSON.parse(message.body);
              onMessage(body);
            } catch (error) {
              console.error("Erro ao processar mensagem do WebSocket:", error);
            }
          });
        });
      },
      onStompError: (frame) => {
        console.error("Erro STOMP:", frame);
      },
      onWebSocketError: (event) => {
        console.error("Erro WebSocket:", event);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [JSON.stringify(topics), onMessage]);
}
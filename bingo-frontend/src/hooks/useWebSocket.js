import { useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

export default function useWebSocket({ sessaoId, rodadaId, onMessage }) {
  const clientRef = useRef(null);

  useEffect(() => {
    if (!sessaoId && !rodadaId) return;

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";

    const socketUrl = `${apiUrl}/ws`;

    const token = localStorage.getItem("token");

    const client = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      reconnectDelay: 5000,
      connectHeaders: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
      onConnect: () => {
        if (sessaoId) {
          client.subscribe(`/topic/sessao/${sessaoId}`, (message) => {
            if (message.body) {
              onMessage(JSON.parse(message.body));
            }
          });

          client.subscribe(`/topic/tv/${sessaoId}`, (message) => {
            if (message.body) {
              onMessage(JSON.parse(message.body));
            }
          });
        }

        if (rodadaId) {
          client.subscribe(`/topic/rodada/${rodadaId}`, (message) => {
            if (message.body) {
              onMessage(JSON.parse(message.body));
            }
          });
        }
      },
      onStompError: (frame) => {
        console.error("Erro STOMP:", frame);
      },
      onWebSocketError: (error) => {
        console.error("Erro WebSocket:", error);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [sessaoId, rodadaId, onMessage]);
}
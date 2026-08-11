import { useEffect, useRef } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";

export default function useWebSocket(configOrTopics, maybeOnMessage) {
  const clientRef = useRef(null);
  const onMessageRef = useRef(null);
  const mensagensRecentesRef = useRef(new Map());

  const modoAntigo = Array.isArray(configOrTopics);

  const sessaoId = !modoAntigo ? configOrTopics?.sessaoId : null;
  const rodadaId = !modoAntigo ? configOrTopics?.rodadaId : null;

  const onMessage = modoAntigo ? maybeOnMessage : configOrTopics?.onMessage;

  const topics = modoAntigo
    ? configOrTopics
    : [
        ...(sessaoId ? [`/topic/sessao/${sessaoId}`, `/topic/tv/${sessaoId}`] : []),
        ...(rodadaId ? [`/topic/rodada/${rodadaId}`] : []),
      ];

  const topicsKey = topics.join("|");

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!onMessageRef.current) return;
    if (!topicsKey) return;

    let apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";

    apiUrl = apiUrl.replace(/\/$/, "");

    if (window.location.protocol === "https:" && apiUrl.startsWith("http://")) {
      apiUrl = apiUrl.replace("http://", "https://");
    }

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
        console.log("WebSocket conectado:", socketUrl);

        const topicosUnicos = [...new Set(topicsKey.split("|").filter(Boolean))];

        topicosUnicos.forEach((topic) => {
          client.subscribe(topic, (message) => {
            if (!message.body) return;

            try {
              const agora = Date.now();
              const recebidaEm = mensagensRecentesRef.current.get(message.body);

              if (recebidaEm && agora - recebidaEm < 1200) {
                return;
              }

              mensagensRecentesRef.current.set(message.body, agora);
              mensagensRecentesRef.current.forEach((timestamp, chave) => {
                if (agora - timestamp > 5000) {
                  mensagensRecentesRef.current.delete(chave);
                }
              });

              const event = JSON.parse(message.body);
              console.log("Evento recebido:", topic, event);
              onMessageRef.current?.(event);
            } catch (error) {
              console.error("Erro ao processar mensagem WebSocket:", error);
            }
          });
        });
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
  }, [topicsKey]);
}

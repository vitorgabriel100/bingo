package com.empresa.bingo.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BingoEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void publicarSessao(Long sessaoId, Object payload) {
        messagingTemplate.convertAndSend("/topic/sessao/" + sessaoId, payload);
    }

    public void publicarRodada(Long rodadaId, Object payload) {
        messagingTemplate.convertAndSend("/topic/rodada/" + rodadaId, payload);
    }

    public void publicarTv(Long sessaoId, Object payload) {
        messagingTemplate.convertAndSend("/topic/tv/" + sessaoId, payload);
    }

    public void publicarNumeroSorteado(Long sessaoId, Long rodadaId, Object payload) {
        publicarSessao(sessaoId, payload);
        publicarRodada(rodadaId, payload);
        publicarTv(sessaoId, payload);
    }
}
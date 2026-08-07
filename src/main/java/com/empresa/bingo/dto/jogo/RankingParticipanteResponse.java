package com.empresa.bingo.dto.jogo;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RankingParticipanteResponse {
    private Integer posicao;
    private Long participanteId;
    private String participanteNome;
    private String participanteApelido;
    private Integer vitorias;
    private Integer bingos;
    private Integer linhas;
    private Integer participacoes;
    private LocalDateTime ultimaVitoria;
}

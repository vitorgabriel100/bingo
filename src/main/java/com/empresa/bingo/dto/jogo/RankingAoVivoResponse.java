package com.empresa.bingo.dto.jogo;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RankingAoVivoResponse {
    private Integer posicao;
    private Long participanteId;
    private String apelido;
    private Integer cartelaNumero;
    private Integer acertos;
    private Integer faltamParaPremio;
    private Integer progressoPercentual;
    private String premioAtual;
}

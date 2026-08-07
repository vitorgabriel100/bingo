package com.empresa.bingo.dto.jogo;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ProgressoCartelaResponse {
    private Long vinculacaoId;
    private Long participanteId;
    private String participanteNome;
    private String participanteApelido;
    private Long cartelaId;
    private Integer cartelaNumero;
    private Integer serie;
    private Integer acertos;
    private Integer faltamParaBingo;
    private Integer linhasCompletas;
    private Integer progressoPercentual;
    private Boolean qualificaLinha;
    private Boolean qualificaDuplaLinha;
    private Boolean qualificaBingo;
    private List<Integer> numerosFaltantes;
}

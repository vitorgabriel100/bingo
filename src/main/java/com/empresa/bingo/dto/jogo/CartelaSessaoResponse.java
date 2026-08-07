package com.empresa.bingo.dto.jogo;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CartelaSessaoResponse {
    private Long id;
    private Long sessaoId;
    private Long participanteId;
    private String participanteNome;
    private String participanteApelido;
    private Long cartelaId;
    private Integer cartelaNumero;
    private Integer serie;
    private List<Integer> grade;
    private LocalDateTime vinculadaEm;
}

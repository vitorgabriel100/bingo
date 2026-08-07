package com.empresa.bingo.dto.jogo;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class VencedorRodadaResponse {
    private Long id;
    private Long rodadaId;
    private Integer numeroRodada;
    private Long participanteId;
    private String participanteNome;
    private String participanteApelido;
    private Long cartelaId;
    private Integer cartelaNumero;
    private Integer serie;
    private String tipoPremio;
    private Integer quantidadeAcertos;
    private LocalDateTime registradoEm;
    private String validadoPor;
}

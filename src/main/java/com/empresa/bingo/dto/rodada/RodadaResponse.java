package com.empresa.bingo.dto.rodada;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RodadaResponse {
    private Long id;
    private Integer numeroRodada;
    private String status;
    private LocalDateTime iniciouEm;
    private LocalDateTime encerrouEm;
    private Long sessaoId;
}
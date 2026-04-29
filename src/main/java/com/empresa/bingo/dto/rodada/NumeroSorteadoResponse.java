package com.empresa.bingo.dto.rodada;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NumeroSorteadoResponse {
    private Long rodadaId;
    private Integer numero;
    private Integer ordem;
    private LocalDateTime timestamp;
}
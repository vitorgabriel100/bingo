package com.empresa.bingo.dto.sessao;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class SessaoResponse {
    private Long id;
    private String descricao;
    private String status;
    private LocalDateTime dataInicio;
    private LocalDateTime dataFim;
    private Long salaId;
    private String salaNome;
}
package com.empresa.bingo.dto.rodada;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class RodadaResponse {

    private Long id;
    private Integer numeroRodada;
    private String status;
    private LocalDateTime iniciouEm;
    private LocalDateTime encerrouEm;
    private Long sessaoId;

    private BigDecimal linha;
    private BigDecimal premioLinha;
    private BigDecimal valorLinha;

    private BigDecimal bingo;
    private BigDecimal premioBingo;
    private BigDecimal valorBingo;

    private BigDecimal duploBingo;
    private BigDecimal premioDuploBingo;
    private BigDecimal valorDuploBingo;

    private Integer bolaMax;
    private Integer premioBolaMax;
    private Integer numeroBolaMax;

    private BigDecimal doacao;
    private BigDecimal valorDoacao;

    private String premioAtual;
    private String premio;

    private List<String> premiosPagos;
}
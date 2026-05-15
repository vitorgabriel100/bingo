package com.empresa.bingo.entity;

import com.empresa.bingo.enums.StatusRodada;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "rodadas",
        uniqueConstraints = @UniqueConstraint(columnNames = {"sessao_id", "numero_rodada"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rodada {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sessao_id", nullable = false)
    private SessaoBingo sessao;

    @Column(name = "numero_rodada", nullable = false)
    private Integer numeroRodada;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatusRodada status;

    @Column(name = "iniciou_em")
    private LocalDateTime iniciouEm;

    @Column(name = "encerrou_em")
    private LocalDateTime encerrouEm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vencedor_id")
    private Usuario vencedor;

    @Column(name = "premio_linha", precision = 10, scale = 2)
    private BigDecimal premioLinha;

    @Column(name = "premio_bingo", precision = 10, scale = 2)
    private BigDecimal premioBingo;

    @Column(name = "premio_duplo_bingo", precision = 10, scale = 2)
    private BigDecimal premioDuploBingo;

    @Column(name = "bola_max")
    private Integer bolaMax;

    @Column(name = "valor_doacao", precision = 10, scale = 2)
    private BigDecimal valorDoacao;

    @Column(name = "premio_atual", length = 40)
    private String premioAtual;

    @Column(name = "premios_pagos", length = 255)
    private String premiosPagos;
}
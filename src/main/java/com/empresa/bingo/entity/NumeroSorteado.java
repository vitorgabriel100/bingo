package com.empresa.bingo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "numeros_sorteados",
       uniqueConstraints = {
           @UniqueConstraint(columnNames = {"rodada_id", "numero"}),
           @UniqueConstraint(columnNames = {"rodada_id", "ordem"})
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NumeroSorteado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rodada_id", nullable = false)
    private Rodada rodada;

    @Column(nullable = false)
    private Integer numero;

    @Column(nullable = false)
    private Integer ordem;

    @Column(name = "sorteado_em", nullable = false)
    private LocalDateTime sorteadoEm = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sorteado_por", nullable = false)
    private Usuario sorteadoPor;
}
package com.empresa.bingo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "cartelas_rodada",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_cartela_rodada",
                columnNames = {"rodada_id", "cartela_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartelaRodada {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rodada_id", nullable = false)
    private Rodada rodada;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participante_id", nullable = false)
    private Participante participante;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cartela_id", nullable = false)
    private Cartela cartela;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pedido_id", nullable = false)
    private PedidoCompra pedido;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativa = false;

    @Column(name = "reservada_em", nullable = false)
    @Builder.Default
    private LocalDateTime reservadaEm = LocalDateTime.now();
}

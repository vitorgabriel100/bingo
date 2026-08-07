package com.empresa.bingo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "cartelas_sessao",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_cartela_sessao",
                columnNames = {"sessao_id", "cartela_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartelaSessao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sessao_id", nullable = false)
    private SessaoBingo sessao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "participante_id", nullable = false)
    private Participante participante;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cartela_id", nullable = false)
    private Cartela cartela;

    @Column(name = "vinculada_em", nullable = false)
    @Builder.Default
    private LocalDateTime vinculadaEm = LocalDateTime.now();
}

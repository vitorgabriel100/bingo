package com.empresa.bingo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "cartela_numeros",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_cartela_numero_posicao",
                        columnNames = {"cartela_id", "posicao"}
                ),
                @UniqueConstraint(
                        name = "uk_cartela_numero_valor",
                        columnNames = {"cartela_id", "numero"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartelaNumero {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cartela_id", nullable = false)
    private Cartela cartela;

    @Column(nullable = false)
    private Integer posicao;

    @Column(nullable = false)
    private Integer numero;
}

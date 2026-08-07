package com.empresa.bingo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "salas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sala {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(length = 150)
    private String local;

    @Column(name = "serie_cartela", nullable = false)
    @Builder.Default
    private Integer serieCartela = 8;

    @Column(name = "cartela_inicial", nullable = false)
    @Builder.Default
    private Integer cartelaInicial = 701;

    @Column(name = "cartela_final", nullable = false)
    @Builder.Default
    private Integer cartelaFinal = 800;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativa = true;
}

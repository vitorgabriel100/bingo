package com.empresa.bingo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(
        name = "cartelas",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_cartela_sala_serie_numero",
                columnNames = {"sala_id", "serie", "numero"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cartela {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sala_id", nullable = false)
    private Sala sala;

    @Column(nullable = false)
    private Integer serie;

    @Column(nullable = false)
    private Integer numero;

    @Column(nullable = false)
    @Builder.Default
    private Boolean ativa = true;

    @Column(name = "criado_em", nullable = false)
    @Builder.Default
    private LocalDateTime criadoEm = LocalDateTime.now();

    @OneToMany(mappedBy = "cartela", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("posicao ASC")
    @Builder.Default
    private List<CartelaNumero> numeros = new ArrayList<>();

    public void adicionarNumero(Integer posicao, Integer numero) {
        numeros.add(CartelaNumero.builder()
                .cartela(this)
                .posicao(posicao)
                .numero(numero)
                .build());
    }
}

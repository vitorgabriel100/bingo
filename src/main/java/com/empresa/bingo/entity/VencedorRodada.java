package com.empresa.bingo.entity;

import com.empresa.bingo.enums.TipoPremioCartela;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "vencedores_rodada",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_vencedor_rodada_cartela_premio",
                columnNames = {"rodada_id", "cartela_id", "tipo_premio"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VencedorRodada {

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

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_premio", nullable = false, length = 30)
    private TipoPremioCartela tipoPremio;

    @Column(name = "quantidade_acertos", nullable = false)
    private Integer quantidadeAcertos;

    @Column(name = "registrado_em", nullable = false)
    @Builder.Default
    private LocalDateTime registradoEm = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "validado_por", nullable = false)
    private Usuario validadoPor;
}

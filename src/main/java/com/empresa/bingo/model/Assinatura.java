package com.empresa.bingo.model;

import com.empresa.bingo.enums.StatusAssinatura;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "assinaturas")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Assinatura {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate dataInicio;

    private LocalDate dataVencimento;

    private BigDecimal valorMensal;

    @Enumerated(EnumType.STRING)
    private StatusAssinatura status;

    @OneToOne
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;
}
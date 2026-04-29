package com.empresa.bingo.dto;

import com.empresa.bingo.enums.NomePerfil;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class CriarClienteRequest {

    private String nomeCliente;
    private String responsavel;
    private String emailCliente;
    private String telefone;

    private String nomeUsuario;
    private String emailUsuario;
    private String senhaUsuario;
    private NomePerfil perfilUsuario;

    private LocalDate dataVencimento;
    private BigDecimal valorMensal;
}
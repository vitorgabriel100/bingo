package com.empresa.bingo.dto.auth;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class LoginResponse {
    private String token;
    private String tipo;

    private Long usuarioId;
    private String nome;
    private String email;
    private String perfil;

    private Long clienteId;
    private String clienteNome;

    private String assinaturaStatus;
    private LocalDate assinaturaVencimento;
    private Boolean assinaturaAtiva;
}
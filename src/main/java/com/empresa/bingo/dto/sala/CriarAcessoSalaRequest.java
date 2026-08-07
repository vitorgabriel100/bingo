package com.empresa.bingo.dto.sala;

import com.empresa.bingo.enums.NomePerfil;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CriarAcessoSalaRequest {

    @NotBlank(message = "Nome do usuário é obrigatório.")
    @Size(max = 120, message = "Nome deve ter no máximo 120 caracteres.")
    private String nome;

    @NotBlank(message = "E-mail é obrigatório.")
    @Email(message = "Informe um e-mail válido.")
    @Size(max = 120, message = "E-mail deve ter no máximo 120 caracteres.")
    private String email;

    @NotBlank(message = "Senha é obrigatória para novos usuários.")
    @Size(min = 6, max = 72, message = "Senha deve ter entre 6 e 72 caracteres.")
    private String senha;

    private NomePerfil perfil = NomePerfil.OPERADOR;
}

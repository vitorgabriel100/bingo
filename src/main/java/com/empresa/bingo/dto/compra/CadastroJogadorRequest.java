package com.empresa.bingo.dto.compra;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CadastroJogadorRequest {
    @NotNull(message = "Sala é obrigatória.")
    private Long salaId;

    @NotBlank(message = "Nome completo é obrigatório.")
    @Size(max = 120)
    private String nomeCompleto;

    @NotBlank(message = "Apelido é obrigatório.")
    @Size(max = 60)
    private String apelido;

    @NotBlank(message = "Telefone é obrigatório.")
    @Size(max = 25)
    private String telefone;

    @NotBlank(message = "E-mail é obrigatório.")
    @Email(message = "Informe um e-mail válido.")
    @Size(max = 120)
    private String email;

    @NotBlank(message = "Senha é obrigatória.")
    @Size(min = 6, max = 72, message = "A senha deve ter entre 6 e 72 caracteres.")
    private String senha;
}

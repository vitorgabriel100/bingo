package com.empresa.bingo.dto.participante;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CadastrarParticipanteRequest {

    @NotBlank(message = "Nome completo é obrigatório.")
    @Size(max = 120, message = "Nome completo deve ter no máximo 120 caracteres.")
    private String nomeCompleto;

    @NotBlank(message = "Apelido é obrigatório.")
    @Size(max = 60, message = "Apelido deve ter no máximo 60 caracteres.")
    private String apelido;

    @NotBlank(message = "Telefone é obrigatório.")
    @Size(max = 25, message = "Telefone inválido.")
    private String telefone;
}

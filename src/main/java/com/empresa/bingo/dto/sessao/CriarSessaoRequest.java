package com.empresa.bingo.dto.sessao;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CriarSessaoRequest {

    @NotNull(message = "Sala é obrigatória.")
    private Long salaId;

    @NotBlank(message = "Descrição é obrigatória.")
    private String descricao;
}
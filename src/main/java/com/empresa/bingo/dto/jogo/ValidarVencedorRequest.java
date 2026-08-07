package com.empresa.bingo.dto.jogo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ValidarVencedorRequest {

    @NotNull(message = "Cartela é obrigatória.")
    private Long cartelaId;

    @NotBlank(message = "Tipo de prêmio é obrigatório.")
    private String tipoPremio;
}

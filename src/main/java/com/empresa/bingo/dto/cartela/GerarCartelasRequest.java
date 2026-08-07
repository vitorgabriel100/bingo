package com.empresa.bingo.dto.cartela;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GerarCartelasRequest {

    @NotNull(message = "Série é obrigatória.")
    @Min(value = 1, message = "Série deve ser maior que zero.")
    private Integer serie = 8;

    @NotNull(message = "Número inicial é obrigatório.")
    @Min(value = 1, message = "Número inicial deve ser maior que zero.")
    private Integer numeroInicial = 701;

    @NotNull(message = "Número final é obrigatório.")
    @Min(value = 1, message = "Número final deve ser maior que zero.")
    @Max(value = 999999, message = "Número final inválido.")
    private Integer numeroFinal = 800;
}

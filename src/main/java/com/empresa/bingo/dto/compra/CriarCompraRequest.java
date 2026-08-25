package com.empresa.bingo.dto.compra;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CriarCompraRequest {
    @NotNull(message = "Rodada é obrigatória.")
    private Long rodadaId;

    @NotNull(message = "Quantidade é obrigatória.")
    @Min(value = 1, message = "Compre pelo menos uma cartela.")
    @Max(value = 100, message = "O limite por pedido é 100 cartelas.")
    private Integer quantidade;
}

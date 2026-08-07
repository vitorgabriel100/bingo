package com.empresa.bingo.dto.jogo;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class VincularCartelasRequest {

    @NotNull(message = "Participante é obrigatório.")
    private Long participanteId;

    @NotEmpty(message = "Selecione ao menos uma cartela.")
    @Size(max = 20, message = "É permitido vincular no máximo 20 cartelas por vez.")
    private List<@NotNull Long> cartelaIds;
}

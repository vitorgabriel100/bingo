package com.empresa.bingo.dto.sala;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CriarSalaRequest {

    @NotBlank(message = "Nome da sala é obrigatório.")
    @Size(max = 100, message = "Nome da sala deve ter no máximo 100 caracteres.")
    private String nome;

    @Size(max = 100, message = "Slug deve ter no máximo 100 caracteres.")
    private String slug;

    @Size(max = 150, message = "Local deve ter no máximo 150 caracteres.")
    private String local;

    private Integer serieCartela = 8;
    private Integer cartelaInicial = 701;
    private Integer cartelaFinal = 800;
}

package com.empresa.bingo.dto.sala;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SalaResponse {
    private Long id;
    private String nome;
    private String slug;
    private String local;
    private Integer serieCartela;
    private Integer cartelaInicial;
    private Integer cartelaFinal;
    private Boolean ativa;
    private String linkCadastro;
}

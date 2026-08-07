package com.empresa.bingo.dto.cartela;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GeracaoCartelasResponse {
    private Long salaId;
    private Integer serie;
    private Integer numeroInicial;
    private Integer numeroFinal;
    private Integer cartelasCriadas;
    private Long totalCartelasNaSerie;
}

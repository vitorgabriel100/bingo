package com.empresa.bingo.dto.cartela;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CartelaResponse {
    private Long id;
    private Long salaId;
    private Integer serie;
    private Integer numero;
    private Boolean ativa;
    private List<Integer> grade;
}

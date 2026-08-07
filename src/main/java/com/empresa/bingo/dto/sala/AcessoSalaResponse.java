package com.empresa.bingo.dto.sala;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AcessoSalaResponse {
    private Long usuarioId;
    private Long salaId;
    private String nome;
    private String email;
    private String perfil;
    private Boolean usuarioCriado;
}

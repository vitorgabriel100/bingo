package com.empresa.bingo.dto.participante;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ParticipanteResponse {
    private Long id;
    private Long salaId;
    private String salaNome;
    private String nomeCompleto;
    private String apelido;
    private String telefone;
    private Boolean ativo;
    private LocalDateTime criadoEm;
}

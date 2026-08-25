package com.empresa.bingo.dto.compra;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class CompraResponse {
    private Long id;
    private String codigoReferencia;
    private Long rodadaId;
    private String tituloRodada;
    private LocalDateTime agendadaPara;
    private String salaNome;
    private String participanteApelido;
    private Integer quantidade;
    private BigDecimal valorUnitario;
    private BigDecimal valorTotal;
    private String status;
    private List<Integer> cartelas;
    private String chavePix;
    private String recebedorPix;
    private String instrucoesPagamento;
    private LocalDateTime criadoEm;
    private LocalDateTime confirmadoEm;
    private LocalDateTime expiraEm;
}

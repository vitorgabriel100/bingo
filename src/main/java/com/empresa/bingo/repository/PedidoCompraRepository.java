package com.empresa.bingo.repository;

import com.empresa.bingo.entity.PedidoCompra;
import com.empresa.bingo.enums.StatusPagamento;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.time.LocalDateTime;

public interface PedidoCompraRepository extends JpaRepository<PedidoCompra, Long> {

    @EntityGraph(attributePaths = {"rodada", "rodada.sessao", "rodada.sessao.sala", "participante"})
    List<PedidoCompra> findByParticipanteIdOrderByCriadoEmDesc(Long participanteId);

    @EntityGraph(attributePaths = {"rodada", "rodada.sessao", "rodada.sessao.sala", "participante"})
    List<PedidoCompra> findByRodadaSessaoSalaIdAndStatusOrderByCriadoEmAsc(
            Long salaId,
            StatusPagamento status
    );

    List<PedidoCompra> findByStatusAndExpiraEmBefore(
            StatusPagamento status,
            LocalDateTime instante
    );
}

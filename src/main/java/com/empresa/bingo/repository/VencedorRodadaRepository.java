package com.empresa.bingo.repository;

import com.empresa.bingo.entity.VencedorRodada;
import com.empresa.bingo.enums.TipoPremioCartela;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface VencedorRodadaRepository extends JpaRepository<VencedorRodada, Long> {

    boolean existsByRodadaIdAndCartelaIdAndTipoPremio(
            Long rodadaId,
            Long cartelaId,
            TipoPremioCartela tipoPremio
    );

    @Query("""
            SELECT vencedor
            FROM VencedorRodada vencedor
            JOIN FETCH vencedor.participante
            JOIN FETCH vencedor.cartela
            JOIN FETCH vencedor.validadoPor
            WHERE vencedor.rodada.id = :rodadaId
            ORDER BY vencedor.registradoEm DESC
            """)
    List<VencedorRodada> findDetalhadosByRodadaId(@Param("rodadaId") Long rodadaId);

    @Query("""
            SELECT vencedor
            FROM VencedorRodada vencedor
            JOIN FETCH vencedor.participante
            JOIN FETCH vencedor.cartela
            JOIN FETCH vencedor.rodada rodada
            JOIN FETCH rodada.sessao sessao
            JOIN FETCH vencedor.validadoPor
            WHERE sessao.sala.id = :salaId
            ORDER BY vencedor.registradoEm DESC
            """)
    List<VencedorRodada> findBySalaIdParaRanking(@Param("salaId") Long salaId);
}

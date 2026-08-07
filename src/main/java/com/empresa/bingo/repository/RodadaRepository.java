package com.empresa.bingo.repository;

import com.empresa.bingo.entity.Rodada;
import com.empresa.bingo.enums.StatusRodada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RodadaRepository extends JpaRepository<Rodada, Long> {

    @EntityGraph(attributePaths = {"sessao", "sessao.sala"})
    @Query("SELECT rodada FROM Rodada rodada WHERE rodada.id = :id")
    Optional<Rodada> findDetalhadaById(@Param("id") Long id);

    List<Rodada> findBySessaoIdOrderByNumeroRodadaAsc(Long sessaoId);

    List<Rodada> findBySessaoIdOrderByNumeroRodadaDesc(Long sessaoId);

    Optional<Rodada> findBySessaoIdAndNumeroRodada(Long sessaoId, Integer numeroRodada);

    Optional<Rodada> findBySessaoIdAndStatus(Long sessaoId, StatusRodada status);

    Optional<Rodada> findFirstBySessaoIdAndStatusOrderByNumeroRodadaAsc(
            Long sessaoId,
            StatusRodada status
    );

    boolean existsBySessaoIdAndStatus(Long sessaoId, StatusRodada status);

    Optional<Rodada> findTopBySessaoIdOrderByNumeroRodadaDesc(Long sessaoId);
}

package com.empresa.bingo.repository;

import com.empresa.bingo.entity.CartelaSessao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CartelaSessaoRepository extends JpaRepository<CartelaSessao, Long> {

    boolean existsBySessaoIdAndCartelaId(Long sessaoId, Long cartelaId);

    @Query("""
            SELECT DISTINCT vinculacao
            FROM CartelaSessao vinculacao
            JOIN FETCH vinculacao.participante participante
            JOIN FETCH vinculacao.cartela cartela
            LEFT JOIN FETCH cartela.numeros
            WHERE vinculacao.sessao.id = :sessaoId
            """)
    List<CartelaSessao> findDetalhadasBySessaoId(@Param("sessaoId") Long sessaoId);

    @Query("""
            SELECT DISTINCT vinculacao
            FROM CartelaSessao vinculacao
            JOIN FETCH vinculacao.sessao sessao
            JOIN FETCH vinculacao.participante participante
            JOIN FETCH vinculacao.cartela cartela
            LEFT JOIN FETCH cartela.numeros
            WHERE sessao.id = :sessaoId AND cartela.id = :cartelaId
            """)
    Optional<CartelaSessao> findDetalhadaBySessaoIdAndCartelaId(
            @Param("sessaoId") Long sessaoId,
            @Param("cartelaId") Long cartelaId
    );

    @Query("""
            SELECT vinculacao
            FROM CartelaSessao vinculacao
            JOIN FETCH vinculacao.sessao sessao
            JOIN FETCH vinculacao.participante
            WHERE sessao.sala.id = :salaId
            """)
    List<CartelaSessao> findBySalaIdParaRanking(@Param("salaId") Long salaId);
}

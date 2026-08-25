package com.empresa.bingo.repository;

import com.empresa.bingo.entity.Cartela;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

import java.util.List;

public interface CartelaRepository extends JpaRepository<Cartela, Long> {

    boolean existsBySalaIdAndSerieAndNumero(Long salaId, Integer serie, Integer numero);

    long countBySalaIdAndSerie(Long salaId, Integer serie);

    List<Cartela> findBySalaIdAndSerieAndNumeroBetween(
            Long salaId,
            Integer serie,
            Integer numeroInicial,
            Integer numeroFinal
    );

    @EntityGraph(attributePaths = "numeros")
    List<Cartela> findBySalaIdAndSerieOrderByNumeroAsc(Long salaId, Integer serie);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT cartela FROM Cartela cartela
            WHERE cartela.sala.id = :salaId
              AND cartela.serie = :serie
              AND cartela.ativa = true
            ORDER BY cartela.numero ASC
            """)
    List<Cartela> findAtivasParaReserva(
            @Param("salaId") Long salaId,
            @Param("serie") Integer serie
    );
}

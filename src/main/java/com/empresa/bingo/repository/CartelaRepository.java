package com.empresa.bingo.repository;

import com.empresa.bingo.entity.Cartela;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

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
}

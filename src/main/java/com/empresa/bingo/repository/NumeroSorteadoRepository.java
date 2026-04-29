package com.empresa.bingo.repository;

import com.empresa.bingo.entity.NumeroSorteado;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NumeroSorteadoRepository extends JpaRepository<NumeroSorteado, Long> {
    List<NumeroSorteado> findByRodadaIdOrderByOrdemAsc(Long rodadaId);
    long countByRodadaId(Long rodadaId);
    boolean existsByRodadaIdAndNumero(Long rodadaId, Integer numero);
}
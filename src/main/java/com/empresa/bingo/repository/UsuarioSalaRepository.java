package com.empresa.bingo.repository;

import com.empresa.bingo.entity.UsuarioSala;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UsuarioSalaRepository extends JpaRepository<UsuarioSala, Long> {

    boolean existsByUsuarioIdAndSalaIdAndAtivoTrue(Long usuarioId, Long salaId);

    Optional<UsuarioSala> findByUsuarioIdAndSalaId(Long usuarioId, Long salaId);

    @EntityGraph(attributePaths = "sala")
    List<UsuarioSala> findByUsuarioIdAndAtivoTrueOrderBySalaNomeAsc(Long usuarioId);
}

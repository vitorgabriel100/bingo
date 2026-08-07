package com.empresa.bingo.repository;

import com.empresa.bingo.entity.Sala;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SalaRepository extends JpaRepository<Sala, Long> {
    Optional<Sala> findBySlugIgnoreCase(String slug);
    boolean existsBySlugIgnoreCase(String slug);
}

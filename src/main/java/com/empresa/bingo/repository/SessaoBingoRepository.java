package com.empresa.bingo.repository;

import com.empresa.bingo.entity.SessaoBingo;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.empresa.bingo.enums.StatusSessao;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SessaoBingoRepository extends JpaRepository<SessaoBingo, Long> {
    @EntityGraph(attributePaths = "sala")
    Optional<SessaoBingo> findFirstBySalaIdAndStatusInOrderByIdDesc(
            Long salaId,
            Collection<StatusSessao> statuses
    );

    @EntityGraph(attributePaths = "sala")
    List<SessaoBingo> findBySalaIdInOrderByIdDesc(Collection<Long> salaIds);

    @Override
    @EntityGraph(attributePaths = "sala")
    List<SessaoBingo> findAll();
}

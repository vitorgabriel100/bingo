package com.empresa.bingo.repository;

import com.empresa.bingo.entity.SessaoBingo;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessaoBingoRepository extends JpaRepository<SessaoBingo, Long> {
}
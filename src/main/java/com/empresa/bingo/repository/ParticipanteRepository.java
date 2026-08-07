package com.empresa.bingo.repository;

import com.empresa.bingo.entity.Participante;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ParticipanteRepository extends JpaRepository<Participante, Long> {
    boolean existsBySalaIdAndTelefone(Long salaId, String telefone);
    List<Participante> findBySalaIdOrderByCriadoEmDesc(Long salaId);
}

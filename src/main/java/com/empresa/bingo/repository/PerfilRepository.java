package com.empresa.bingo.repository;

import com.empresa.bingo.entity.Perfil;
import com.empresa.bingo.enums.NomePerfil;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PerfilRepository extends JpaRepository<Perfil, Long> {
    Optional<Perfil> findByNome(NomePerfil nome);
}
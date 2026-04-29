package com.empresa.bingo.repository;

import com.empresa.bingo.entity.Usuario;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);

    @EntityGraph(attributePaths = {"perfil"})
    Optional<Usuario> findWithPerfilByEmail(String email);

    @EntityGraph(attributePaths = {"perfil", "cliente"})
    Optional<Usuario> findWithPerfilAndClienteByEmail(String email);
}
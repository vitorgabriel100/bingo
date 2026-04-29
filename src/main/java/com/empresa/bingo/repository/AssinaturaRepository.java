package com.empresa.bingo.repository;

import com.empresa.bingo.model.Assinatura;
import com.empresa.bingo.model.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AssinaturaRepository extends JpaRepository<Assinatura, Long> {
    Optional<Assinatura> findByCliente(Cliente cliente);
}
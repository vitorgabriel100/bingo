package com.empresa.bingo.controller;

import com.empresa.bingo.dto.CriarClienteRequest;
import com.empresa.bingo.model.Cliente;
import com.empresa.bingo.service.AdminClienteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/admin/clientes")
public class AdminClienteController {

    private final AdminClienteService adminClienteService;

    @PostMapping
    public ResponseEntity<?> criarCliente(@RequestBody CriarClienteRequest request) {
        try {
            Cliente cliente = adminClienteService.criarClienteComUsuarioEAssinatura(request);

            return ResponseEntity.ok(
                    Map.of(
                            "mensagem", "Cliente criado com sucesso.",
                            "clienteId", cliente.getId(),
                            "nome", cliente.getNome()
                    )
            );
        } catch (RuntimeException error) {
            return ResponseEntity.badRequest().body(
                    Map.of(
                            "erro", "Erro ao criar cliente.",
                            "mensagem", error.getMessage()
                    )
            );
        }
    }
}
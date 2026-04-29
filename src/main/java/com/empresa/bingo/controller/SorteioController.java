package com.empresa.bingo.controller;

import com.empresa.bingo.dto.rodada.NumeroSorteadoResponse;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.exception.RegraNegocioException;
import com.empresa.bingo.repository.UsuarioRepository;
import com.empresa.bingo.service.SorteioService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/rodadas")
@RequiredArgsConstructor
public class SorteioController {

    private final SorteioService sorteioService;
    private final UsuarioRepository usuarioRepository;

    @PreAuthorize("hasAnyAuthority('ROLE_OPERADOR', 'ROLE_GERENTE', 'ROLE_ADMIN', 'OPERADOR', 'GERENTE', 'ADMIN')")
    @PostMapping("/{id}/sortear")
    public NumeroSorteadoResponse sortear(
            @PathVariable Long id,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getName() == null) {
            throw new RegraNegocioException("Usuário não autenticado.");
        }

        Usuario operador = usuarioRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RegraNegocioException("Usuário autenticado não encontrado."));

        return sorteioService.sortearProximoNumero(id, operador);
    }

    @GetMapping("/{id}/numeros")
    public List<NumeroSorteadoResponse> listarNumerosSorteados(
            @PathVariable Long id
    ) {
        return sorteioService.listarNumerosSorteados(id);
    }
}
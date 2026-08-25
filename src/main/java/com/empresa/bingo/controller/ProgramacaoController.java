package com.empresa.bingo.controller;

import com.empresa.bingo.dto.rodada.RodadaResponse;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.repository.UsuarioRepository;
import com.empresa.bingo.service.RodadaService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/programacao")
@RequiredArgsConstructor
public class ProgramacaoController {

    private final RodadaService rodadaService;
    private final UsuarioRepository usuarioRepository;

    @GetMapping("/salas/{salaId}")
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    public List<RodadaResponse> listar(
            @PathVariable Long salaId,
            Authentication authentication
    ) {
        Usuario usuario = usuarioRepository.findWithPerfilByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuário autenticado não encontrado."));
        return rodadaService.listarProgramacaoDaSala(salaId, usuario);
    }
}

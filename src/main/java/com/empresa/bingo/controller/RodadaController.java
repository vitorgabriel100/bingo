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
@RequestMapping("/rodadas")
@RequiredArgsConstructor
public class RodadaController {

    private final RodadaService rodadaService;
    private final UsuarioRepository usuarioRepository;

    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @PatchMapping("/{id}/iniciar")
    public RodadaResponse iniciar(@PathVariable Long id, Authentication authentication) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return rodadaService.iniciarRodada(id, usuario);
    }

    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @PatchMapping("/{id}/pausar")
    public RodadaResponse pausar(@PathVariable Long id, Authentication authentication) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return rodadaService.pausarRodada(id, usuario);
    }

    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @PatchMapping("/{id}/encerrar")
    public RodadaResponse encerrar(@PathVariable Long id, Authentication authentication) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return rodadaService.encerrarRodada(id, usuario);
    }

    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @PostMapping("/sessao/{sessaoId}")
    public RodadaResponse criarRodada(
            @PathVariable Long sessaoId,
            Authentication authentication
    ) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return rodadaService.criarRodada(sessaoId, usuario);
    }

    @GetMapping("/sessao/{sessaoId}")
    public List<RodadaResponse> listarRodadas(@PathVariable Long sessaoId) {
        return rodadaService.listarRodadasDaSessao(sessaoId);
    }

    @GetMapping("/sessao/{sessaoId}/ativa")
    public RodadaResponse buscarRodadaAtiva(@PathVariable Long sessaoId) {
        return rodadaService.buscarRodadaAtiva(sessaoId);
    }

    private Usuario getUsuarioAutenticado(Authentication authentication) {
        return usuarioRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuário autenticado não encontrado."));
    }
}
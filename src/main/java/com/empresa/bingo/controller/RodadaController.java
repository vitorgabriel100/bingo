package com.empresa.bingo.controller;

import com.empresa.bingo.dto.rodada.RodadaResponse;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.repository.UsuarioRepository;
import com.empresa.bingo.service.RodadaService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

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
            @RequestBody(required = false) Map<String, Object> payload,
            Authentication authentication
    ) {
        Usuario usuario = getUsuarioAutenticado(authentication);

        RodadaResponse rodadaCriada = rodadaService.criarRodada(sessaoId, usuario);

        Map<String, Object> dados = payload == null ? Collections.emptyMap() : payload;

        if (!dados.isEmpty()) {
            return rodadaService.atualizarDadosRodada(rodadaCriada.getId(), dados, usuario);
        }

        return rodadaCriada;
    }

    @GetMapping("/{id}")
    public RodadaResponse buscarPorId(@PathVariable Long id) {
        return rodadaService.buscarRodadaPorId(id);
    }

    @GetMapping("/sessao/{sessaoId}")
    public List<RodadaResponse> listarRodadas(@PathVariable Long sessaoId) {
        return rodadaService.listarRodadasDaSessao(sessaoId);
    }

    @GetMapping("/sessao/{sessaoId}/ativa")
    public RodadaResponse buscarRodadaAtiva(@PathVariable Long sessaoId) {
        return rodadaService.buscarRodadaAtiva(sessaoId);
    }

    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @PatchMapping("/{id}")
    public RodadaResponse atualizarDadosRodada(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return rodadaService.atualizarDadosRodada(id, payload, usuario);
    }

    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @PatchMapping("/{id}/premiacao")
    public RodadaResponse atualizarPremiacao(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return rodadaService.atualizarPremiacao(id, payload, usuario);
    }

    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @PatchMapping("/{id}/premios")
    public RodadaResponse atualizarPremios(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return rodadaService.atualizarPremiacao(id, payload, usuario);
    }

    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @PatchMapping("/{id}/premio-atual")
    public RodadaResponse atualizarPremioAtual(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return rodadaService.atualizarPremioAtual(id, payload, usuario);
    }

    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @PatchMapping("/{id}/premio")
    public RodadaResponse atualizarPremio(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return rodadaService.atualizarPremioAtual(id, payload, usuario);
    }

    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @PatchMapping("/{id}/premios-pagos")
    public RodadaResponse atualizarPremiosPagos(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return rodadaService.atualizarPremiosPagos(id, payload, usuario);
    }

    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @PatchMapping("/{id}/premios/status")
    public RodadaResponse atualizarStatusPremios(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload,
            Authentication authentication
    ) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return rodadaService.atualizarPremiosPagos(id, payload, usuario);
    }

    private Usuario getUsuarioAutenticado(Authentication authentication) {
        return usuarioRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuário autenticado não encontrado."));
    }
}
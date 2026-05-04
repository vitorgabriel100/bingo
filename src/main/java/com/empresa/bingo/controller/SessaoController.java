package com.empresa.bingo.controller;

import com.empresa.bingo.dto.sessao.CriarSessaoRequest;
import com.empresa.bingo.dto.sessao.SessaoResponse;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.repository.UsuarioRepository;
import com.empresa.bingo.service.SessaoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sessoes")
@RequiredArgsConstructor
public class SessaoController {

    private final SessaoService sessaoService;
    private final UsuarioRepository usuarioRepository;

    @PostMapping
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    public SessaoResponse criar(@RequestBody @Valid CriarSessaoRequest request, Authentication authentication) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return sessaoService.criarSessao(request, usuario);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    public List<SessaoResponse> listar() {
        return sessaoService.listarSessoes();
    }

    @GetMapping("/ativa")
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    public SessaoResponse buscarSessaoAtiva(Authentication authentication) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return sessaoService.buscarOuCriarSessaoAtiva(usuario);
    }

    @PatchMapping("/{id}/iniciar")
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    public SessaoResponse iniciar(@PathVariable Long id, Authentication authentication) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return sessaoService.iniciarSessao(id, usuario);
    }

    @PatchMapping("/{id}/pausar")
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    public SessaoResponse pausar(@PathVariable Long id, Authentication authentication) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return sessaoService.pausarSessao(id, usuario);
    }

    @PatchMapping("/{id}/encerrar")
    @PreAuthorize("hasAnyRole('GERENTE', 'ADMIN')")
    public SessaoResponse encerrar(@PathVariable Long id, Authentication authentication) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return sessaoService.encerrarSessao(id, usuario);
    }

    private Usuario getUsuarioAutenticado(Authentication authentication) {
        return usuarioRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuário autenticado não encontrado."));
    }
}
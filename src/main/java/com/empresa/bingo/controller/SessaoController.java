package com.empresa.bingo.controller;

import com.empresa.bingo.dto.sessao.CriarSessaoRequest;
import com.empresa.bingo.dto.sessao.SessaoResponse;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.repository.UsuarioRepository;
import com.empresa.bingo.service.SessaoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/sessoes")
@RequiredArgsConstructor
public class SessaoController {

    private final SessaoService sessaoService;
    private final UsuarioRepository usuarioRepository;

    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @PostMapping
    public SessaoResponse criar(@RequestBody @Valid CriarSessaoRequest request, Authentication authentication) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return sessaoService.criarSessao(request, usuario);
    }

    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @PatchMapping("/{id}/iniciar")
    public SessaoResponse iniciar(@PathVariable Long id, Authentication authentication) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return sessaoService.iniciarSessao(id, usuario);
    }

    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @PatchMapping("/{id}/pausar")
    public SessaoResponse pausar(@PathVariable Long id, Authentication authentication) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return sessaoService.pausarSessao(id, usuario);
    }

    @PreAuthorize("hasAnyRole('GERENTE', 'ADMIN')")
    @PatchMapping("/{id}/encerrar")
    public SessaoResponse encerrar(@PathVariable Long id, Authentication authentication) {
        Usuario usuario = getUsuarioAutenticado(authentication);
        return sessaoService.encerrarSessao(id, usuario);
    }

    private Usuario getUsuarioAutenticado(Authentication authentication) {
        return usuarioRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuário autenticado não encontrado."));
    }

    @GetMapping
@PreAuthorize("hasAnyRole('OPERADOR','ADMIN','GERENTE')")
public java.util.List<SessaoResponse> listar() {
    return sessaoService.listarSessoes();
}

@GetMapping("/ativa")
@PreAuthorize("hasAnyRole('OPERADOR','ADMIN','GERENTE')")
public SessaoResponse buscarSessaoAtiva() {
    return sessaoService.buscarSessaoAtiva();
}
}
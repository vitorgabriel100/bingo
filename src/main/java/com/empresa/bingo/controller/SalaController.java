package com.empresa.bingo.controller;

import com.empresa.bingo.dto.sala.CriarSalaRequest;
import com.empresa.bingo.dto.sala.CriarAcessoSalaRequest;
import com.empresa.bingo.dto.sala.AcessoSalaResponse;
import com.empresa.bingo.dto.sala.SalaResponse;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.repository.UsuarioRepository;
import com.empresa.bingo.service.SalaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/salas")
@RequiredArgsConstructor
public class SalaController {

    private final SalaService salaService;
    private final UsuarioRepository usuarioRepository;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public SalaResponse criar(@RequestBody @Valid CriarSalaRequest request) {
        return salaService.criar(request);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    public List<SalaResponse> listar(Authentication authentication) {
        return salaService.listar(getUsuarioAutenticado(authentication));
    }

    @PostMapping("/{salaId}/usuarios/{usuarioId}")
    @PreAuthorize("hasRole('ADMIN')")
    public Map<String, String> vincularUsuario(
            @PathVariable Long salaId,
            @PathVariable Long usuarioId
    ) {
        salaService.vincularUsuario(salaId, usuarioId);
        return Map.of("mensagem", "Usuário vinculado à sala com sucesso.");
    }

    @PostMapping("/{salaId}/acessos")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public AcessoSalaResponse criarAcesso(
            @PathVariable Long salaId,
            @RequestBody @Valid CriarAcessoSalaRequest request
    ) {
        return salaService.criarAcesso(salaId, request);
    }

    private Usuario getUsuarioAutenticado(Authentication authentication) {
        return usuarioRepository.findWithPerfilByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuário autenticado não encontrado."));
    }
}

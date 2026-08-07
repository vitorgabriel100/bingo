package com.empresa.bingo.controller;

import com.empresa.bingo.dto.jogo.*;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.repository.UsuarioRepository;
import com.empresa.bingo.service.JogoCartelaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class JogoCartelaController {

    private final JogoCartelaService jogoCartelaService;
    private final UsuarioRepository usuarioRepository;

    @PostMapping("/sessoes/{sessaoId}/cartelas")
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public List<CartelaSessaoResponse> vincular(
            @PathVariable Long sessaoId,
            @RequestBody @Valid VincularCartelasRequest request,
            Authentication authentication
    ) {
        return jogoCartelaService.vincularCartelas(
                sessaoId,
                request,
                getUsuarioAutenticado(authentication)
        );
    }

    @GetMapping("/sessoes/{sessaoId}/cartelas")
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    public List<CartelaSessaoResponse> listarVinculacoes(
            @PathVariable Long sessaoId,
            Authentication authentication
    ) {
        return jogoCartelaService.listarVinculacoes(
                sessaoId,
                getUsuarioAutenticado(authentication)
        );
    }

    @DeleteMapping("/sessoes/{sessaoId}/cartelas/{cartelaId}")
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removerVinculacao(
            @PathVariable Long sessaoId,
            @PathVariable Long cartelaId,
            Authentication authentication
    ) {
        jogoCartelaService.removerVinculacao(
                sessaoId,
                cartelaId,
                getUsuarioAutenticado(authentication)
        );
    }

    @GetMapping("/rodadas/{rodadaId}/progresso-cartelas")
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    public List<ProgressoCartelaResponse> listarProgresso(
            @PathVariable Long rodadaId,
            Authentication authentication
    ) {
        return jogoCartelaService.listarProgresso(
                rodadaId,
                getUsuarioAutenticado(authentication)
        );
    }

    @PostMapping("/rodadas/{rodadaId}/vencedores")
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public VencedorRodadaResponse validarVencedor(
            @PathVariable Long rodadaId,
            @RequestBody @Valid ValidarVencedorRequest request,
            Authentication authentication
    ) {
        return jogoCartelaService.validarVencedor(
                rodadaId,
                request,
                getUsuarioAutenticado(authentication)
        );
    }

    @GetMapping("/rodadas/{rodadaId}/vencedores")
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    public List<VencedorRodadaResponse> listarVencedores(
            @PathVariable Long rodadaId,
            Authentication authentication
    ) {
        return jogoCartelaService.listarVencedores(
                rodadaId,
                getUsuarioAutenticado(authentication)
        );
    }

    @GetMapping("/salas/{salaId}/ranking")
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    public List<RankingParticipanteResponse> buscarRanking(
            @PathVariable Long salaId,
            Authentication authentication
    ) {
        return jogoCartelaService.buscarRanking(
                salaId,
                getUsuarioAutenticado(authentication)
        );
    }

    private Usuario getUsuarioAutenticado(Authentication authentication) {
        return usuarioRepository.findWithPerfilByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuário autenticado não encontrado."));
    }
}

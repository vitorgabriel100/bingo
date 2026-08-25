package com.empresa.bingo.controller;

import com.empresa.bingo.dto.compra.CompraResponse;
import com.empresa.bingo.dto.compra.CriarCompraRequest;
import com.empresa.bingo.dto.rodada.RodadaResponse;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.repository.UsuarioRepository;
import com.empresa.bingo.service.CompraService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/compras")
@RequiredArgsConstructor
public class CompraController {

    private final CompraService compraService;
    private final UsuarioRepository usuarioRepository;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('JOGADOR')")
    public CompraResponse criar(
            @RequestBody @Valid CriarCompraRequest request,
            Authentication authentication
    ) {
        return compraService.criar(request, usuario(authentication));
    }

    @GetMapping("/minhas")
    @PreAuthorize("hasRole('JOGADOR')")
    public List<CompraResponse> listarMinhas(Authentication authentication) {
        return compraService.listarMinhas(usuario(authentication));
    }

    @GetMapping("/catalogo")
    @PreAuthorize("hasRole('JOGADOR')")
    public List<RodadaResponse> listarCatalogo(Authentication authentication) {
        return compraService.listarCatalogo(usuario(authentication));
    }

    @GetMapping("/operador")
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    public List<CompraResponse> listarPendentes(
            @RequestParam Long salaId,
            Authentication authentication
    ) {
        return compraService.listarPendentes(salaId, usuario(authentication));
    }

    @PatchMapping("/{pedidoId}/confirmar")
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    public CompraResponse confirmar(
            @PathVariable Long pedidoId,
            Authentication authentication
    ) {
        return compraService.confirmar(pedidoId, usuario(authentication));
    }

    @PatchMapping("/{pedidoId}/cancelar")
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    public CompraResponse cancelar(
            @PathVariable Long pedidoId,
            Authentication authentication
    ) {
        return compraService.cancelar(pedidoId, usuario(authentication));
    }

    private Usuario usuario(Authentication authentication) {
        return usuarioRepository.findWithPerfilByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuário autenticado não encontrado."));
    }
}

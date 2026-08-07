package com.empresa.bingo.controller;

import com.empresa.bingo.dto.cartela.CartelaResponse;
import com.empresa.bingo.dto.cartela.GeracaoCartelasResponse;
import com.empresa.bingo.dto.cartela.GerarCartelasRequest;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.repository.UsuarioRepository;
import com.empresa.bingo.service.CartelaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/salas/{salaId}/cartelas")
@RequiredArgsConstructor
public class CartelaController {

    private final CartelaService cartelaService;
    private final UsuarioRepository usuarioRepository;

    @PostMapping("/gerar")
    @PreAuthorize("hasAnyRole('GERENTE', 'ADMIN')")
    public GeracaoCartelasResponse gerar(
            @PathVariable Long salaId,
            @RequestBody @Valid GerarCartelasRequest request,
            Authentication authentication
    ) {
        return cartelaService.gerar(salaId, request, getUsuarioAutenticado(authentication));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    public List<CartelaResponse> listar(
            @PathVariable Long salaId,
            @RequestParam(defaultValue = "8") Integer serie,
            Authentication authentication
    ) {
        return cartelaService.listar(salaId, serie, getUsuarioAutenticado(authentication));
    }

    private Usuario getUsuarioAutenticado(Authentication authentication) {
        return usuarioRepository.findWithPerfilByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuário autenticado não encontrado."));
    }
}

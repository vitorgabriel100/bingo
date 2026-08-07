package com.empresa.bingo.controller;

import com.empresa.bingo.dto.participante.ParticipanteResponse;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.repository.UsuarioRepository;
import com.empresa.bingo.service.ParticipanteService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/salas/{salaId}/participantes")
@RequiredArgsConstructor
public class ParticipanteController {

    private final ParticipanteService participanteService;
    private final UsuarioRepository usuarioRepository;

    @GetMapping
    @PreAuthorize("hasAnyRole('OPERADOR', 'GERENTE', 'ADMIN')")
    public List<ParticipanteResponse> listar(
            @PathVariable Long salaId,
            Authentication authentication
    ) {
        return participanteService.listar(salaId, getUsuarioAutenticado(authentication));
    }

    private Usuario getUsuarioAutenticado(Authentication authentication) {
        return usuarioRepository.findWithPerfilByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Usuário autenticado não encontrado."));
    }
}

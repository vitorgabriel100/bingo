package com.empresa.bingo.controller;

import com.empresa.bingo.dto.participante.CadastrarParticipanteRequest;
import com.empresa.bingo.dto.participante.ParticipanteResponse;
import com.empresa.bingo.dto.sala.SalaResponse;
import com.empresa.bingo.service.ParticipanteService;
import com.empresa.bingo.service.SalaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/public/salas")
@RequiredArgsConstructor
public class CadastroPublicoController {

    private final SalaService salaService;
    private final ParticipanteService participanteService;

    @GetMapping("/{slug}")
    public SalaResponse buscarSala(@PathVariable String slug) {
        return salaService.buscarPublica(slug);
    }

    @PostMapping("/{slug}/participantes")
    @ResponseStatus(HttpStatus.CREATED)
    public ParticipanteResponse cadastrar(
            @PathVariable String slug,
            @RequestBody @Valid CadastrarParticipanteRequest request
    ) {
        return participanteService.cadastrarPublico(slug, request);
    }
}

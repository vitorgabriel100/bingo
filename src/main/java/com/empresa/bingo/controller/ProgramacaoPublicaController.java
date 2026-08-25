package com.empresa.bingo.controller;

import com.empresa.bingo.dto.compra.CadastroJogadorRequest;
import com.empresa.bingo.dto.rodada.RodadaResponse;
import com.empresa.bingo.service.CadastroJogadorService;
import com.empresa.bingo.service.RodadaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/public")
@RequiredArgsConstructor
public class ProgramacaoPublicaController {

    private final RodadaService rodadaService;
    private final CadastroJogadorService cadastroJogadorService;

    @GetMapping("/programacao")
    public List<RodadaResponse> listarProgramacao() {
        return rodadaService.listarProgramacaoPublica();
    }

    @PostMapping("/jogadores")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> cadastrarJogador(@RequestBody @Valid CadastroJogadorRequest request) {
        cadastroJogadorService.cadastrar(request);
        return Map.of("mensagem", "Cadastro concluído. Faça login para comprar suas cartelas.");
    }
}

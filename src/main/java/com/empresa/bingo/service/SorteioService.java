package com.empresa.bingo.service;

import com.empresa.bingo.dto.rodada.NumeroSorteadoResponse;
import com.empresa.bingo.entity.NumeroSorteado;
import com.empresa.bingo.entity.Rodada;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.enums.StatusRodada;
import com.empresa.bingo.exception.RegraNegocioException;
import com.empresa.bingo.repository.NumeroSorteadoRepository;
import com.empresa.bingo.repository.RodadaRepository;
import com.empresa.bingo.websocket.BingoEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
public class SorteioService {

    private static final int NUMERO_MINIMO = 1;
    private static final int NUMERO_MAXIMO = 75;

    private final RodadaRepository rodadaRepository;
    private final NumeroSorteadoRepository numeroSorteadoRepository;
    private final AuditoriaService auditoriaService;
    private final BingoEventPublisher bingoEventPublisher;

    @Transactional
    public NumeroSorteadoResponse sortearProximoNumero(Long rodadaId, Usuario operador) {
        Rodada rodada = rodadaRepository.findById(rodadaId)
                .orElseThrow(() -> new RegraNegocioException("Rodada não encontrada."));

        if (rodada.getStatus() != StatusRodada.EM_ANDAMENTO) {
            throw new RegraNegocioException("A rodada não está em andamento.");
        }

        Set<Integer> numerosJaSorteados = numeroSorteadoRepository
                .findByRodadaIdOrderByOrdemAsc(rodadaId)
                .stream()
                .map(NumeroSorteado::getNumero)
                .collect(java.util.stream.Collectors.toCollection(LinkedHashSet::new));

        if (numerosJaSorteados.size() >= NUMERO_MAXIMO) {
            throw new RegraNegocioException("Todos os números da rodada já foram sorteados.");
        }

        var numerosDisponiveis = IntStream.rangeClosed(NUMERO_MINIMO, NUMERO_MAXIMO)
                .boxed()
                .filter(numero -> !numerosJaSorteados.contains(numero))
                .toList();

        Integer numero = numerosDisponiveis.get(new Random().nextInt(numerosDisponiveis.size()));
        int ordem = numerosJaSorteados.size() + 1;

        NumeroSorteado numeroSorteado = NumeroSorteado.builder()
                .rodada(rodada)
                .numero(numero)
                .ordem(ordem)
                .sorteadoEm(LocalDateTime.now())
                .sorteadoPor(operador)
                .build();

        numeroSorteadoRepository.save(numeroSorteado);

        Long sessaoId = rodada.getSessao().getId();

        bingoEventPublisher.publicarNumeroSorteado(sessaoId, rodadaId, Map.of(
                "type", "NUMBER_DRAWN",
                "rodadaId", rodadaId,
                "sessaoId", sessaoId,
                "numero", numero,
                "ordem", ordem,
                "timestamp", numeroSorteado.getSorteadoEm().toString()
        ));

        auditoriaService.registrar(
                operador,
                "SORTEIO_NUMERO",
                "RODADA",
                rodadaId,
                "Número sorteado: " + numero + " | Ordem: " + ordem
        );

        return NumeroSorteadoResponse.builder()
                .rodadaId(rodadaId)
                .numero(numero)
                .ordem(ordem)
                .timestamp(numeroSorteado.getSorteadoEm())
                .build();

                
    }
    @Transactional(readOnly = true)
public List<NumeroSorteadoResponse> listarNumerosSorteados(Long rodadaId) {
    return numeroSorteadoRepository.findByRodadaIdOrderByOrdemAsc(rodadaId)
            .stream()
            .map(numero -> NumeroSorteadoResponse.builder()
                    .rodadaId(rodadaId)
                    .numero(numero.getNumero())
                    .ordem(numero.getOrdem())
                    .timestamp(numero.getSorteadoEm())
                    .build())
            .toList();
}

    
}
package com.empresa.bingo.service;

import com.empresa.bingo.dto.rodada.RodadaResponse;
import com.empresa.bingo.entity.NumeroSorteado;
import com.empresa.bingo.entity.Rodada;
import com.empresa.bingo.entity.SessaoBingo;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.enums.StatusRodada;
import com.empresa.bingo.enums.StatusSessao;
import com.empresa.bingo.exception.RegraNegocioException;
import com.empresa.bingo.repository.NumeroSorteadoRepository;
import com.empresa.bingo.repository.RodadaRepository;
import com.empresa.bingo.repository.SessaoBingoRepository;
import com.empresa.bingo.websocket.BingoEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class RodadaService {

    private final RodadaRepository rodadaRepository;
    private final SessaoBingoRepository sessaoBingoRepository;
    private final NumeroSorteadoRepository numeroSorteadoRepository;
    private final AuditoriaService auditoriaService;
    private final BingoEventPublisher bingoEventPublisher;

    @Transactional
    public RodadaResponse iniciarRodada(Long rodadaId, Usuario usuarioLogado) {
        Rodada rodada = buscarRodada(rodadaId);
        SessaoBingo sessao = rodada.getSessao();

        if (sessao == null) {
            throw new RegraNegocioException("A rodada não possui sessão vinculada.");
        }

        Long sessaoId = sessao.getId();
        Long rodadaAtualId = rodada.getId();

        if (sessao.getStatus() != StatusSessao.CRIADA
                && sessao.getStatus() != StatusSessao.AGENDADA
                && sessao.getStatus() != StatusSessao.PAUSADA
                && sessao.getStatus() != StatusSessao.EM_ANDAMENTO) {
            throw new RegraNegocioException(
                    "A sessão só pode iniciar rodada se estiver CRIADA, AGENDADA, PAUSADA ou EM_ANDAMENTO."
            );
        }

        if (rodada.getStatus() != StatusRodada.CRIADA
                && rodada.getStatus() != StatusRodada.AGUARDANDO
                && rodada.getStatus() != StatusRodada.PAUSADA
                && rodada.getStatus() != StatusRodada.EM_ANDAMENTO) {
            throw new RegraNegocioException(
                    "A rodada só pode ser iniciada se estiver CRIADA, AGUARDANDO, PAUSADA ou EM_ANDAMENTO."
            );
        }

        List<Rodada> rodadasDaSessao = rodadaRepository.findBySessaoIdOrderByNumeroRodadaDesc(sessaoId);

        for (Rodada rodadaAntiga : rodadasDaSessao) {
            if (rodadaAntiga.getStatus() == StatusRodada.EM_ANDAMENTO
                    && !rodadaAntiga.getId().equals(rodadaAtualId)) {

                rodadaAntiga.setStatus(StatusRodada.FINALIZADA);

                if (rodadaAntiga.getEncerrouEm() == null) {
                    rodadaAntiga.setEncerrouEm(LocalDateTime.now());
                }

                rodadaAntiga = rodadaRepository.save(rodadaAntiga);

                auditoriaService.registrar(
                        usuarioLogado,
                        "ENCERRAR_RODADA_AUTOMATICAMENTE",
                        "RODADA",
                        rodadaAntiga.getId(),
                        "Rodada " + rodadaAntiga.getNumeroRodada()
                                + " encerrada automaticamente ao iniciar nova rodada."
                );

                Map<String, Object> payloadRodadaAntiga = Map.of(
                        "type", "ROUND_FINISHED",
                        "rodadaId", rodadaAntiga.getId(),
                        "sessaoId", sessaoId,
                        "numeroRodada", rodadaAntiga.getNumeroRodada(),
                        "status", rodadaAntiga.getStatus().name(),
                        "timestamp", rodadaAntiga.getEncerrouEm().toString()
                );

                bingoEventPublisher.publicarRodada(rodadaAntiga.getId(), payloadRodadaAntiga);
                bingoEventPublisher.publicarSessao(sessaoId, payloadRodadaAntiga);
                bingoEventPublisher.publicarTv(sessaoId, payloadRodadaAntiga);
            }
        }

        if (sessao.getStatus() == StatusSessao.CRIADA
                || sessao.getStatus() == StatusSessao.AGENDADA
                || sessao.getStatus() == StatusSessao.PAUSADA) {

            sessao.setStatus(StatusSessao.EM_ANDAMENTO);

            if (sessao.getDataInicio() == null) {
                sessao.setDataInicio(LocalDateTime.now());
            }

            sessao = sessaoBingoRepository.save(sessao);
        }

        rodada.setStatus(StatusRodada.EM_ANDAMENTO);

        if (rodada.getIniciouEm() == null) {
            rodada.setIniciouEm(LocalDateTime.now());
        }

        rodada = rodadaRepository.save(rodada);

        auditoriaService.registrar(
                usuarioLogado,
                "INICIAR_RODADA",
                "RODADA",
                rodada.getId(),
                "Rodada " + rodada.getNumeroRodada() + " iniciada."
        );

        Map<String, Object> payload = Map.of(
                "type", "ROUND_STARTED",
                "rodadaId", rodada.getId(),
                "sessaoId", sessao.getId(),
                "numeroRodada", rodada.getNumeroRodada(),
                "status", rodada.getStatus().name(),
                "timestamp", rodada.getIniciouEm().toString()
        );

        bingoEventPublisher.publicarRodada(rodada.getId(), payload);
        bingoEventPublisher.publicarSessao(sessao.getId(), payload);
        bingoEventPublisher.publicarTv(sessao.getId(), payload);

        return toResponse(rodada);
    }

    @Transactional
    public RodadaResponse pausarRodada(Long rodadaId, Usuario usuarioLogado) {
        Rodada rodada = buscarRodada(rodadaId);

        if (rodada.getStatus() != StatusRodada.EM_ANDAMENTO) {
            throw new RegraNegocioException("A rodada só pode ser pausada se estiver em andamento.");
        }

        rodada.setStatus(StatusRodada.PAUSADA);
        rodada = rodadaRepository.save(rodada);

        auditoriaService.registrar(
                usuarioLogado,
                "PAUSAR_RODADA",
                "RODADA",
                rodada.getId(),
                "Rodada " + rodada.getNumeroRodada() + " pausada."
        );

        Map<String, Object> payload = Map.of(
                "type", "ROUND_PAUSED",
                "rodadaId", rodada.getId(),
                "sessaoId", rodada.getSessao().getId(),
                "numeroRodada", rodada.getNumeroRodada(),
                "status", rodada.getStatus().name()
        );

        bingoEventPublisher.publicarRodada(rodada.getId(), payload);
        bingoEventPublisher.publicarSessao(rodada.getSessao().getId(), payload);
        bingoEventPublisher.publicarTv(rodada.getSessao().getId(), payload);

        return toResponse(rodada);
    }

    @Transactional
    public RodadaResponse encerrarRodada(Long rodadaId, Usuario usuarioLogado) {
        Rodada rodada = buscarRodada(rodadaId);

        if (rodada.getStatus() != StatusRodada.EM_ANDAMENTO
                && rodada.getStatus() != StatusRodada.PAUSADA) {
            throw new RegraNegocioException(
                    "A rodada só pode ser encerrada se estiver EM_ANDAMENTO ou PAUSADA."
            );
        }

        rodada.setStatus(StatusRodada.FINALIZADA);
        rodada.setEncerrouEm(LocalDateTime.now());
        rodada = rodadaRepository.save(rodada);

        auditoriaService.registrar(
                usuarioLogado,
                "ENCERRAR_RODADA",
                "RODADA",
                rodada.getId(),
                "Rodada " + rodada.getNumeroRodada() + " encerrada."
        );

        Map<String, Object> payload = Map.of(
                "type", "ROUND_FINISHED",
                "rodadaId", rodada.getId(),
                "sessaoId", rodada.getSessao().getId(),
                "numeroRodada", rodada.getNumeroRodada(),
                "status", rodada.getStatus().name(),
                "timestamp", rodada.getEncerrouEm().toString()
        );

        bingoEventPublisher.publicarRodada(rodada.getId(), payload);
        bingoEventPublisher.publicarSessao(rodada.getSessao().getId(), payload);
        bingoEventPublisher.publicarTv(rodada.getSessao().getId(), payload);

        return toResponse(rodada);
    }

    @Transactional
    public RodadaResponse criarRodada(Long sessaoId, Usuario usuarioLogado) {
        SessaoBingo sessao = sessaoBingoRepository.findById(sessaoId)
                .orElseThrow(() -> new RegraNegocioException("Sessão não encontrada."));

        if (sessao.getStatus() == StatusSessao.FINALIZADA) {
            throw new RegraNegocioException("Não é possível criar rodada em sessão finalizada.");
        }

        Integer ultimoNumero = rodadaRepository
                .findTopBySessaoIdOrderByNumeroRodadaDesc(sessaoId)
                .map(Rodada::getNumeroRodada)
                .orElse(0);

        Rodada novaRodada = Rodada.builder()
                .sessao(sessao)
                .numeroRodada(ultimoNumero + 1)
                .status(StatusRodada.CRIADA)
                .build();

        novaRodada = rodadaRepository.save(novaRodada);

        auditoriaService.registrar(
                usuarioLogado,
                "CRIAR_RODADA",
                "RODADA",
                novaRodada.getId(),
                "Rodada " + novaRodada.getNumeroRodada() + " criada."
        );

        Map<String, Object> payload = Map.of(
                "type", "ROUND_CREATED",
                "rodadaId", novaRodada.getId(),
                "sessaoId", sessao.getId(),
                "numeroRodada", novaRodada.getNumeroRodada(),
                "status", novaRodada.getStatus().name()
        );

        bingoEventPublisher.publicarSessao(sessao.getId(), payload);
        bingoEventPublisher.publicarTv(sessao.getId(), payload);

        return toResponse(novaRodada);
    }

    @Transactional
    public Map<String, Object> sortearNumero(Long rodadaId, Usuario usuarioLogado) {
        Rodada rodada = buscarRodada(rodadaId);

        if (rodada.getStatus() != StatusRodada.EM_ANDAMENTO) {
            throw new RegraNegocioException("A rodada não está em andamento.");
        }

        long quantidadeSorteada = numeroSorteadoRepository.countByRodadaId(rodadaId);

        if (quantidadeSorteada >= 75) {
            throw new RegraNegocioException("Todos os 75 números já foram sorteados.");
        }

        List<Integer> disponiveis = new ArrayList<>();

        for (int numero = 1; numero <= 75; numero++) {
            if (!numeroSorteadoRepository.existsByRodadaIdAndNumero(rodadaId, numero)) {
                disponiveis.add(numero);
            }
        }

        if (disponiveis.isEmpty()) {
            throw new RegraNegocioException("Não há mais números disponíveis para sorteio.");
        }

        Integer numeroSorteado = disponiveis.get(new Random().nextInt(disponiveis.size()));
        Integer ordem = (int) quantidadeSorteada + 1;

        NumeroSorteado registro = NumeroSorteado.builder()
                .rodada(rodada)
                .numero(numeroSorteado)
                .ordem(ordem)
                .sorteadoEm(LocalDateTime.now())
                .sorteadoPor(usuarioLogado)
                .build();

        registro = numeroSorteadoRepository.save(registro);

        auditoriaService.registrar(
                usuarioLogado,
                "SORTEAR_NUMERO",
                "RODADA",
                rodada.getId(),
                "Número " + numeroSorteado + " sorteado na rodada " + rodada.getNumeroRodada() + "."
        );

        Map<String, Object> payload = Map.of(
                "type", "NUMBER_DRAWN",
                "id", registro.getId(),
                "numero", registro.getNumero(),
                "ordem", registro.getOrdem(),
                "rodadaId", rodada.getId(),
                "sessaoId", rodada.getSessao().getId(),
                "numeroRodada", rodada.getNumeroRodada(),
                "sorteadoEm", registro.getSorteadoEm().toString()
        );

        bingoEventPublisher.publicarRodada(rodada.getId(), payload);
        bingoEventPublisher.publicarSessao(rodada.getSessao().getId(), payload);
        bingoEventPublisher.publicarTv(rodada.getSessao().getId(), payload);

        return payload;
    }

    public Rodada buscarRodada(Long rodadaId) {
        return rodadaRepository.findById(rodadaId)
                .orElseThrow(() -> new RegraNegocioException("Rodada não encontrada."));
    }

    @Transactional(readOnly = true)
    public List<RodadaResponse> listarRodadasDaSessao(Long sessaoId) {
        return rodadaRepository
                .findBySessaoIdOrderByNumeroRodadaDesc(sessaoId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RodadaResponse buscarRodadaAtiva(Long sessaoId) {
        return rodadaRepository
                .findBySessaoIdAndStatus(sessaoId, StatusRodada.EM_ANDAMENTO)
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarNumerosDaRodada(Long rodadaId) {
        return numeroSorteadoRepository.findByRodadaIdOrderByOrdemAsc(rodadaId)
                .stream()
                .map(numero -> Map.<String, Object>of(
                        "id", numero.getId(),
                        "numero", numero.getNumero(),
                        "ordem", numero.getOrdem(),
                        "rodadaId", numero.getRodada().getId(),
                        "sorteadoEm", numero.getSorteadoEm().toString()
                ))
                .toList();
    }

    private RodadaResponse toResponse(Rodada rodada) {
        return RodadaResponse.builder()
                .id(rodada.getId())
                .numeroRodada(rodada.getNumeroRodada())
                .status(rodada.getStatus() != null ? rodada.getStatus().name() : "SEM_STATUS")
                .iniciouEm(rodada.getIniciouEm())
                .encerrouEm(rodada.getEncerrouEm())
                .sessaoId(rodada.getSessao() != null ? rodada.getSessao().getId() : null)
                .build();
    }
}
package com.empresa.bingo.service;

import com.empresa.bingo.dto.rodada.RodadaResponse;
import com.empresa.bingo.entity.Rodada;
import com.empresa.bingo.entity.SessaoBingo;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.enums.StatusRodada;
import com.empresa.bingo.enums.StatusSessao;
import com.empresa.bingo.exception.RegraNegocioException;
import com.empresa.bingo.repository.RodadaRepository;
import com.empresa.bingo.repository.SessaoBingoRepository;
import com.empresa.bingo.websocket.BingoEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RodadaService {

    private final RodadaRepository rodadaRepository;
    private final SessaoBingoRepository sessaoBingoRepository;
    private final AuditoriaService auditoriaService;
    private final BingoEventPublisher bingoEventPublisher;

    @Transactional
    public RodadaResponse iniciarRodada(Long rodadaId, Usuario usuarioLogado) {
        Rodada rodada = buscarRodada(rodadaId);
        SessaoBingo sessao = rodada.getSessao();

        if (sessao.getStatus() != StatusSessao.CRIADA
                && sessao.getStatus() != StatusSessao.EM_ANDAMENTO) {
            throw new RegraNegocioException(
                    "A sessão só pode iniciar rodada se estiver CRIADA ou EM_ANDAMENTO."
            );
        }

        if (rodada.getStatus() != StatusRodada.CRIADA
                && rodada.getStatus() != StatusRodada.AGUARDANDO
                && rodada.getStatus() != StatusRodada.PAUSADA) {
            throw new RegraNegocioException(
                    "A rodada só pode ser iniciada se estiver CRIADA, AGUARDANDO ou PAUSADA."
            );
        }

        boolean existeRodadaEmAndamento =
                rodadaRepository.existsBySessaoIdAndStatus(sessao.getId(), StatusRodada.EM_ANDAMENTO);

        if (existeRodadaEmAndamento && rodada.getStatus() != StatusRodada.PAUSADA) {
            throw new RegraNegocioException("Já existe outra rodada em andamento nessa sessão.");
        }

        if (sessao.getStatus() == StatusSessao.CRIADA) {
            sessao.setStatus(StatusSessao.EM_ANDAMENTO);
            if (sessao.getDataInicio() == null) {
                sessao.setDataInicio(LocalDateTime.now());
            }
            sessaoBingoRepository.save(sessao);
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

        bingoEventPublisher.publicarRodada(rodada.getId(), Map.of(
                "type", "ROUND_STARTED",
                "rodadaId", rodada.getId(),
                "sessaoId", sessao.getId(),
                "numeroRodada", rodada.getNumeroRodada(),
                "status", rodada.getStatus().name(),
                "timestamp", rodada.getIniciouEm().toString()
        ));

        bingoEventPublisher.publicarTv(sessao.getId(), Map.of(
                "type", "ROUND_STARTED",
                "rodadaId", rodada.getId(),
                "sessaoId", sessao.getId(),
                "numeroRodada", rodada.getNumeroRodada(),
                "status", rodada.getStatus().name(),
                "timestamp", rodada.getIniciouEm().toString()
        ));

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

        bingoEventPublisher.publicarRodada(rodada.getId(), Map.of(
                "type", "ROUND_PAUSED",
                "rodadaId", rodada.getId(),
                "sessaoId", rodada.getSessao().getId(),
                "numeroRodada", rodada.getNumeroRodada(),
                "status", rodada.getStatus().name()
        ));

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

        bingoEventPublisher.publicarRodada(rodada.getId(), Map.of(
                "type", "ROUND_FINISHED",
                "rodadaId", rodada.getId(),
                "sessaoId", rodada.getSessao().getId(),
                "numeroRodada", rodada.getNumeroRodada(),
                "status", rodada.getStatus().name(),
                "timestamp", rodada.getEncerrouEm().toString()
        ));

        return toResponse(rodada);
    }

    public Rodada buscarRodada(Long rodadaId) {
        return rodadaRepository.findById(rodadaId)
                .orElseThrow(() -> new RegraNegocioException("Rodada não encontrada."));
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

    @Transactional
public RodadaResponse criarRodada(Long sessaoId, Usuario usuarioLogado) {

    SessaoBingo sessao = sessaoBingoRepository.findById(sessaoId)
            .orElseThrow(() -> new RegraNegocioException("Sessão não encontrada."));

    if (sessao.getStatus() == StatusSessao.FINALIZADA) {
        throw new RegraNegocioException("Não é possível criar rodada em sessão finalizada.");
    }

    // pega o último número da rodada
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

    return toResponse(novaRodada);
}

// =========================
// NOVOS MÉTODOS
// =========================

@Transactional(readOnly = true)
public java.util.List<RodadaResponse> listarRodadasDaSessao(Long sessaoId) {
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

}
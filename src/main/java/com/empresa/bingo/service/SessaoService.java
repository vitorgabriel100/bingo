package com.empresa.bingo.service;

import com.empresa.bingo.dto.sessao.CriarSessaoRequest;
import com.empresa.bingo.dto.sessao.SessaoResponse;
import com.empresa.bingo.entity.Rodada;
import com.empresa.bingo.entity.Sala;
import com.empresa.bingo.entity.SessaoBingo;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.enums.StatusRodada;
import com.empresa.bingo.enums.StatusSessao;
import com.empresa.bingo.exception.RegraNegocioException;
import com.empresa.bingo.repository.RodadaRepository;
import com.empresa.bingo.repository.SalaRepository;
import com.empresa.bingo.repository.SessaoBingoRepository;
import com.empresa.bingo.websocket.BingoEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class SessaoService {

    private final SessaoBingoRepository sessaoBingoRepository;
    private final SalaRepository salaRepository;
    private final RodadaRepository rodadaRepository;
    private final AuditoriaService auditoriaService;
    private final BingoEventPublisher bingoEventPublisher;

    @Transactional
    public SessaoResponse criarSessao(CriarSessaoRequest request, Usuario usuarioLogado) {
        Sala sala = salaRepository.findById(request.getSalaId())
                .orElseThrow(() -> new RegraNegocioException("Sala não encontrada."));

        if (!Boolean.TRUE.equals(sala.getAtiva())) {
            throw new RegraNegocioException("A sala informada está inativa.");
        }

        SessaoBingo sessao = SessaoBingo.builder()
                .sala(sala)
                .descricao(request.getDescricao())
                .status(StatusSessao.AGENDADA)
                .criadaPor(usuarioLogado)
                .build();

        sessao = sessaoBingoRepository.save(sessao);

        for (int i = 1; i <= 20; i++) {
            Rodada rodada = Rodada.builder()
                    .sessao(sessao)
                    .numeroRodada(i)
                    .status(StatusRodada.AGUARDANDO)
                    .build();

            rodadaRepository.save(rodada);
        }

        auditoriaService.registrar(
                usuarioLogado,
                "CRIAR_SESSAO",
                "SESSAO",
                sessao.getId(),
                "Sessão criada com 20 rodadas. Sala: " + sala.getNome()
        );

        bingoEventPublisher.publicarSessao(sessao.getId(), Map.of(
                "type", "SESSION_CREATED",
                "sessaoId", sessao.getId(),
                "descricao", sessao.getDescricao(),
                "status", sessao.getStatus().name()
        ));

        return toResponse(sessao);
    }

    @Transactional
    public SessaoResponse iniciarSessao(Long sessaoId, Usuario usuarioLogado) {
        SessaoBingo sessao = buscarSessao(sessaoId);

        if (sessao.getStatus() != StatusSessao.AGENDADA && sessao.getStatus() != StatusSessao.PAUSADA) {
            throw new RegraNegocioException("A sessão só pode ser iniciada se estiver AGENDADA ou PAUSADA.");
        }

        sessao.setStatus(StatusSessao.EM_ANDAMENTO);

        if (sessao.getDataInicio() == null) {
            sessao.setDataInicio(java.time.LocalDateTime.now());
        }

        sessao = sessaoBingoRepository.save(sessao);

        auditoriaService.registrar(
                usuarioLogado,
                "INICIAR_SESSAO",
                "SESSAO",
                sessao.getId(),
                "Sessão iniciada."
        );

        bingoEventPublisher.publicarSessao(sessao.getId(), Map.of(
                "type", "SESSION_STARTED",
                "sessaoId", sessao.getId(),
                "status", sessao.getStatus().name(),
                "timestamp", sessao.getDataInicio().toString()
        ));

        return toResponse(sessao);
    }

    @Transactional
    public SessaoResponse pausarSessao(Long sessaoId, Usuario usuarioLogado) {
        SessaoBingo sessao = buscarSessao(sessaoId);

        if (sessao.getStatus() != StatusSessao.EM_ANDAMENTO) {
            throw new RegraNegocioException("A sessão só pode ser pausada se estiver em andamento.");
        }

        sessao.setStatus(StatusSessao.PAUSADA);
        sessao = sessaoBingoRepository.save(sessao);

        auditoriaService.registrar(
                usuarioLogado,
                "PAUSAR_SESSAO",
                "SESSAO",
                sessao.getId(),
                "Sessão pausada."
        );

        bingoEventPublisher.publicarSessao(sessao.getId(), Map.of(
                "type", "SESSION_PAUSED",
                "sessaoId", sessao.getId(),
                "status", sessao.getStatus().name()
        ));

        return toResponse(sessao);
    }

    @Transactional
    public SessaoResponse encerrarSessao(Long sessaoId, Usuario usuarioLogado) {
        SessaoBingo sessao = buscarSessao(sessaoId);

        if (sessao.getStatus() == StatusSessao.FINALIZADA || sessao.getStatus() == StatusSessao.CANCELADA) {
            throw new RegraNegocioException("A sessão já está encerrada ou cancelada.");
        }

        sessao.setStatus(StatusSessao.FINALIZADA);
        sessao.setDataFim(java.time.LocalDateTime.now());
        sessao = sessaoBingoRepository.save(sessao);

        auditoriaService.registrar(
                usuarioLogado,
                "ENCERRAR_SESSAO",
                "SESSAO",
                sessao.getId(),
                "Sessão encerrada."
        );

        bingoEventPublisher.publicarSessao(sessao.getId(), Map.of(
                "type", "SESSION_FINISHED",
                "sessaoId", sessao.getId(),
                "status", sessao.getStatus().name(),
                "timestamp", sessao.getDataFim().toString()
        ));

        return toResponse(sessao);
    }

    public SessaoBingo buscarSessao(Long sessaoId) {
        return sessaoBingoRepository.findById(sessaoId)
                .orElseThrow(() -> new RegraNegocioException("Sessão não encontrada."));
    }

    private SessaoResponse toResponse(SessaoBingo sessao) {
        return SessaoResponse.builder()
                .id(sessao.getId())
                .descricao(sessao.getDescricao())
                .status(sessao.getStatus().name())
                .dataInicio(sessao.getDataInicio())
                .dataFim(sessao.getDataFim())
                .salaId(sessao.getSala().getId())
                .salaNome(sessao.getSala().getNome())
                .build();
    }
}
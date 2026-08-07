package com.empresa.bingo.service;

import com.empresa.bingo.dto.participante.CadastrarParticipanteRequest;
import com.empresa.bingo.dto.participante.ParticipanteResponse;
import com.empresa.bingo.entity.Participante;
import com.empresa.bingo.entity.Sala;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.exception.RegraNegocioException;
import com.empresa.bingo.repository.ParticipanteRepository;
import com.empresa.bingo.repository.SalaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ParticipanteService {

    private final ParticipanteRepository participanteRepository;
    private final SalaRepository salaRepository;
    private final SalaAcessoService salaAcessoService;

    @Transactional
    public ParticipanteResponse cadastrarPublico(
            String slug,
            CadastrarParticipanteRequest request
    ) {
        Sala sala = salaRepository.findBySlugIgnoreCase(slug)
                .orElseThrow(() -> new RegraNegocioException("Sala não encontrada."));

        if (!Boolean.TRUE.equals(sala.getAtiva())) {
            throw new RegraNegocioException("Esta sala não está recebendo cadastros.");
        }

        return cadastrarNaSala(sala, request);
    }

    @Transactional
    public ParticipanteResponse cadastrar(
            Long salaId,
            CadastrarParticipanteRequest request,
            Usuario usuarioLogado
    ) {
        salaAcessoService.exigirAcesso(usuarioLogado, salaId);

        Sala sala = salaRepository.findById(salaId)
                .orElseThrow(() -> new RegraNegocioException("Sala não encontrada."));

        if (!Boolean.TRUE.equals(sala.getAtiva())) {
            throw new RegraNegocioException("A sala informada está inativa.");
        }

        return cadastrarNaSala(sala, request);
    }

    private ParticipanteResponse cadastrarNaSala(
            Sala sala,
            CadastrarParticipanteRequest request
    ) {

        String telefone = normalizarTelefone(request.getTelefone());

        if (participanteRepository.existsBySalaIdAndTelefone(sala.getId(), telefone)) {
            throw new RegraNegocioException("Este telefone já está cadastrado nesta sala.");
        }

        Participante participante = Participante.builder()
                .sala(sala)
                .nomeCompleto(request.getNomeCompleto().trim())
                .apelido(request.getApelido().trim())
                .telefone(telefone)
                .ativo(true)
                .build();

        return toResponse(participanteRepository.save(participante));
    }

    @Transactional(readOnly = true)
    public List<ParticipanteResponse> listar(Long salaId, Usuario usuarioLogado) {
        salaAcessoService.exigirAcesso(usuarioLogado, salaId);

        return participanteRepository.findBySalaIdOrderByCriadoEmDesc(salaId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private String normalizarTelefone(String telefoneInformado) {
        String telefone = telefoneInformado == null
                ? ""
                : telefoneInformado.replaceAll("\\D", "");

        if (telefone.length() < 10 || telefone.length() > 13) {
            throw new RegraNegocioException("Informe um telefone válido com DDD.");
        }

        return telefone;
    }

    private ParticipanteResponse toResponse(Participante participante) {
        return ParticipanteResponse.builder()
                .id(participante.getId())
                .salaId(participante.getSala().getId())
                .salaNome(participante.getSala().getNome())
                .nomeCompleto(participante.getNomeCompleto())
                .apelido(participante.getApelido())
                .telefone(participante.getTelefone())
                .ativo(participante.getAtivo())
                .criadoEm(participante.getCriadoEm())
                .build();
    }
}

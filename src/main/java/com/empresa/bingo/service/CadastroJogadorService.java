package com.empresa.bingo.service;

import com.empresa.bingo.dto.compra.CadastroJogadorRequest;
import com.empresa.bingo.entity.*;
import com.empresa.bingo.enums.NomePerfil;
import com.empresa.bingo.exception.RegraNegocioException;
import com.empresa.bingo.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CadastroJogadorService {

    private final SalaRepository salaRepository;
    private final UsuarioRepository usuarioRepository;
    private final ParticipanteRepository participanteRepository;
    private final PerfilRepository perfilRepository;
    private final UsuarioSalaRepository usuarioSalaRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void cadastrar(CadastroJogadorRequest request) {
        Sala sala = salaRepository.findById(request.getSalaId())
                .orElseThrow(() -> new RegraNegocioException("Sala não encontrada."));
        if (!Boolean.TRUE.equals(sala.getAtiva())) {
            throw new RegraNegocioException("Esta sala não está aceitando cadastros.");
        }

        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        String telefone = request.getTelefone().replaceAll("\\D", "");
        if (telefone.length() < 10 || telefone.length() > 13) {
            throw new RegraNegocioException("Informe um telefone válido com DDD.");
        }
        if (usuarioRepository.existsByEmail(email)) {
            throw new RegraNegocioException("Este e-mail já está cadastrado.");
        }
        if (participanteRepository.existsBySalaIdAndTelefone(sala.getId(), telefone)) {
            throw new RegraNegocioException("Este telefone já está cadastrado nesta sala.");
        }

        Perfil jogador = perfilRepository.findByNome(NomePerfil.JOGADOR)
                .orElseThrow(() -> new RegraNegocioException("Perfil de jogador não configurado."));

        Usuario usuario = usuarioRepository.save(Usuario.builder()
                .nome(request.getNomeCompleto().trim())
                .email(email)
                .senhaHash(passwordEncoder.encode(request.getSenha()))
                .perfil(jogador)
                .ativo(true)
                .build());

        usuarioSalaRepository.save(UsuarioSala.builder()
                .usuario(usuario)
                .sala(sala)
                .ativo(true)
                .build());

        participanteRepository.save(Participante.builder()
                .sala(sala)
                .usuario(usuario)
                .nomeCompleto(request.getNomeCompleto().trim())
                .apelido(request.getApelido().trim())
                .telefone(telefone)
                .ativo(true)
                .build());
    }
}

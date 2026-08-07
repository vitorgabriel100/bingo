package com.empresa.bingo.service;

import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.enums.NomePerfil;
import com.empresa.bingo.exception.RegraNegocioException;
import com.empresa.bingo.repository.UsuarioSalaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SalaAcessoService {

    private final UsuarioSalaRepository usuarioSalaRepository;

    public void exigirAcesso(Usuario usuario, Long salaId) {
        if (usuario.getPerfil().getNome() == NomePerfil.ADMIN) {
            return;
        }

        boolean possuiAcesso = usuarioSalaRepository
                .existsByUsuarioIdAndSalaIdAndAtivoTrue(usuario.getId(), salaId);

        if (!possuiAcesso) {
            throw new RegraNegocioException("Usuário sem acesso a esta sala.");
        }
    }
}

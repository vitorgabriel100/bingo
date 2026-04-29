package com.empresa.bingo.service;

import com.empresa.bingo.dto.auth.LoginRequest;
import com.empresa.bingo.dto.auth.LoginResponse;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.enums.NomePerfil;
import com.empresa.bingo.enums.StatusAssinatura;
import com.empresa.bingo.model.Assinatura;
import com.empresa.bingo.repository.AssinaturaRepository;
import com.empresa.bingo.repository.UsuarioRepository;
import com.empresa.bingo.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final AssinaturaRepository assinaturaRepository;
    private final JwtService jwtService;
    private final AuditoriaService auditoriaService;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        Usuario usuario = usuarioRepository.findWithPerfilAndClienteByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Credenciais inválidas."));

        if (!Boolean.TRUE.equals(usuario.getAtivo())) {
            throw new LockedException("Usuário inativo.");
        }

        if (!passwordEncoder.matches(request.getSenha(), usuario.getSenhaHash())) {
            throw new BadCredentialsException("Credenciais inválidas.");
        }

        String perfilNome = usuario.getPerfil().getNome().name();

        Long clienteId = null;
        String clienteNome = null;
        String assinaturaStatus = null;
        LocalDate assinaturaVencimento = null;
        Boolean assinaturaAtiva = true;

        boolean usuarioAdmin = usuario.getPerfil().getNome() == NomePerfil.ADMIN;

        if (!usuarioAdmin) {
            if (usuario.getCliente() == null) {
                throw new LockedException("Usuário não vinculado a nenhum cliente.");
            }

            clienteId = usuario.getCliente().getId();
            clienteNome = usuario.getCliente().getNome();

            if (!Boolean.TRUE.equals(usuario.getCliente().getAtivo())) {
                throw new LockedException("Cliente inativo.");
            }

            Assinatura assinatura = assinaturaRepository.findByCliente(usuario.getCliente())
                    .orElseThrow(() -> new LockedException("Cliente sem assinatura cadastrada."));

            assinaturaVencimento = assinatura.getDataVencimento();

            boolean vencidaPorData = assinatura.getDataVencimento() != null
                    && assinatura.getDataVencimento().isBefore(LocalDate.now());

            if (vencidaPorData && assinatura.getStatus() != StatusAssinatura.VENCIDA) {
                assinatura.setStatus(StatusAssinatura.VENCIDA);
                assinaturaRepository.save(assinatura);
            }

            assinaturaStatus = assinatura.getStatus().name();

            assinaturaAtiva =
                    assinatura.getStatus() == StatusAssinatura.ATIVA
                            || assinatura.getStatus() == StatusAssinatura.TESTE;

            if (vencidaPorData || !assinaturaAtiva) {
                throw new LockedException("Assinatura vencida ou inativa.");
            }
        }

        UserDetails userDetails = org.springframework.security.core.userdetails.User
                .withUsername(usuario.getEmail())
                .password(usuario.getSenhaHash())
                .authorities("ROLE_" + perfilNome)
                .build();

        String token = jwtService.generateToken(userDetails);

        return LoginResponse.builder()
                .token(token)
                .tipo("Bearer")
                .usuarioId(usuario.getId())
                .nome(usuario.getNome())
                .email(usuario.getEmail())
                .perfil(perfilNome)
                .clienteId(clienteId)
                .clienteNome(clienteNome)
                .assinaturaStatus(assinaturaStatus)
                .assinaturaVencimento(assinaturaVencimento)
                .assinaturaAtiva(assinaturaAtiva)
                .build();
    }
}
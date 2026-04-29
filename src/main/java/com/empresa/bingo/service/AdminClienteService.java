package com.empresa.bingo.service;

import com.empresa.bingo.dto.CriarClienteRequest;
import com.empresa.bingo.entity.Perfil;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.enums.NomePerfil;
import com.empresa.bingo.enums.StatusAssinatura;
import com.empresa.bingo.model.Assinatura;
import com.empresa.bingo.model.Cliente;
import com.empresa.bingo.repository.AssinaturaRepository;
import com.empresa.bingo.repository.ClienteRepository;
import com.empresa.bingo.repository.PerfilRepository;
import com.empresa.bingo.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminClienteService {

    private final ClienteRepository clienteRepository;
    private final UsuarioRepository usuarioRepository;
    private final PerfilRepository perfilRepository;
    private final AssinaturaRepository assinaturaRepository;
    private final PasswordEncoder passwordEncoder;

    public Cliente criarClienteComUsuarioEAssinatura(CriarClienteRequest request) {
        if (clienteRepository.existsByEmail(request.getEmailCliente())) {
            throw new RuntimeException("Já existe um cliente com este e-mail.");
        }

        if (usuarioRepository.existsByEmail(request.getEmailUsuario())) {
            throw new RuntimeException("Já existe um usuário com este e-mail.");
        }

        Cliente cliente = Cliente.builder()
                .nome(request.getNomeCliente())
                .responsavel(request.getResponsavel())
                .email(request.getEmailCliente())
                .telefone(request.getTelefone())
                .ativo(true)
                .criadoEm(LocalDateTime.now())
                .build();

        cliente = clienteRepository.save(cliente);

        NomePerfil nomePerfil = request.getPerfilUsuario() != null
                ? request.getPerfilUsuario()
                : NomePerfil.OPERADOR;

        Perfil perfil = perfilRepository.findByNome(nomePerfil)
                .orElseThrow(() -> new RuntimeException("Perfil não encontrado: " + nomePerfil));

        Usuario usuario = Usuario.builder()
                .nome(request.getNomeUsuario())
                .email(request.getEmailUsuario())
                .senhaHash(passwordEncoder.encode(request.getSenhaUsuario()))
                .perfil(perfil)
                .ativo(true)
                .cliente(cliente)
                .criadoEm(LocalDateTime.now())
                .build();

        usuarioRepository.save(usuario);

        Assinatura assinatura = Assinatura.builder()
                .cliente(cliente)
                .dataInicio(LocalDate.now())
                .dataVencimento(request.getDataVencimento())
                .valorMensal(request.getValorMensal())
                .status(StatusAssinatura.ATIVA)
                .build();

        assinaturaRepository.save(assinatura);

        return cliente;
    }
}
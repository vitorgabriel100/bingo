package com.empresa.bingo.config;

import com.empresa.bingo.entity.Perfil;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.model.Cliente;
import com.empresa.bingo.repository.UsuarioRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;

@Configuration
@RequiredArgsConstructor
public class DemoUserConfig implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final EntityManager entityManager;

    @Override
    public void run(String... args) {
        criarUsuarioDemo(
                "Administrador Demo",
                "admin@demo.com",
                "Admin@123",
                1L,
                1L
        );

        criarUsuarioDemo(
                "Operador Demo",
                "operador@demo.com",
                "Operador@123",
                2L,
                1L
        );

        criarUsuarioDemo(
                "TV Demo",
                "tv@demo.com",
                "Tv@123",
                3L,
                1L
        );
    }

    private void criarUsuarioDemo(
            String nome,
            String email,
            String senha,
            Long perfilId,
            Long clienteId
    ) {
        boolean existe = usuarioRepository.existsByEmail(email);

        if (existe) {
            return;
        }

        Perfil perfil = entityManager.getReference(Perfil.class, perfilId);
        Cliente cliente = entityManager.getReference(Cliente.class, clienteId);

        Usuario usuario = new Usuario();
        usuario.setNome(nome);
        usuario.setEmail(email);
        usuario.setSenhaHash(passwordEncoder.encode(senha));
        usuario.setPerfil(perfil);
        usuario.setCliente(cliente);
        usuario.setAtivo(true);
        usuario.setCriadoEm(LocalDateTime.now());

        usuarioRepository.save(usuario);
    }
}
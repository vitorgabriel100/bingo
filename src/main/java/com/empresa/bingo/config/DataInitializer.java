package com.empresa.bingo.config;

import com.empresa.bingo.entity.Perfil;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.enums.NomePerfil;
import com.empresa.bingo.repository.PerfilRepository;
import com.empresa.bingo.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final PerfilRepository perfilRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        criarPerfilSeNaoExistir(NomePerfil.ADMIN);
        criarPerfilSeNaoExistir(NomePerfil.GERENTE);
        criarPerfilSeNaoExistir(NomePerfil.OPERADOR);
        criarPerfilSeNaoExistir(NomePerfil.JOGADOR);

        if (usuarioRepository.findByEmail("admin@bingo.com").isEmpty()) {
            Perfil perfilAdmin = perfilRepository.findByNome(NomePerfil.ADMIN)
                    .orElseThrow();

            Usuario admin = Usuario.builder()
                    .nome("Administrador")
                    .email("admin@bingo.com")
                    .senhaHash(passwordEncoder.encode("123456"))
                    .perfil(perfilAdmin)
                    .ativo(true)
                    .build();

            usuarioRepository.save(admin);
        }
    }

    private void criarPerfilSeNaoExistir(NomePerfil nomePerfil) {
        if (perfilRepository.findByNome(nomePerfil).isEmpty()) {
            perfilRepository.save(
                    Perfil.builder()
                            .nome(nomePerfil)
                            .build()
            );
        }
    }
}
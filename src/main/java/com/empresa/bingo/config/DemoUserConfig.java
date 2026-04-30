/* package com.empresa.bingo.config;

import com.empresa.bingo.entity.Perfil;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.model.Cliente;
import com.empresa.bingo.repository.UsuarioRepository;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
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
@Transactional
public void run(String... args) {

    Cliente cliente = buscarOuCriarClienteDemo();

    Perfil admin = buscarOuCriarPerfil(1L, "ADMIN");
    Perfil operador = buscarOuCriarPerfil(2L, "OPERADOR");
    Perfil tv = buscarOuCriarPerfil(3L, "TV");

    criarUsuarioDemo("Administrador Demo", "admin@demo.com", "Admin@123", admin, cliente);
    criarUsuarioDemo("Operador Demo", "operador@demo.com", "Operador@123", operador, cliente);
    criarUsuarioDemo("TV Demo", "tv@demo.com", "Tv@123", tv, cliente);
}

    private Cliente buscarOuCriarClienteDemo() {
        Cliente cliente = entityManager.find(Cliente.class, 1L);

        if (cliente != null) {
            return cliente;
        }

        cliente = new Cliente();
        cliente.setNome("Cliente Demo");
        cliente.setAtivo(true);
        cliente.setCriadoEm(LocalDateTime.now());

        entityManager.persist(cliente);
        entityManager.flush();

        return cliente;
    }

    private Perfil buscarOuCriarPerfil(Long id, String nome) {
    Perfil perfil = entityManager.find(Perfil.class, id);

    if (perfil != null) {
        return perfil;
    }

    perfil = new Perfil();
    perfil.setId(id);
    perfil.setNome(nome);

    entityManager.persist(perfil);
    entityManager.flush();

    return perfil;
}

    private void criarUsuarioDemo(
        String nome,
        String email,
        String senha,
        Perfil perfil,
        Cliente cliente
        usuario.setPerfil(perfil);
) {
        if (usuarioRepository.existsByEmail(email)) {
            return;
        }

        Perfil perfil = entityManager.getReference(Perfil.class, perfilId);

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
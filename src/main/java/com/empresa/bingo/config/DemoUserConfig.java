package com.empresa.bingo.config;

import com.empresa.bingo.entity.Perfil;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.enums.NomePerfil;
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

        Cliente cliente = buscarOuCriarCliente();

        Perfil admin = buscarOuCriarPerfil(NomePerfil.ADMIN);
        Perfil operador = buscarOuCriarPerfil(NomePerfil.OPERADOR);
        Perfil tv = buscarOuCriarPerfil(NomePerfil.OPERADOR);

        criarUsuario("Administrador", "admin@demo.com", "123456", admin, cliente);
        criarUsuario("Operador", "operador@demo.com", "123456", operador, cliente);
        criarUsuario("TV", "tv@demo.com", "123456", tv, cliente);
    }

    private Cliente buscarOuCriarCliente() {
        var query = entityManager.createQuery("SELECT c FROM Cliente c", Cliente.class);
        var lista = query.getResultList();

        if (!lista.isEmpty()) return lista.get(0);

        Cliente cliente = new Cliente();
        cliente.setNome("Cliente Demo");
        cliente.setResponsavel("Admin");
        cliente.setEmail("cliente@demo.com");
        cliente.setTelefone("000000000");
        cliente.setAtivo(true);
        cliente.setCriadoEm(LocalDateTime.now());

        entityManager.persist(cliente);
        return cliente;
    }

    private Perfil buscarOuCriarPerfil(NomePerfil nomePerfil) {
        var query = entityManager.createQuery(
                "SELECT p FROM Perfil p WHERE p.nome = :nome",
                Perfil.class
        );
        query.setParameter("nome", nomePerfil);

        var lista = query.getResultList();

        if (!lista.isEmpty()) return lista.get(0);

        Perfil perfil = new Perfil();
        perfil.setNome(nomePerfil);

        entityManager.persist(perfil);
        return perfil;
    }

    private void criarUsuario(
            String nome,
            String email,
            String senha,
            Perfil perfil,
            Cliente cliente
    ) {
        if (usuarioRepository.existsByEmail(email)) return;

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
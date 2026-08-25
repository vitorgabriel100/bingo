package com.empresa.bingo.service;

import com.empresa.bingo.dto.cartela.GerarCartelasRequest;
import com.empresa.bingo.dto.sala.CriarSalaRequest;
import com.empresa.bingo.dto.sala.CriarAcessoSalaRequest;
import com.empresa.bingo.dto.sala.AcessoSalaResponse;
import com.empresa.bingo.dto.sala.SalaResponse;
import com.empresa.bingo.entity.Perfil;
import com.empresa.bingo.entity.Sala;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.entity.UsuarioSala;
import com.empresa.bingo.enums.NomePerfil;
import com.empresa.bingo.exception.RegraNegocioException;
import com.empresa.bingo.repository.SalaRepository;
import com.empresa.bingo.repository.PerfilRepository;
import com.empresa.bingo.repository.UsuarioRepository;
import com.empresa.bingo.repository.UsuarioSalaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.text.Normalizer;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class SalaService {

    private final SalaRepository salaRepository;
    private final UsuarioRepository usuarioRepository;
    private final UsuarioSalaRepository usuarioSalaRepository;
    private final CartelaService cartelaService;
    private final PerfilRepository perfilRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public SalaResponse criar(CriarSalaRequest request) {
        int serie = valorOuPadrao(request.getSerieCartela(), 8);
        int cartelaInicial = valorOuPadrao(request.getCartelaInicial(), 701);
        int cartelaFinal = valorOuPadrao(request.getCartelaFinal(), 800);

        validarConfiguracaoCartelas(serie, cartelaInicial, cartelaFinal);

        String baseSlug = request.getSlug() == null || request.getSlug().isBlank()
                ? request.getNome()
                : request.getSlug();
        String slug = gerarSlugDisponivel(baseSlug);

        Sala sala = Sala.builder()
                .nome(request.getNome().trim())
                .slug(slug)
                .local(limparTextoOpcional(request.getLocal()))
                .serieCartela(serie)
                .cartelaInicial(cartelaInicial)
                .cartelaFinal(cartelaFinal)
                .ativa(true)
                .build();

        sala = salaRepository.save(sala);

        GerarCartelasRequest gerarRequest = new GerarCartelasRequest();
        gerarRequest.setSerie(serie);
        gerarRequest.setNumeroInicial(cartelaInicial);
        gerarRequest.setNumeroFinal(cartelaFinal);
        cartelaService.gerarParaSala(sala.getId(), gerarRequest);

        return toResponse(sala);
    }

    @Transactional(readOnly = true)
    public List<SalaResponse> listar(Usuario usuarioLogado) {
        if (usuarioLogado.getPerfil().getNome() == NomePerfil.ADMIN) {
            return salaRepository.findAll().stream()
                    .map(this::toResponse)
                    .toList();
        }

        return usuarioSalaRepository
                .findByUsuarioIdAndAtivoTrueOrderBySalaNomeAsc(usuarioLogado.getId())
                .stream()
                .map(UsuarioSala::getSala)
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SalaResponse buscarPublica(String slug) {
        Sala sala = salaRepository.findBySlugIgnoreCase(slug)
                .orElseThrow(() -> new RegraNegocioException("Sala não encontrada."));

        if (!Boolean.TRUE.equals(sala.getAtiva())) {
            throw new RegraNegocioException("Esta sala está inativa.");
        }

        return toResponse(sala);
    }

    @Transactional(readOnly = true)
    public List<SalaResponse> listarPublicas() {
        return salaRepository.findAll().stream()
                .filter(sala -> Boolean.TRUE.equals(sala.getAtiva()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void vincularUsuario(Long salaId, Long usuarioId) {
        Sala sala = salaRepository.findById(salaId)
                .orElseThrow(() -> new RegraNegocioException("Sala não encontrada."));
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RegraNegocioException("Usuário não encontrado."));

        UsuarioSala vinculo = usuarioSalaRepository
                .findByUsuarioIdAndSalaId(usuarioId, salaId)
                .orElseGet(() -> UsuarioSala.builder()
                        .usuario(usuario)
                        .sala(sala)
                        .build());

        vinculo.setAtivo(true);
        usuarioSalaRepository.save(vinculo);
    }

    @Transactional
    public AcessoSalaResponse criarAcesso(Long salaId, CriarAcessoSalaRequest request) {
        Sala sala = salaRepository.findById(salaId)
                .orElseThrow(() -> new RegraNegocioException("Sala não encontrada."));

        NomePerfil nomePerfil = request.getPerfil() == null
                ? NomePerfil.OPERADOR
                : request.getPerfil();

        if (nomePerfil != NomePerfil.OPERADOR && nomePerfil != NomePerfil.GERENTE) {
            throw new RegraNegocioException("O acesso da sala deve ser OPERADOR ou GERENTE.");
        }

        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);
        boolean usuarioCriado = usuario == null;

        if (usuarioCriado) {
            Perfil perfil = perfilRepository.findByNome(nomePerfil)
                    .orElseThrow(() -> new RegraNegocioException("Perfil não encontrado: " + nomePerfil));

            usuario = Usuario.builder()
                    .nome(request.getNome().trim())
                    .email(email)
                    .senhaHash(passwordEncoder.encode(request.getSenha()))
                    .perfil(perfil)
                    .ativo(true)
                    .build();
            usuario = usuarioRepository.save(usuario);
        }

        vincularUsuario(salaId, usuario.getId());

        return AcessoSalaResponse.builder()
                .usuarioId(usuario.getId())
                .salaId(sala.getId())
                .nome(usuario.getNome())
                .email(usuario.getEmail())
                .perfil(usuario.getPerfil().getNome().name())
                .usuarioCriado(usuarioCriado)
                .build();
    }

    private int valorOuPadrao(Integer valor, int padrao) {
        return valor == null ? padrao : valor;
    }

    private void validarConfiguracaoCartelas(int serie, int inicial, int numeroFinal) {
        if (serie < 1) {
            throw new RegraNegocioException("Série deve ser maior que zero.");
        }
        if (inicial < 1 || numeroFinal < inicial) {
            throw new RegraNegocioException("Intervalo de cartelas inválido.");
        }
        if ((long) numeroFinal - inicial + 1 > 1000) {
            throw new RegraNegocioException("É permitido gerar no máximo 1000 cartelas por sala.");
        }
    }

    private String gerarSlugDisponivel(String valor) {
        String slugBase = normalizarSlug(valor);
        String slug = slugBase;
        int sufixo = 2;

        while (salaRepository.existsBySlugIgnoreCase(slug)) {
            slug = slugBase + "-" + sufixo++;
        }

        return slug;
    }

    private String normalizarSlug(String valor) {
        String semAcentos = Normalizer.normalize(valor.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        String slug = semAcentos
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");

        if (slug.isBlank()) {
            throw new RegraNegocioException("Não foi possível gerar o endereço da sala.");
        }

        return slug.length() <= 100 ? slug : slug.substring(0, 100).replaceAll("-$", "");
    }

    private String limparTextoOpcional(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }

    private SalaResponse toResponse(Sala sala) {
        return SalaResponse.builder()
                .id(sala.getId())
                .nome(sala.getNome())
                .slug(sala.getSlug())
                .local(sala.getLocal())
                .serieCartela(sala.getSerieCartela())
                .cartelaInicial(sala.getCartelaInicial())
                .cartelaFinal(sala.getCartelaFinal())
                .ativa(sala.getAtiva())
                .linkCadastro("/sala/" + sala.getSlug() + "/cadastro")
                .build();
    }
}

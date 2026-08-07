package com.empresa.bingo.service;

import com.empresa.bingo.dto.cartela.CartelaResponse;
import com.empresa.bingo.dto.cartela.GeracaoCartelasResponse;
import com.empresa.bingo.dto.cartela.GerarCartelasRequest;
import com.empresa.bingo.entity.Cartela;
import com.empresa.bingo.entity.Sala;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.exception.RegraNegocioException;
import com.empresa.bingo.repository.CartelaRepository;
import com.empresa.bingo.repository.SalaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CartelaService {

    private static final int LIMITE_CARTELAS_POR_GERACAO = 1000;

    private final CartelaRepository cartelaRepository;
    private final SalaRepository salaRepository;
    private final CartelaGerador cartelaGerador;
    private final SalaAcessoService salaAcessoService;

    @Transactional
    public GeracaoCartelasResponse gerar(
            Long salaId,
            GerarCartelasRequest request,
            Usuario usuarioLogado
    ) {
        salaAcessoService.exigirAcesso(usuarioLogado, salaId);
        return gerarParaSala(salaId, request);
    }

    @Transactional
    public GeracaoCartelasResponse gerarParaSala(Long salaId, GerarCartelasRequest request) {
        Sala sala = buscarSalaAtiva(salaId);
        validarFaixa(request);

        Set<Integer> existentes = new HashSet<>(
                cartelaRepository
                        .findBySalaIdAndSerieAndNumeroBetween(
                                salaId,
                                request.getSerie(),
                                request.getNumeroInicial(),
                                request.getNumeroFinal()
                        )
                        .stream()
                        .map(Cartela::getNumero)
                        .toList()
        );

        List<Cartela> novasCartelas = new ArrayList<>();

        for (int numeroCartela = request.getNumeroInicial();
             numeroCartela <= request.getNumeroFinal();
             numeroCartela++) {
            if (existentes.contains(numeroCartela)) {
                continue;
            }

            Cartela cartela = Cartela.builder()
                    .sala(sala)
                    .serie(request.getSerie())
                    .numero(numeroCartela)
                    .ativa(true)
                    .build();

            List<Integer> grade = cartelaGerador.gerarGrade(request.getSerie(), numeroCartela);

            for (int posicao = 0; posicao < grade.size(); posicao++) {
                Integer numero = grade.get(posicao);
                if (numero != null) {
                    cartela.adicionarNumero(posicao, numero);
                }
            }

            novasCartelas.add(cartela);
        }

        cartelaRepository.saveAll(novasCartelas);

        sala.setSerieCartela(request.getSerie());
        sala.setCartelaInicial(request.getNumeroInicial());
        sala.setCartelaFinal(request.getNumeroFinal());
        salaRepository.save(sala);

        long total = cartelaRepository.countBySalaIdAndSerie(salaId, request.getSerie());

        return GeracaoCartelasResponse.builder()
                .salaId(salaId)
                .serie(request.getSerie())
                .numeroInicial(request.getNumeroInicial())
                .numeroFinal(request.getNumeroFinal())
                .cartelasCriadas(novasCartelas.size())
                .totalCartelasNaSerie(total)
                .build();
    }

    @Transactional(readOnly = true)
    public List<CartelaResponse> listar(Long salaId, Integer serie, Usuario usuarioLogado) {
        salaAcessoService.exigirAcesso(usuarioLogado, salaId);
        buscarSalaAtiva(salaId);

        return cartelaRepository
                .findBySalaIdAndSerieOrderByNumeroAsc(salaId, serie)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private Sala buscarSalaAtiva(Long salaId) {
        Sala sala = salaRepository.findById(salaId)
                .orElseThrow(() -> new RegraNegocioException("Sala não encontrada."));

        if (!Boolean.TRUE.equals(sala.getAtiva())) {
            throw new RegraNegocioException("A sala informada está inativa.");
        }

        return sala;
    }

    private void validarFaixa(GerarCartelasRequest request) {
        if (request.getNumeroFinal() < request.getNumeroInicial()) {
            throw new RegraNegocioException("Número final deve ser maior ou igual ao número inicial.");
        }

        long quantidade = (long) request.getNumeroFinal() - request.getNumeroInicial() + 1;
        if (quantidade > LIMITE_CARTELAS_POR_GERACAO) {
            throw new RegraNegocioException(
                    "É permitido gerar no máximo " + LIMITE_CARTELAS_POR_GERACAO + " cartelas por vez."
            );
        }
    }

    private CartelaResponse toResponse(Cartela cartela) {
        List<Integer> grade = new ArrayList<>();
        for (int i = 0; i < 25; i++) {
            grade.add(null);
        }

        cartela.getNumeros().forEach(item -> grade.set(item.getPosicao(), item.getNumero()));

        return CartelaResponse.builder()
                .id(cartela.getId())
                .salaId(cartela.getSala().getId())
                .serie(cartela.getSerie())
                .numero(cartela.getNumero())
                .ativa(cartela.getAtiva())
                .grade(grade)
                .build();
    }
}

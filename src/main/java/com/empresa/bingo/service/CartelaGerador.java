package com.empresa.bingo.service;

import com.empresa.bingo.exception.RegraNegocioException;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

@Component
public class CartelaGerador {

    private static final int TAMANHO_GRADE = 25;
    private static final int POSICAO_LIVRE = 12;

    public List<Integer> gerarGrade(Integer serie, Integer numeroCartela) {
        if (serie == null || serie < 1 || numeroCartela == null || numeroCartela < 1) {
            throw new RegraNegocioException("Série e número da cartela devem ser maiores que zero.");
        }

        List<Integer> grade = new ArrayList<>(Collections.nCopies(TAMANHO_GRADE, null));
        Random random = new Random(criarSeed(serie, numeroCartela));

        for (int coluna = 0; coluna < 5; coluna++) {
            int inicioFaixa = coluna * 15 + 1;
            List<Integer> faixa = new ArrayList<>();

            for (int numero = inicioFaixa; numero < inicioFaixa + 15; numero++) {
                faixa.add(numero);
            }

            Collections.shuffle(faixa, random);
            int quantidade = coluna == 2 ? 4 : 5;
            List<Integer> escolhidos = new ArrayList<>(faixa.subList(0, quantidade));
            Collections.sort(escolhidos);

            int indiceEscolhido = 0;
            for (int linha = 0; linha < 5; linha++) {
                int posicao = linha * 5 + coluna;

                if (posicao == POSICAO_LIVRE) {
                    continue;
                }

                grade.set(posicao, escolhidos.get(indiceEscolhido++));
            }
        }

        return grade;
    }

    private long criarSeed(Integer serie, Integer numeroCartela) {
        long seed = ((long) serie << 32) ^ Integer.toUnsignedLong(numeroCartela);
        seed ^= 0x9E3779B97F4A7C15L;
        seed ^= seed >>> 30;
        seed *= 0xBF58476D1CE4E5B9L;
        seed ^= seed >>> 27;
        seed *= 0x94D049BB133111EBL;
        return seed ^ (seed >>> 31);
    }
}

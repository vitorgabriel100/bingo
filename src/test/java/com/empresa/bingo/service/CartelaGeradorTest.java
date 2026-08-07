package com.empresa.bingo.service;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CartelaGeradorTest {

    private final CartelaGerador gerador = new CartelaGerador();

    @Test
    void deveGerarCartelaPadraoDeSetentaECincoBolas() {
        List<Integer> grade = gerador.gerarGrade(8, 701);

        assertEquals(25, grade.size());
        assertNull(grade.get(12));
        assertEquals(24, grade.stream().filter(numero -> numero != null).count());
        assertEquals(24, new HashSet<>(grade.stream().filter(numero -> numero != null).toList()).size());

        for (int posicao = 0; posicao < grade.size(); posicao++) {
            Integer numero = grade.get(posicao);
            if (numero == null) {
                continue;
            }

            int coluna = posicao % 5;
            int minimo = coluna * 15 + 1;
            int maximo = minimo + 14;
            assertTrue(numero >= minimo && numero <= maximo);
        }
    }

    @Test
    void deveReproduzirOsMesmosNumerosParaAMesmaSerieECartela() {
        assertEquals(
                gerador.gerarGrade(8, 701),
                gerador.gerarGrade(8, 701)
        );
    }

    @Test
    void deveGerarGradesDiferentesParaCartelasDiferentes() {
        assertNotEquals(
                gerador.gerarGrade(8, 701),
                gerador.gerarGrade(8, 702)
        );
    }
}

package com.empresa.bingo.service;

import com.empresa.bingo.dto.jogo.ProgressoCartelaResponse;
import com.empresa.bingo.dto.jogo.ValidarVencedorRequest;
import com.empresa.bingo.dto.jogo.VencedorRodadaResponse;
import com.empresa.bingo.entity.*;
import com.empresa.bingo.enums.StatusRodada;
import com.empresa.bingo.enums.StatusSessao;
import com.empresa.bingo.enums.TipoPremioCartela;
import com.empresa.bingo.exception.RegraNegocioException;
import com.empresa.bingo.repository.*;
import com.empresa.bingo.websocket.BingoEventPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JogoCartelaServiceTest {

    @Mock private SessaoBingoRepository sessaoBingoRepository;
    @Mock private RodadaRepository rodadaRepository;
    @Mock private ParticipanteRepository participanteRepository;
    @Mock private CartelaRepository cartelaRepository;
    @Mock private CartelaSessaoRepository cartelaSessaoRepository;
    @Mock private VencedorRodadaRepository vencedorRodadaRepository;
    @Mock private NumeroSorteadoRepository numeroSorteadoRepository;
    @Mock private SalaAcessoService salaAcessoService;
    @Mock private AuditoriaService auditoriaService;
    @Mock private BingoEventPublisher bingoEventPublisher;

    @InjectMocks private JogoCartelaService service;

    private Usuario operador;
    private Rodada rodada;
    private CartelaSessao vinculacao;

    @BeforeEach
    void prepararCenario() {
        Sala sala = Sala.builder().id(1L).nome("Praça de Moema").build();
        operador = Usuario.builder().id(7L).nome("Operador").build();
        SessaoBingo sessao = SessaoBingo.builder()
                .id(10L)
                .sala(sala)
                .status(StatusSessao.EM_ANDAMENTO)
                .build();
        rodada = Rodada.builder()
                .id(20L)
                .sessao(sessao)
                .numeroRodada(1)
                .status(StatusRodada.EM_ANDAMENTO)
                .build();
        Participante participante = Participante.builder()
                .id(30L)
                .sala(sala)
                .nomeCompleto("Vitor Gabriel")
                .apelido("Vitor")
                .build();
        Cartela cartela = Cartela.builder()
                .id(40L)
                .sala(sala)
                .serie(8)
                .numero(701)
                .numeros(new ArrayList<>())
                .build();

        int numero = 1;
        for (int posicao = 0; posicao < 25; posicao++) {
            if (posicao != 12) {
                cartela.adicionarNumero(posicao, numero++);
            }
        }

        vinculacao = CartelaSessao.builder()
                .id(50L)
                .sessao(sessao)
                .participante(participante)
                .cartela(cartela)
                .build();
    }

    @Test
    void deveCalcularLinhaEProximidadeDoBingo() {
        when(rodadaRepository.findDetalhadaById(20L)).thenReturn(Optional.of(rodada));
        when(cartelaSessaoRepository.findDetalhadasBySessaoId(10L)).thenReturn(List.of(vinculacao));
        when(numeroSorteadoRepository.findByRodadaIdOrderByOrdemAsc(20L))
                .thenReturn(numerosSorteados(1, 2, 3, 4, 5));

        List<ProgressoCartelaResponse> resposta = service.listarProgresso(20L, operador);

        assertEquals(1, resposta.size());
        assertEquals(5, resposta.get(0).getAcertos());
        assertEquals(19, resposta.get(0).getFaltamParaBingo());
        assertEquals(1, resposta.get(0).getLinhasCompletas());
        assertTrue(resposta.get(0).getQualificaLinha());
        assertFalse(resposta.get(0).getQualificaBingo());
        verify(salaAcessoService).exigirAcesso(operador, 1L);
    }

    @Test
    void deveRegistrarLinhaValidaEAtualizarPremioPago() {
        when(rodadaRepository.findDetalhadaById(20L)).thenReturn(Optional.of(rodada));
        when(cartelaSessaoRepository.findDetalhadaBySessaoIdAndCartelaId(10L, 40L))
                .thenReturn(Optional.of(vinculacao));
        when(numeroSorteadoRepository.findByRodadaIdOrderByOrdemAsc(20L))
                .thenReturn(numerosSorteados(1, 2, 3, 4, 5));
        when(vencedorRodadaRepository.existsByRodadaIdAndCartelaIdAndTipoPremio(
                20L, 40L, TipoPremioCartela.LINHA
        )).thenReturn(false);
        when(vencedorRodadaRepository.save(any(VencedorRodada.class)))
                .thenAnswer(invocacao -> {
                    VencedorRodada vencedor = invocacao.getArgument(0);
                    vencedor.setId(60L);
                    vencedor.setRegistradoEm(LocalDateTime.now());
                    return vencedor;
                });
        when(rodadaRepository.save(any(Rodada.class))).thenAnswer(invocacao -> invocacao.getArgument(0));

        ValidarVencedorRequest request = new ValidarVencedorRequest();
        request.setCartelaId(40L);
        request.setTipoPremio("LINHA");

        VencedorRodadaResponse resposta = service.validarVencedor(20L, request, operador);

        assertEquals(60L, resposta.getId());
        assertEquals("LINHA", resposta.getTipoPremio());
        assertEquals("PRIMEIRA_LINHA", rodada.getPremiosPagos());
        verify(vencedorRodadaRepository).save(any(VencedorRodada.class));
        verify(bingoEventPublisher).publicarNumeroSorteado(eq(10L), eq(20L), any());
    }

    @Test
    void deveRecusarBingoIncompleto() {
        when(rodadaRepository.findDetalhadaById(20L)).thenReturn(Optional.of(rodada));
        when(cartelaSessaoRepository.findDetalhadaBySessaoIdAndCartelaId(10L, 40L))
                .thenReturn(Optional.of(vinculacao));
        when(numeroSorteadoRepository.findByRodadaIdOrderByOrdemAsc(20L))
                .thenReturn(numerosSorteados(1, 2, 3, 4, 5));
        when(vencedorRodadaRepository.existsByRodadaIdAndCartelaIdAndTipoPremio(
                20L, 40L, TipoPremioCartela.BINGO
        )).thenReturn(false);

        ValidarVencedorRequest request = new ValidarVencedorRequest();
        request.setCartelaId(40L);
        request.setTipoPremio("BINGO");

        RegraNegocioException erro = assertThrows(
                RegraNegocioException.class,
                () -> service.validarVencedor(20L, request, operador)
        );

        assertTrue(erro.getMessage().contains("19 número(s)"));
        verify(vencedorRodadaRepository, never()).save(any());
    }

    private List<NumeroSorteado> numerosSorteados(Integer... numeros) {
        List<NumeroSorteado> itens = new ArrayList<>();
        for (int indice = 0; indice < numeros.length; indice++) {
            itens.add(NumeroSorteado.builder()
                    .numero(numeros[indice])
                    .ordem(indice + 1)
                    .build());
        }
        return itens;
    }
}

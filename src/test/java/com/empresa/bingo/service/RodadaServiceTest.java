package com.empresa.bingo.service;

import com.empresa.bingo.dto.rodada.RodadaResponse;
import com.empresa.bingo.entity.Rodada;
import com.empresa.bingo.entity.Sala;
import com.empresa.bingo.entity.SessaoBingo;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.enums.StatusRodada;
import com.empresa.bingo.enums.StatusSessao;
import com.empresa.bingo.repository.NumeroSorteadoRepository;
import com.empresa.bingo.repository.RodadaRepository;
import com.empresa.bingo.repository.SessaoBingoRepository;
import com.empresa.bingo.websocket.BingoEventPublisher;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RodadaServiceTest {

    @Mock
    private RodadaRepository rodadaRepository;

    @Mock
    private SessaoBingoRepository sessaoBingoRepository;

    @Mock
    private NumeroSorteadoRepository numeroSorteadoRepository;

    @Mock
    private AuditoriaService auditoriaService;

    @Mock
    private BingoEventPublisher bingoEventPublisher;

    @Mock
    private SalaAcessoService salaAcessoService;

    @InjectMocks
    private RodadaService rodadaService;

    @Test
    void deveReutilizarPrimeiraRodadaAguardandoDaSessao() {
        Sala sala = Sala.builder().id(2L).nome("Praça de Moema").build();
        SessaoBingo sessao = SessaoBingo.builder()
                .id(10L)
                .sala(sala)
                .status(StatusSessao.AGENDADA)
                .build();
        Rodada rodadaAguardando = Rodada.builder()
                .id(20L)
                .sessao(sessao)
                .numeroRodada(1)
                .status(StatusRodada.AGUARDANDO)
                .build();
        Usuario operador = Usuario.builder().id(7L).build();

        when(sessaoBingoRepository.findById(10L)).thenReturn(Optional.of(sessao));
        when(rodadaRepository.findFirstBySessaoIdAndStatusOrderByNumeroRodadaAsc(
                10L,
                StatusRodada.AGUARDANDO
        )).thenReturn(Optional.of(rodadaAguardando));
        when(rodadaRepository.save(any(Rodada.class)))
                .thenAnswer(invocacao -> invocacao.getArgument(0));

        RodadaResponse resposta = rodadaService.criarRodada(10L, operador);

        assertEquals(20L, resposta.getId());
        assertEquals(1, resposta.getNumeroRodada());
        assertEquals(StatusRodada.CRIADA.name(), resposta.getStatus());
        assertEquals("PRIMEIRA_LINHA", resposta.getPremioAtual());
        verify(rodadaRepository, never()).findTopBySessaoIdOrderByNumeroRodadaDesc(10L);
        verify(salaAcessoService).exigirAcesso(operador, 2L);
    }

    @Test
    void rodadaAguardandoAindaNaoDeveSerTratadaComoRodadaAtiva() {
        Rodada aguardando = Rodada.builder()
                .id(20L)
                .numeroRodada(1)
                .status(StatusRodada.AGUARDANDO)
                .build();

        when(rodadaRepository.findBySessaoIdOrderByNumeroRodadaDesc(10L))
                .thenReturn(List.of(aguardando));

        assertNull(rodadaService.buscarRodadaAtiva(10L));
    }
}

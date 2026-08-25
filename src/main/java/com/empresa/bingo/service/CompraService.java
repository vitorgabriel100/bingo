package com.empresa.bingo.service;

import com.empresa.bingo.dto.compra.CompraResponse;
import com.empresa.bingo.dto.compra.CriarCompraRequest;
import com.empresa.bingo.dto.rodada.RodadaResponse;
import com.empresa.bingo.entity.*;
import com.empresa.bingo.enums.StatusPagamento;
import com.empresa.bingo.enums.StatusRodada;
import com.empresa.bingo.exception.RegraNegocioException;
import com.empresa.bingo.repository.*;
import com.empresa.bingo.websocket.BingoEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CompraService {

    private final PedidoCompraRepository pedidoCompraRepository;
    private final CartelaRodadaRepository cartelaRodadaRepository;
    private final CartelaRepository cartelaRepository;
    private final ParticipanteRepository participanteRepository;
    private final RodadaRepository rodadaRepository;
    private final SalaAcessoService salaAcessoService;
    private final AuditoriaService auditoriaService;
    private final BingoEventPublisher bingoEventPublisher;
    private final RodadaService rodadaService;

    @Value("${bingo.pagamento.pix-chave:}")
    private String chavePix;

    @Value("${bingo.pagamento.pix-recebedor:Bingo Beneficente}")
    private String recebedorPix;

    @Value("${bingo.pagamento.instrucoes:Envie o Pix e aguarde a confirmação do operador.}")
    private String instrucoesPagamento;

    @Transactional
    public CompraResponse criar(CriarCompraRequest request, Usuario usuario) {
        expirarPedidosVencidos();
        Participante participante = buscarParticipante(usuario);
        Rodada rodada = rodadaRepository.findDetalhadaById(request.getRodadaId())
                .orElseThrow(() -> new RegraNegocioException("Rodada não encontrada."));

        if (!participante.getSala().getId().equals(rodada.getSessao().getSala().getId())) {
            throw new RegraNegocioException("Esta rodada pertence a outra sala.");
        }
        if (!Boolean.TRUE.equals(rodada.getVendaAberta())) {
            throw new RegraNegocioException("As vendas desta rodada estão fechadas.");
        }
        if (chavePix == null || chavePix.isBlank()) {
            throw new RegraNegocioException(
                    "A chave Pix ainda não foi configurada pelo responsável da sala."
            );
        }
        if (rodada.getStatus() == StatusRodada.FINALIZADA
                || rodada.getStatus() == StatusRodada.CANCELADA) {
            throw new RegraNegocioException("Esta rodada já foi encerrada.");
        }

        int quantidade = request.getQuantidade();
        long reservadas = cartelaRodadaRepository.countByRodadaId(rodada.getId());
        int limite = rodada.getLimiteCartelas() == null
                ? Integer.MAX_VALUE
                : rodada.getLimiteCartelas();
        if (reservadas + quantidade > limite) {
            throw new RegraNegocioException("Quantidade indisponível para esta rodada.");
        }

        Set<Long> indisponiveis = new HashSet<>(
                cartelaRodadaRepository.findCartelaIdsReservadas(rodada.getId())
        );
        List<Cartela> disponiveis = cartelaRepository
                .findAtivasParaReserva(
                        participante.getSala().getId(),
                        participante.getSala().getSerieCartela()
                )
                .stream()
                .filter(cartela -> !indisponiveis.contains(cartela.getId()))
                .limit(quantidade)
                .toList();

        if (disponiveis.size() != quantidade) {
            throw new RegraNegocioException("Não há cartelas suficientes disponíveis.");
        }

        BigDecimal valorUnitario = calcularPrecoAtual(rodada);
        if (valorUnitario == null) {
            throw new RegraNegocioException("O preço desta rodada ainda não foi configurado.");
        }

        PedidoCompra pedido = pedidoCompraRepository.save(PedidoCompra.builder()
                .codigoReferencia(UUID.randomUUID().toString())
                .rodada(rodada)
                .participante(participante)
                .quantidade(quantidade)
                .valorUnitario(valorUnitario)
                .valorTotal(valorUnitario.multiply(BigDecimal.valueOf(quantidade)))
                .status(StatusPagamento.AGUARDANDO_PAGAMENTO)
                .expiraEm(LocalDateTime.now().plusMinutes(30))
                .build());

        List<CartelaRodada> reservas = disponiveis.stream()
                .map(cartela -> CartelaRodada.builder()
                        .rodada(rodada)
                        .participante(participante)
                        .cartela(cartela)
                        .pedido(pedido)
                        .ativa(false)
                        .build())
                .toList();
        cartelaRodadaRepository.saveAll(reservas);

        auditoriaService.registrar(
                usuario,
                "CRIAR_PEDIDO_CARTELAS",
                "PEDIDO_COMPRA",
                pedido.getId(),
                quantidade + " cartela(s) reservada(s) para a rodada " + rodada.getId() + "."
        );

        return toResponse(pedido);
    }

    @Transactional
    public List<CompraResponse> listarMinhas(Usuario usuario) {
        expirarPedidosVencidos();
        Participante participante = buscarParticipante(usuario);
        return pedidoCompraRepository.findByParticipanteIdOrderByCriadoEmDesc(participante.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RodadaResponse> listarCatalogo(Usuario usuario) {
        Participante participante = buscarParticipante(usuario);
        return rodadaService.listarCatalogoDaSala(participante.getSala().getId());
    }

    @Transactional
    public List<CompraResponse> listarPendentes(Long salaId, Usuario usuario) {
        expirarPedidosVencidos();
        salaAcessoService.exigirAcesso(usuario, salaId);
        return pedidoCompraRepository
                .findByRodadaSessaoSalaIdAndStatusOrderByCriadoEmAsc(
                        salaId,
                        StatusPagamento.AGUARDANDO_PAGAMENTO
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CompraResponse confirmar(Long pedidoId, Usuario operador) {
        expirarPedidosVencidos();
        PedidoCompra pedido = buscarPedido(pedidoId);
        salaAcessoService.exigirAcesso(
                operador,
                pedido.getRodada().getSessao().getSala().getId()
        );
        if (pedido.getStatus() != StatusPagamento.AGUARDANDO_PAGAMENTO) {
            throw new RegraNegocioException("Somente pedidos pendentes podem ser confirmados.");
        }

        pedido.setStatus(StatusPagamento.PAGO);
        pedido.setConfirmadoEm(LocalDateTime.now());
        pedido.setConfirmadoPor(operador);
        pedido = pedidoCompraRepository.save(pedido);

        List<CartelaRodada> cartelas = cartelaRodadaRepository
                .findByPedidoIdOrderByCartelaNumero(pedidoId);
        cartelas.forEach(item -> item.setAtiva(true));
        cartelaRodadaRepository.saveAll(cartelas);

        auditoriaService.registrar(
                operador,
                "CONFIRMAR_PAGAMENTO_CARTELAS",
                "PEDIDO_COMPRA",
                pedido.getId(),
                "Pagamento confirmado para " + pedido.getParticipante().getApelido() + "."
        );

        Map<String, Object> evento = new LinkedHashMap<>();
        evento.put("type", "CARD_PURCHASE_CONFIRMED");
        evento.put("rodadaId", pedido.getRodada().getId());
        evento.put("participante", pedido.getParticipante().getApelido());
        evento.put("quantidade", pedido.getQuantidade());
        bingoEventPublisher.publicarNumeroSorteado(
                pedido.getRodada().getSessao().getId(),
                pedido.getRodada().getId(),
                evento
        );

        return toResponse(pedido);
    }

    @Transactional
    public CompraResponse cancelar(Long pedidoId, Usuario operador) {
        expirarPedidosVencidos();
        PedidoCompra pedido = buscarPedido(pedidoId);
        salaAcessoService.exigirAcesso(
                operador,
                pedido.getRodada().getSessao().getSala().getId()
        );
        if (pedido.getStatus() != StatusPagamento.AGUARDANDO_PAGAMENTO) {
            throw new RegraNegocioException("Somente pedidos pendentes podem ser cancelados.");
        }
        cartelaRodadaRepository.deleteAll(
                cartelaRodadaRepository.findByPedidoIdOrderByCartelaNumero(pedidoId)
        );
        pedido.setStatus(StatusPagamento.CANCELADO);
        return toResponse(pedidoCompraRepository.save(pedido));
    }

    private Participante buscarParticipante(Usuario usuario) {
        return participanteRepository.findByUsuarioId(usuario.getId())
                .orElseThrow(() -> new RegraNegocioException(
                        "Seu acesso ainda não está vinculado a um cadastro de jogador."
                ));
    }

    private PedidoCompra buscarPedido(Long pedidoId) {
        return pedidoCompraRepository.findById(pedidoId)
                .orElseThrow(() -> new RegraNegocioException("Pedido não encontrado."));
    }

    private void expirarPedidosVencidos() {
        List<PedidoCompra> vencidos = pedidoCompraRepository.findByStatusAndExpiraEmBefore(
                StatusPagamento.AGUARDANDO_PAGAMENTO,
                LocalDateTime.now()
        );
        for (PedidoCompra pedido : vencidos) {
            cartelaRodadaRepository.deleteAll(
                    cartelaRodadaRepository.findByPedidoIdOrderByCartelaNumero(pedido.getId())
            );
            pedido.setStatus(StatusPagamento.EXPIRADO);
        }
        if (!vencidos.isEmpty()) pedidoCompraRepository.saveAll(vencidos);
    }

    private BigDecimal calcularPrecoAtual(Rodada rodada) {
        if (rodada.getFimPrecoAntecipado() != null
                && LocalDateTime.now().isBefore(rodada.getFimPrecoAntecipado())
                && rodada.getPrecoAntecipado() != null) {
            return rodada.getPrecoAntecipado();
        }
        return rodada.getPrecoNoDia() != null ? rodada.getPrecoNoDia() : rodada.getPrecoAntecipado();
    }

    private CompraResponse toResponse(PedidoCompra pedido) {
        List<Integer> cartelas = cartelaRodadaRepository
                .findByPedidoIdOrderByCartelaNumero(pedido.getId())
                .stream()
                .map(item -> item.getCartela().getNumero())
                .toList();
        boolean pendente = pedido.getStatus() == StatusPagamento.AGUARDANDO_PAGAMENTO;
        return CompraResponse.builder()
                .id(pedido.getId())
                .codigoReferencia(pedido.getCodigoReferencia())
                .rodadaId(pedido.getRodada().getId())
                .tituloRodada(pedido.getRodada().getTitulo())
                .agendadaPara(pedido.getRodada().getAgendadaPara())
                .salaNome(pedido.getRodada().getSessao().getSala().getNome())
                .participanteApelido(pedido.getParticipante().getApelido())
                .quantidade(pedido.getQuantidade())
                .valorUnitario(pedido.getValorUnitario())
                .valorTotal(pedido.getValorTotal())
                .status(pedido.getStatus().name())
                .cartelas(cartelas)
                .chavePix(pendente ? chavePix : null)
                .recebedorPix(pendente ? recebedorPix : null)
                .instrucoesPagamento(pendente ? instrucoesPagamento : null)
                .criadoEm(pedido.getCriadoEm())
                .confirmadoEm(pedido.getConfirmadoEm())
                .expiraEm(pedido.getExpiraEm())
                .build();
    }
}

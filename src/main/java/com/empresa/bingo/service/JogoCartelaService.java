package com.empresa.bingo.service;

import com.empresa.bingo.dto.jogo.*;
import com.empresa.bingo.entity.*;
import com.empresa.bingo.enums.StatusSessao;
import com.empresa.bingo.enums.TipoPremioCartela;
import com.empresa.bingo.exception.RegraNegocioException;
import com.empresa.bingo.repository.*;
import com.empresa.bingo.websocket.BingoEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JogoCartelaService {

    private static final int TOTAL_NUMEROS_CARTELA = 24;

    private final SessaoBingoRepository sessaoBingoRepository;
    private final RodadaRepository rodadaRepository;
    private final ParticipanteRepository participanteRepository;
    private final CartelaRepository cartelaRepository;
    private final CartelaSessaoRepository cartelaSessaoRepository;
    private final VencedorRodadaRepository vencedorRodadaRepository;
    private final NumeroSorteadoRepository numeroSorteadoRepository;
    private final SalaAcessoService salaAcessoService;
    private final AuditoriaService auditoriaService;
    private final BingoEventPublisher bingoEventPublisher;

    @Transactional
    public List<CartelaSessaoResponse> vincularCartelas(
            Long sessaoId,
            VincularCartelasRequest request,
            Usuario usuarioLogado
    ) {
        SessaoBingo sessao = buscarSessao(sessaoId);
        exigirSessaoAberta(sessao);
        salaAcessoService.exigirAcesso(usuarioLogado, sessao.getSala().getId());

        Participante participante = participanteRepository.findById(request.getParticipanteId())
                .orElseThrow(() -> new RegraNegocioException("Participante não encontrado."));

        if (!participante.getSala().getId().equals(sessao.getSala().getId())) {
            throw new RegraNegocioException("O participante não pertence à sala desta sessão.");
        }

        if (!Boolean.TRUE.equals(participante.getAtivo())) {
            throw new RegraNegocioException("O participante selecionado está inativo.");
        }

        List<Long> idsSolicitados = request.getCartelaIds().stream().distinct().toList();
        List<Cartela> cartelas = cartelaRepository.findAllById(idsSolicitados);

        if (cartelas.size() != idsSolicitados.size()) {
            throw new RegraNegocioException("Uma ou mais cartelas não foram encontradas.");
        }

        List<CartelaSessao> novasVinculacoes = new ArrayList<>();

        for (Cartela cartela : cartelas) {
            if (!cartela.getSala().getId().equals(sessao.getSala().getId())) {
                throw new RegraNegocioException("A cartela " + cartela.getNumero() + " pertence a outra sala.");
            }

            if (!Boolean.TRUE.equals(cartela.getAtiva())) {
                throw new RegraNegocioException("A cartela " + cartela.getNumero() + " está inativa.");
            }

            if (cartelaSessaoRepository.existsBySessaoIdAndCartelaId(sessaoId, cartela.getId())) {
                throw new RegraNegocioException(
                        "A cartela " + cartela.getNumero() + " já está vinculada nesta sessão."
                );
            }

            novasVinculacoes.add(CartelaSessao.builder()
                    .sessao(sessao)
                    .participante(participante)
                    .cartela(cartela)
                    .build());
        }

        List<CartelaSessao> salvas = cartelaSessaoRepository.saveAll(novasVinculacoes);

        auditoriaService.registrar(
                usuarioLogado,
                "VINCULAR_CARTELAS",
                "SESSAO",
                sessaoId,
                idsSolicitados.size() + " cartela(s) vinculada(s) a " + participante.getApelido() + "."
        );

        return salvas.stream().map(this::toVinculacaoResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<CartelaSessaoResponse> listarVinculacoes(Long sessaoId, Usuario usuarioLogado) {
        SessaoBingo sessao = buscarSessao(sessaoId);
        salaAcessoService.exigirAcesso(usuarioLogado, sessao.getSala().getId());

        return cartelaSessaoRepository.findDetalhadasBySessaoId(sessaoId)
                .stream()
                .sorted(Comparator
                        .comparing(
                                (CartelaSessao item) -> item.getParticipante().getApelido(),
                                String.CASE_INSENSITIVE_ORDER
                        )
                        .thenComparing(item -> item.getCartela().getNumero()))
                .map(this::toVinculacaoResponse)
                .toList();
    }

    @Transactional
    public void removerVinculacao(
            Long sessaoId,
            Long cartelaId,
            Usuario usuarioLogado
    ) {
        SessaoBingo sessao = buscarSessao(sessaoId);
        exigirSessaoAberta(sessao);
        salaAcessoService.exigirAcesso(usuarioLogado, sessao.getSala().getId());

        CartelaSessao vinculacao = cartelaSessaoRepository
                .findDetalhadaBySessaoIdAndCartelaId(sessaoId, cartelaId)
                .orElseThrow(() -> new RegraNegocioException("Vínculo de cartela não encontrado."));

        cartelaSessaoRepository.delete(vinculacao);

        auditoriaService.registrar(
                usuarioLogado,
                "REMOVER_CARTELA_SESSAO",
                "SESSAO",
                sessaoId,
                "Cartela " + vinculacao.getCartela().getNumero() + " desvinculada."
        );
    }

    @Transactional(readOnly = true)
    public List<ProgressoCartelaResponse> listarProgresso(Long rodadaId, Usuario usuarioLogado) {
        Rodada rodada = buscarRodadaDetalhada(rodadaId);
        salaAcessoService.exigirAcesso(usuarioLogado, rodada.getSessao().getSala().getId());

        Set<Integer> numerosSorteados = numeroSorteadoRepository
                .findByRodadaIdOrderByOrdemAsc(rodadaId)
                .stream()
                .map(NumeroSorteado::getNumero)
                .collect(Collectors.toSet());

        return cartelaSessaoRepository.findDetalhadasBySessaoId(rodada.getSessao().getId())
                .stream()
                .map(vinculacao -> calcularProgresso(vinculacao, numerosSorteados))
                .sorted(Comparator
                        .comparing(ProgressoCartelaResponse::getFaltamParaBingo)
                        .thenComparing(ProgressoCartelaResponse::getLinhasCompletas, Comparator.reverseOrder())
                        .thenComparing(ProgressoCartelaResponse::getParticipanteApelido, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional
    public VencedorRodadaResponse validarVencedor(
            Long rodadaId,
            ValidarVencedorRequest request,
            Usuario usuarioLogado
    ) {
        Rodada rodada = buscarRodadaDetalhada(rodadaId);
        salaAcessoService.exigirAcesso(usuarioLogado, rodada.getSessao().getSala().getId());

        TipoPremioCartela tipoPremio = normalizarTipoPremio(request.getTipoPremio());
        CartelaSessao vinculacao = cartelaSessaoRepository
                .findDetalhadaBySessaoIdAndCartelaId(rodada.getSessao().getId(), request.getCartelaId())
                .orElseThrow(() -> new RegraNegocioException(
                        "A cartela não está vinculada a um participante nesta sessão."
                ));

        if (vencedorRodadaRepository.existsByRodadaIdAndCartelaIdAndTipoPremio(
                rodadaId,
                request.getCartelaId(),
                tipoPremio
        )) {
            throw new RegraNegocioException("Este prêmio já foi registrado para a cartela informada.");
        }

        Set<Integer> numerosSorteados = numeroSorteadoRepository
                .findByRodadaIdOrderByOrdemAsc(rodadaId)
                .stream()
                .map(NumeroSorteado::getNumero)
                .collect(Collectors.toSet());

        ProgressoCartelaResponse progresso = calcularProgresso(vinculacao, numerosSorteados);
        exigirPremioValido(tipoPremio, progresso);

        VencedorRodada vencedor = vencedorRodadaRepository.save(VencedorRodada.builder()
                .rodada(rodada)
                .participante(vinculacao.getParticipante())
                .cartela(vinculacao.getCartela())
                .tipoPremio(tipoPremio)
                .quantidadeAcertos(progresso.getAcertos())
                .validadoPor(usuarioLogado)
                .build());

        atualizarPremiosPagos(rodada, tipoPremio);

        auditoriaService.registrar(
                usuarioLogado,
                "VALIDAR_VENCEDOR",
                "RODADA",
                rodadaId,
                vinculacao.getParticipante().getApelido()
                        + " venceu " + tipoPremio.name()
                        + " com a cartela " + vinculacao.getCartela().getNumero() + "."
        );

        Map<String, Object> evento = new LinkedHashMap<>();
        evento.put("type", "WINNER_REGISTERED");
        evento.put("rodadaId", rodadaId);
        evento.put("sessaoId", rodada.getSessao().getId());
        evento.put("participante", vinculacao.getParticipante().getApelido());
        evento.put("cartela", vinculacao.getCartela().getNumero());
        evento.put("tipoPremio", tipoPremio.name());
        bingoEventPublisher.publicarNumeroSorteado(
                rodada.getSessao().getId(),
                rodadaId,
                evento
        );

        return toVencedorResponse(vencedor);
    }

    @Transactional(readOnly = true)
    public List<VencedorRodadaResponse> listarVencedores(Long rodadaId, Usuario usuarioLogado) {
        Rodada rodada = buscarRodadaDetalhada(rodadaId);
        salaAcessoService.exigirAcesso(usuarioLogado, rodada.getSessao().getSala().getId());

        return vencedorRodadaRepository.findDetalhadosByRodadaId(rodadaId)
                .stream()
                .map(this::toVencedorResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RankingParticipanteResponse> buscarRanking(Long salaId, Usuario usuarioLogado) {
        salaAcessoService.exigirAcesso(usuarioLogado, salaId);

        Map<Long, RankingAcumulado> acumulados = new LinkedHashMap<>();

        for (CartelaSessao vinculacao : cartelaSessaoRepository.findBySalaIdParaRanking(salaId)) {
            RankingAcumulado acumulado = acumulados.computeIfAbsent(
                    vinculacao.getParticipante().getId(),
                    ignorado -> new RankingAcumulado(vinculacao.getParticipante())
            );
            acumulado.sessoes.add(vinculacao.getSessao().getId());
        }

        for (VencedorRodada vencedor : vencedorRodadaRepository.findBySalaIdParaRanking(salaId)) {
            RankingAcumulado acumulado = acumulados.computeIfAbsent(
                    vencedor.getParticipante().getId(),
                    ignorado -> new RankingAcumulado(vencedor.getParticipante())
            );
            acumulado.vitorias++;
            if (vencedor.getTipoPremio() == TipoPremioCartela.BINGO) {
                acumulado.bingos++;
            } else {
                acumulado.linhas++;
            }
            if (acumulado.ultimaVitoria == null
                    || vencedor.getRegistradoEm().isAfter(acumulado.ultimaVitoria)) {
                acumulado.ultimaVitoria = vencedor.getRegistradoEm();
            }
        }

        List<RankingAcumulado> ordenados = acumulados.values().stream()
                .sorted(Comparator
                        .comparingInt((RankingAcumulado item) -> item.vitorias).reversed()
                        .thenComparing(
                                Comparator.comparingInt((RankingAcumulado item) -> item.bingos).reversed()
                        )
                        .thenComparing(item -> item.participante.getApelido(), String.CASE_INSENSITIVE_ORDER))
                .toList();

        List<RankingParticipanteResponse> ranking = new ArrayList<>();
        for (int indice = 0; indice < ordenados.size(); indice++) {
            RankingAcumulado item = ordenados.get(indice);
            ranking.add(RankingParticipanteResponse.builder()
                    .posicao(indice + 1)
                    .participanteId(item.participante.getId())
                    .participanteNome(item.participante.getNomeCompleto())
                    .participanteApelido(item.participante.getApelido())
                    .vitorias(item.vitorias)
                    .bingos(item.bingos)
                    .linhas(item.linhas)
                    .participacoes(item.sessoes.size())
                    .ultimaVitoria(item.ultimaVitoria)
                    .build());
        }

        return ranking;
    }

    private SessaoBingo buscarSessao(Long sessaoId) {
        return sessaoBingoRepository.findById(sessaoId)
                .orElseThrow(() -> new RegraNegocioException("Sessão não encontrada."));
    }

    private Rodada buscarRodadaDetalhada(Long rodadaId) {
        return rodadaRepository.findDetalhadaById(rodadaId)
                .orElseThrow(() -> new RegraNegocioException("Rodada não encontrada."));
    }

    private void exigirSessaoAberta(SessaoBingo sessao) {
        if (sessao.getStatus() == StatusSessao.FINALIZADA
                || sessao.getStatus() == StatusSessao.CANCELADA) {
            throw new RegraNegocioException("Não é possível alterar cartelas de uma sessão encerrada.");
        }
    }

    private ProgressoCartelaResponse calcularProgresso(
            CartelaSessao vinculacao,
            Set<Integer> numerosSorteados
    ) {
        Map<Integer, Integer> numeroPorPosicao = vinculacao.getCartela().getNumeros().stream()
                .collect(Collectors.toMap(CartelaNumero::getPosicao, CartelaNumero::getNumero));

        List<Integer> faltantes = vinculacao.getCartela().getNumeros().stream()
                .map(CartelaNumero::getNumero)
                .filter(numero -> !numerosSorteados.contains(numero))
                .sorted()
                .toList();

        int acertos = TOTAL_NUMEROS_CARTELA - faltantes.size();
        int linhasCompletas = contarLinhasCompletas(numeroPorPosicao, numerosSorteados);

        return ProgressoCartelaResponse.builder()
                .vinculacaoId(vinculacao.getId())
                .participanteId(vinculacao.getParticipante().getId())
                .participanteNome(vinculacao.getParticipante().getNomeCompleto())
                .participanteApelido(vinculacao.getParticipante().getApelido())
                .cartelaId(vinculacao.getCartela().getId())
                .cartelaNumero(vinculacao.getCartela().getNumero())
                .serie(vinculacao.getCartela().getSerie())
                .acertos(acertos)
                .faltamParaBingo(faltantes.size())
                .linhasCompletas(linhasCompletas)
                .progressoPercentual((int) Math.round(acertos * 100.0 / TOTAL_NUMEROS_CARTELA))
                .qualificaLinha(linhasCompletas >= 1)
                .qualificaDuplaLinha(linhasCompletas >= 2)
                .qualificaBingo(faltantes.isEmpty())
                .numerosFaltantes(faltantes)
                .build();
    }

    private int contarLinhasCompletas(
            Map<Integer, Integer> numeroPorPosicao,
            Set<Integer> numerosSorteados
    ) {
        int completas = 0;

        for (int linha = 0; linha < 5; linha++) {
            boolean completa = true;
            for (int coluna = 0; coluna < 5; coluna++) {
                int posicao = linha * 5 + coluna;
                if (posicao == 12) {
                    continue;
                }

                Integer numero = numeroPorPosicao.get(posicao);
                if (numero == null || !numerosSorteados.contains(numero)) {
                    completa = false;
                    break;
                }
            }

            if (completa) {
                completas++;
            }
        }

        return completas;
    }

    private void exigirPremioValido(
            TipoPremioCartela tipoPremio,
            ProgressoCartelaResponse progresso
    ) {
        boolean valido = switch (tipoPremio) {
            case LINHA -> Boolean.TRUE.equals(progresso.getQualificaLinha());
            case DUPLA_LINHA -> Boolean.TRUE.equals(progresso.getQualificaDuplaLinha());
            case BINGO -> Boolean.TRUE.equals(progresso.getQualificaBingo());
        };

        if (valido) {
            return;
        }

        String detalhe = switch (tipoPremio) {
            case LINHA -> "ainda não completou uma linha";
            case DUPLA_LINHA -> "ainda não completou duas linhas";
            case BINGO -> "ainda precisa de " + progresso.getFaltamParaBingo() + " número(s)";
        };
        throw new RegraNegocioException("Cartela inválida: " + detalhe + ".");
    }

    private TipoPremioCartela normalizarTipoPremio(String valor) {
        try {
            return TipoPremioCartela.valueOf(
                    valor.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_')
            );
        } catch (IllegalArgumentException exception) {
            throw new RegraNegocioException("Tipo de prêmio inválido. Use LINHA, DUPLA_LINHA ou BINGO.");
        }
    }

    private void atualizarPremiosPagos(Rodada rodada, TipoPremioCartela tipoPremio) {
        String chave = switch (tipoPremio) {
            case LINHA -> "PRIMEIRA_LINHA";
            case DUPLA_LINHA -> "DUPLA_LINHA";
            case BINGO -> "CARTELA_CHEIA";
        };

        LinkedHashSet<String> premios = new LinkedHashSet<>();
        if (rodada.getPremiosPagos() != null && !rodada.getPremiosPagos().isBlank()) {
            premios.addAll(Arrays.stream(rodada.getPremiosPagos().split(","))
                    .map(String::trim)
                    .filter(item -> !item.isBlank())
                    .toList());
        }
        premios.add(chave);
        rodada.setPremiosPagos(String.join(",", premios));
        rodadaRepository.save(rodada);
    }

    private CartelaSessaoResponse toVinculacaoResponse(CartelaSessao vinculacao) {
        List<Integer> grade = new ArrayList<>(Collections.nCopies(25, null));
        vinculacao.getCartela().getNumeros()
                .forEach(item -> grade.set(item.getPosicao(), item.getNumero()));

        return CartelaSessaoResponse.builder()
                .id(vinculacao.getId())
                .sessaoId(vinculacao.getSessao().getId())
                .participanteId(vinculacao.getParticipante().getId())
                .participanteNome(vinculacao.getParticipante().getNomeCompleto())
                .participanteApelido(vinculacao.getParticipante().getApelido())
                .cartelaId(vinculacao.getCartela().getId())
                .cartelaNumero(vinculacao.getCartela().getNumero())
                .serie(vinculacao.getCartela().getSerie())
                .grade(grade)
                .vinculadaEm(vinculacao.getVinculadaEm())
                .build();
    }

    private VencedorRodadaResponse toVencedorResponse(VencedorRodada vencedor) {
        return VencedorRodadaResponse.builder()
                .id(vencedor.getId())
                .rodadaId(vencedor.getRodada().getId())
                .numeroRodada(vencedor.getRodada().getNumeroRodada())
                .participanteId(vencedor.getParticipante().getId())
                .participanteNome(vencedor.getParticipante().getNomeCompleto())
                .participanteApelido(vencedor.getParticipante().getApelido())
                .cartelaId(vencedor.getCartela().getId())
                .cartelaNumero(vencedor.getCartela().getNumero())
                .serie(vencedor.getCartela().getSerie())
                .tipoPremio(vencedor.getTipoPremio().name())
                .quantidadeAcertos(vencedor.getQuantidadeAcertos())
                .registradoEm(vencedor.getRegistradoEm())
                .validadoPor(vencedor.getValidadoPor().getNome())
                .build();
    }

    private static class RankingAcumulado {
        private final Participante participante;
        private final Set<Long> sessoes = new HashSet<>();
        private int vitorias;
        private int bingos;
        private int linhas;
        private LocalDateTime ultimaVitoria;

        private RankingAcumulado(Participante participante) {
            this.participante = participante;
        }
    }
}

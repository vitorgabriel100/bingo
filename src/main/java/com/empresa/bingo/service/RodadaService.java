package com.empresa.bingo.service;

import com.empresa.bingo.dto.rodada.RodadaResponse;
import com.empresa.bingo.entity.NumeroSorteado;
import com.empresa.bingo.entity.Rodada;
import com.empresa.bingo.entity.SessaoBingo;
import com.empresa.bingo.entity.Usuario;
import com.empresa.bingo.enums.StatusRodada;
import com.empresa.bingo.enums.StatusSessao;
import com.empresa.bingo.exception.RegraNegocioException;
import com.empresa.bingo.repository.NumeroSorteadoRepository;
import com.empresa.bingo.repository.RodadaRepository;
import com.empresa.bingo.repository.SessaoBingoRepository;
import com.empresa.bingo.websocket.BingoEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class RodadaService {

    private final RodadaRepository rodadaRepository;
    private final SessaoBingoRepository sessaoBingoRepository;
    private final NumeroSorteadoRepository numeroSorteadoRepository;
    private final AuditoriaService auditoriaService;
    private final BingoEventPublisher bingoEventPublisher;
    private final SalaAcessoService salaAcessoService;

    @Transactional
    public RodadaResponse iniciarRodada(Long rodadaId, Usuario usuarioLogado) {
        Rodada rodada = buscarRodada(rodadaId);
        SessaoBingo sessao = rodada.getSessao();

        if (sessao == null) {
            throw new RegraNegocioException("A rodada não possui sessão vinculada.");
        }

        salaAcessoService.exigirAcesso(usuarioLogado, sessao.getSala().getId());

        Long sessaoId = sessao.getId();
        Long rodadaAtualId = rodada.getId();

        if (sessao.getStatus() != StatusSessao.CRIADA
                && sessao.getStatus() != StatusSessao.AGENDADA
                && sessao.getStatus() != StatusSessao.PAUSADA
                && sessao.getStatus() != StatusSessao.EM_ANDAMENTO) {
            throw new RegraNegocioException(
                    "A sessão só pode iniciar rodada se estiver CRIADA, AGENDADA, PAUSADA ou EM_ANDAMENTO."
            );
        }

        if (rodada.getStatus() != StatusRodada.CRIADA
                && rodada.getStatus() != StatusRodada.AGUARDANDO
                && rodada.getStatus() != StatusRodada.PAUSADA
                && rodada.getStatus() != StatusRodada.EM_ANDAMENTO) {
            throw new RegraNegocioException(
                    "A rodada só pode ser iniciada se estiver CRIADA, AGUARDANDO, PAUSADA ou EM_ANDAMENTO."
            );
        }

        List<Rodada> rodadasDaSessao = rodadaRepository.findBySessaoIdOrderByNumeroRodadaDesc(sessaoId);

        for (Rodada rodadaAntiga : rodadasDaSessao) {
            if (rodadaAntiga.getStatus() == StatusRodada.EM_ANDAMENTO
                    && !rodadaAntiga.getId().equals(rodadaAtualId)) {

                rodadaAntiga.setStatus(StatusRodada.FINALIZADA);

                if (rodadaAntiga.getEncerrouEm() == null) {
                    rodadaAntiga.setEncerrouEm(LocalDateTime.now());
                }

                rodadaAntiga = rodadaRepository.save(rodadaAntiga);

                auditoriaService.registrar(
                        usuarioLogado,
                        "ENCERRAR_RODADA_AUTOMATICAMENTE",
                        "RODADA",
                        rodadaAntiga.getId(),
                        "Rodada " + rodadaAntiga.getNumeroRodada()
                                + " encerrada automaticamente ao iniciar nova rodada."
                );

                publicarEventoRodada(rodadaAntiga, "ROUND_FINISHED");
            }
        }

        if (sessao.getStatus() == StatusSessao.CRIADA
                || sessao.getStatus() == StatusSessao.AGENDADA
                || sessao.getStatus() == StatusSessao.PAUSADA) {

            sessao.setStatus(StatusSessao.EM_ANDAMENTO);

            if (sessao.getDataInicio() == null) {
                sessao.setDataInicio(LocalDateTime.now());
            }

            sessaoBingoRepository.save(sessao);
        }

        rodada.setStatus(StatusRodada.EM_ANDAMENTO);

        if (rodada.getIniciouEm() == null) {
            rodada.setIniciouEm(LocalDateTime.now());
        }

        rodada = rodadaRepository.save(rodada);

        auditoriaService.registrar(
                usuarioLogado,
                "INICIAR_RODADA",
                "RODADA",
                rodada.getId(),
                "Rodada " + rodada.getNumeroRodada() + " iniciada."
        );

        publicarEventoRodada(rodada, "ROUND_STARTED");

        return toResponse(rodada);
    }

    @Transactional
    public RodadaResponse pausarRodada(Long rodadaId, Usuario usuarioLogado) {
        Rodada rodada = buscarRodada(rodadaId);
        exigirAcesso(rodada, usuarioLogado);

        if (rodada.getStatus() != StatusRodada.EM_ANDAMENTO) {
            throw new RegraNegocioException("A rodada só pode ser pausada se estiver em andamento.");
        }

        rodada.setStatus(StatusRodada.PAUSADA);
        rodada = rodadaRepository.save(rodada);

        auditoriaService.registrar(
                usuarioLogado,
                "PAUSAR_RODADA",
                "RODADA",
                rodada.getId(),
                "Rodada " + rodada.getNumeroRodada() + " pausada."
        );

        publicarEventoRodada(rodada, "ROUND_PAUSED");

        return toResponse(rodada);
    }

    @Transactional
public RodadaResponse continuarRodada(Long rodadaId, Usuario usuarioLogado) {
    Rodada rodada = buscarRodada(rodadaId);
    SessaoBingo sessao = rodada.getSessao();

    exigirAcesso(rodada, usuarioLogado);

    if (rodada.getStatus() != StatusRodada.PAUSADA) {
        throw new RegraNegocioException("A rodada só pode ser continuada se estiver pausada.");
    }

    if (sessao == null) {
        throw new RegraNegocioException("A rodada não possui sessão vinculada.");
    }

    if (sessao.getStatus() == StatusSessao.PAUSADA
            || sessao.getStatus() == StatusSessao.CRIADA
            || sessao.getStatus() == StatusSessao.AGENDADA) {
        sessao.setStatus(StatusSessao.EM_ANDAMENTO);

        if (sessao.getDataInicio() == null) {
            sessao.setDataInicio(LocalDateTime.now());
        }

        sessaoBingoRepository.save(sessao);
    }

    rodada.setStatus(StatusRodada.EM_ANDAMENTO);

    if (rodada.getIniciouEm() == null) {
        rodada.setIniciouEm(LocalDateTime.now());
    }

    rodada = rodadaRepository.save(rodada);

    auditoriaService.registrar(
            usuarioLogado,
            "CONTINUAR_RODADA",
            "RODADA",
            rodada.getId(),
            "Rodada " + rodada.getNumeroRodada() + " continuada."
    );

    publicarEventoRodada(rodada, "ROUND_RESUMED");

    return toResponse(rodada);
}

    @Transactional
    public RodadaResponse encerrarRodada(Long rodadaId, Usuario usuarioLogado) {
        Rodada rodada = buscarRodada(rodadaId);
        exigirAcesso(rodada, usuarioLogado);

        if (rodada.getStatus() != StatusRodada.EM_ANDAMENTO
                && rodada.getStatus() != StatusRodada.PAUSADA) {
            throw new RegraNegocioException(
                    "A rodada só pode ser encerrada se estiver EM_ANDAMENTO ou PAUSADA."
            );
        }

        rodada.setStatus(StatusRodada.FINALIZADA);
        rodada.setEncerrouEm(LocalDateTime.now());
        rodada = rodadaRepository.save(rodada);

        auditoriaService.registrar(
                usuarioLogado,
                "ENCERRAR_RODADA",
                "RODADA",
                rodada.getId(),
                "Rodada " + rodada.getNumeroRodada() + " encerrada."
        );

        publicarEventoRodada(rodada, "ROUND_FINISHED");

        return toResponse(rodada);
    }

    @Transactional
    public RodadaResponse criarRodada(Long sessaoId, Usuario usuarioLogado) {
        SessaoBingo sessao = sessaoBingoRepository.findById(sessaoId)
                .orElseThrow(() -> new RegraNegocioException("Sessão não encontrada."));

        salaAcessoService.exigirAcesso(usuarioLogado, sessao.getSala().getId());

        if (sessao.getStatus() == StatusSessao.FINALIZADA) {
            throw new RegraNegocioException("Não é possível criar rodada em sessão finalizada.");
        }

        Rodada novaRodada = rodadaRepository
                .findFirstBySessaoIdAndStatusOrderByNumeroRodadaAsc(
                        sessaoId,
                        StatusRodada.AGUARDANDO
                )
                .orElseGet(() -> {
                    Integer ultimoNumero = rodadaRepository
                            .findTopBySessaoIdOrderByNumeroRodadaDesc(sessaoId)
                            .map(Rodada::getNumeroRodada)
                            .orElse(0);

                    return Rodada.builder()
                            .sessao(sessao)
                            .numeroRodada(ultimoNumero + 1)
                            .build();
                });

        novaRodada.setStatus(StatusRodada.CRIADA);
        novaRodada.setPremioAtual("PRIMEIRA_LINHA");
        novaRodada.setPremiosPagos("");
        novaRodada.setBolaMax(60);

        novaRodada = rodadaRepository.save(novaRodada);

        auditoriaService.registrar(
                usuarioLogado,
                "CRIAR_RODADA",
                "RODADA",
                novaRodada.getId(),
                "Rodada " + novaRodada.getNumeroRodada() + " criada."
        );

        publicarEventoRodada(novaRodada, "ROUND_CREATED");

        return toResponse(novaRodada);
    }

    @Transactional
    public Map<String, Object> sortearNumero(Long rodadaId, Usuario usuarioLogado) {
        Rodada rodada = buscarRodada(rodadaId);
        exigirAcesso(rodada, usuarioLogado);

        if (rodada.getStatus() != StatusRodada.EM_ANDAMENTO) {
            throw new RegraNegocioException("A rodada não está em andamento.");
        }

        long quantidadeSorteada = numeroSorteadoRepository.countByRodadaId(rodadaId);

        if (quantidadeSorteada >= 75) {
            throw new RegraNegocioException("Todos os 75 números já foram sorteados.");
        }

        List<Integer> disponiveis = new ArrayList<>();

        for (int numero = 1; numero <= 75; numero++) {
            if (!numeroSorteadoRepository.existsByRodadaIdAndNumero(rodadaId, numero)) {
                disponiveis.add(numero);
            }
        }

        if (disponiveis.isEmpty()) {
            throw new RegraNegocioException("Não há mais números disponíveis para sorteio.");
        }

        Integer numeroSorteado = disponiveis.get(new Random().nextInt(disponiveis.size()));
        Integer ordem = (int) quantidadeSorteada + 1;

        NumeroSorteado registro = NumeroSorteado.builder()
                .rodada(rodada)
                .numero(numeroSorteado)
                .ordem(ordem)
                .sorteadoEm(LocalDateTime.now())
                .sorteadoPor(usuarioLogado)
                .build();

        registro = numeroSorteadoRepository.save(registro);

        auditoriaService.registrar(
                usuarioLogado,
                "SORTEAR_NUMERO",
                "RODADA",
                rodada.getId(),
                "Número " + numeroSorteado + " sorteado na rodada " + rodada.getNumeroRodada() + "."
        );

        Map<String, Object> payload = montarPayloadRodada(rodada, "NUMBER_DRAWN");
        payload.put("id", registro.getId());
        payload.put("numero", registro.getNumero());
        payload.put("numeroSorteado", registro.getNumero());
        payload.put("ordem", registro.getOrdem());
        payload.put("sorteadoEm", registro.getSorteadoEm().toString());

        bingoEventPublisher.publicarRodada(rodada.getId(), payload);
        bingoEventPublisher.publicarSessao(rodada.getSessao().getId(), payload);
        bingoEventPublisher.publicarTv(rodada.getSessao().getId(), payload);

        return payload;
    }

    @Transactional(readOnly = true)
    public RodadaResponse buscarRodadaPorId(Long rodadaId) {
        return toResponse(buscarRodada(rodadaId));
    }

    public Rodada buscarRodada(Long rodadaId) {
        return rodadaRepository.findById(rodadaId)
                .orElseThrow(() -> new RegraNegocioException("Rodada não encontrada."));
    }

    @Transactional(readOnly = true)
    public List<RodadaResponse> listarRodadasDaSessao(Long sessaoId) {
        return rodadaRepository
                .findBySessaoIdOrderByNumeroRodadaDesc(sessaoId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RodadaResponse buscarRodadaAtiva(Long sessaoId) {
        return rodadaRepository
                .findBySessaoIdOrderByNumeroRodadaDesc(sessaoId)
                .stream()
                .filter(rodada -> rodada.getStatus() == StatusRodada.EM_ANDAMENTO
                        || rodada.getStatus() == StatusRodada.CRIADA
                        || rodada.getStatus() == StatusRodada.PAUSADA)
                .findFirst()
                .map(this::toResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listarNumerosDaRodada(Long rodadaId) {
        return numeroSorteadoRepository.findByRodadaIdOrderByOrdemAsc(rodadaId)
                .stream()
                .map(numero -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", numero.getId());
                    item.put("numero", numero.getNumero());
                    item.put("ordem", numero.getOrdem());
                    item.put("rodadaId", numero.getRodada().getId());
                    item.put("sorteadoEm", numero.getSorteadoEm().toString());
                    return item;
                })
                .toList();
    }

    @Transactional
    public RodadaResponse atualizarDadosRodada(
            Long rodadaId,
            Map<String, Object> payload,
            Usuario usuarioLogado
    ) {
        Rodada rodada = buscarRodada(rodadaId);
        exigirAcesso(rodada, usuarioLogado);

        aplicarPremiacaoNaRodada(rodada, payload);
        aplicarPremioAtualNaRodada(rodada, payload);
        aplicarPremiosPagosNaRodada(rodada, payload);

        rodada = rodadaRepository.save(rodada);

        auditoriaService.registrar(
                usuarioLogado,
                "ATUALIZAR_DADOS_RODADA",
                "RODADA",
                rodada.getId(),
                "Dados da rodada " + rodada.getNumeroRodada() + " atualizados."
        );

        publicarEventoRodada(rodada, "ROUND_UPDATED");

        return toResponse(rodada);
    }

    @Transactional
    public RodadaResponse atualizarPremiacao(
            Long rodadaId,
            Map<String, Object> payload,
            Usuario usuarioLogado
    ) {
        Rodada rodada = buscarRodada(rodadaId);
        exigirAcesso(rodada, usuarioLogado);

        aplicarPremiacaoNaRodada(rodada, payload);

        rodada = rodadaRepository.save(rodada);

        auditoriaService.registrar(
                usuarioLogado,
                "ATUALIZAR_PREMIACAO",
                "RODADA",
                rodada.getId(),
                "Premiação da rodada " + rodada.getNumeroRodada() + " atualizada."
        );

        publicarEventoRodada(rodada, "PRIZES_UPDATED");

        return toResponse(rodada);
    }

    @Transactional
    public RodadaResponse atualizarPremioAtual(
            Long rodadaId,
            Map<String, Object> payload,
            Usuario usuarioLogado
    ) {
        Rodada rodada = buscarRodada(rodadaId);
        exigirAcesso(rodada, usuarioLogado);

        aplicarPremioAtualNaRodada(rodada, payload);

        rodada = rodadaRepository.save(rodada);

        auditoriaService.registrar(
                usuarioLogado,
                "ATUALIZAR_PREMIO_ATUAL",
                "RODADA",
                rodada.getId(),
                "Prêmio atual da rodada " + rodada.getNumeroRodada()
                        + " atualizado para " + rodada.getPremioAtual() + "."
        );

        publicarEventoRodada(rodada, "PRIZE_UPDATED");

        return toResponse(rodada);
    }

    @Transactional
    public RodadaResponse atualizarPremiosPagos(
            Long rodadaId,
            Map<String, Object> payload,
            Usuario usuarioLogado
    ) {
        Rodada rodada = buscarRodada(rodadaId);
        exigirAcesso(rodada, usuarioLogado);

        aplicarPremiosPagosNaRodada(rodada, payload);
        aplicarPremioAtualNaRodada(rodada, payload);

        rodada = rodadaRepository.save(rodada);

        auditoriaService.registrar(
                usuarioLogado,
                "ATUALIZAR_PREMIOS_PAGOS",
                "RODADA",
                rodada.getId(),
                "Prêmios pagos da rodada " + rodada.getNumeroRodada() + " atualizados."
        );

        publicarEventoRodada(rodada, "PRIZE_UPDATED");

        return toResponse(rodada);
    }

    private void aplicarPremiacaoNaRodada(Rodada rodada, Map<String, Object> payload) {
        BigDecimal premioLinha = extrairDecimal(payload,
                "linha",
                "premioLinha",
                "valorLinha",
                "primeiraLinha",
                "valorPrimeiraLinha",
                "premioPrimeiraLinha"
        );

        BigDecimal premioBingo = extrairDecimal(payload,
                "bingo",
                "premioBingo",
                "valorBingo",
                "cartelaCheia",
                "valorCartelaCheia",
                "premioCartelaCheia"
        );

        BigDecimal premioDuploBingo = extrairDecimal(payload,
                "duploBingo",
                "duplo_bingo",
                "premioDuploBingo",
                "valorDuploBingo",
                "duplaLinha",
                "valorDuplaLinha",
                "premioDuplaLinha"
        );

        Integer bolaMax = extrairInteger(payload,
                "bolaMax",
                "bola_max",
                "premioBolaMax",
                "numeroBolaMax",
                "valorBolaMax",
                "acumulado"
        );

        BigDecimal valorDoacao = extrairDecimal(payload,
                "doacao",
                "doação",
                "valorDoacao",
                "valorDoação",
                "premioDoacao",
                "arrecadacao"
        );

        if (premioLinha != null) {
            rodada.setPremioLinha(premioLinha);
        }

        if (premioBingo != null) {
            rodada.setPremioBingo(premioBingo);
        }

        if (premioDuploBingo != null) {
            rodada.setPremioDuploBingo(premioDuploBingo);
        }

        if (bolaMax != null) {
            rodada.setBolaMax(Math.max(1, Math.min(75, bolaMax)));
        }

        if (valorDoacao != null) {
            rodada.setValorDoacao(valorDoacao);
        }
    }

    private void aplicarPremioAtualNaRodada(Rodada rodada, Map<String, Object> payload) {
        String premio = extrairString(payload,
                "premioAtual",
                "premio",
                "tipoPremio",
                "premioDaVez",
                "concorrendoAgora",
                "etapaPremio",
                "fasePremio"
        );

        String premioNormalizado = normalizarPremio(premio);

        if (premioNormalizado != null) {
            rodada.setPremioAtual(premioNormalizado);
        }
    }

    private void aplicarPremiosPagosNaRodada(Rodada rodada, Map<String, Object> payload) {
        Object valor = buscarPrimeiroValor(payload,
                "premiosPagos",
                "premios_pagos",
                "pagamentos",
                "premiosFinalizados",
                "premiosMarcados"
        );

        if (valor == null) {
            return;
        }

        if (valor instanceof List<?> lista) {
            List<String> normalizados = lista.stream()
                    .map(item -> normalizarPremio(item == null ? null : String.valueOf(item)))
                    .filter(item -> item != null && !item.isBlank())
                    .toList();

            rodada.setPremiosPagos(String.join(",", normalizados));
            return;
        }

        String texto = String.valueOf(valor).trim();

        if (texto.isBlank()) {
            rodada.setPremiosPagos("");
            return;
        }

        List<String> normalizados = Arrays.stream(texto.split(","))
                .map(String::trim)
                .map(this::normalizarPremio)
                .filter(item -> item != null && !item.isBlank())
                .toList();

        rodada.setPremiosPagos(String.join(",", normalizados));
    }

    private Object buscarPrimeiroValor(Map<String, Object> payload, String... chaves) {
        if (payload == null) {
            return null;
        }

        for (String chave : chaves) {
            if (payload.containsKey(chave)) {
                Object valor = payload.get(chave);

                if (valor != null) {
                    return valor;
                }
            }
        }

        Object data = payload.get("data");
        if (data instanceof Map<?, ?> dataMap) {
            for (String chave : chaves) {
                if (dataMap.containsKey(chave)) {
                    Object valor = dataMap.get(chave);

                    if (valor != null) {
                        return valor;
                    }
                }
            }
        }

        Object premiacao = payload.get("premiacao");
        if (premiacao instanceof Map<?, ?> premiacaoMap) {
            for (String chave : chaves) {
                if (premiacaoMap.containsKey(chave)) {
                    Object valor = premiacaoMap.get(chave);

                    if (valor != null) {
                        return valor;
                    }
                }
            }
        }

        Object premios = payload.get("premios");
        if (premios instanceof Map<?, ?> premiosMap) {
            for (String chave : chaves) {
                if (premiosMap.containsKey(chave)) {
                    Object valor = premiosMap.get(chave);

                    if (valor != null) {
                        return valor;
                    }
                }
            }
        }

        return null;
    }

    private BigDecimal extrairDecimal(Map<String, Object> payload, String... chaves) {
        Object valor = buscarPrimeiroValor(payload, chaves);

        if (valor == null) {
            return null;
        }

        try {
            if (valor instanceof BigDecimal decimal) {
                return decimal;
            }

            if (valor instanceof Number numero) {
                return BigDecimal.valueOf(numero.doubleValue());
            }

            String texto = String.valueOf(valor)
                    .replace("R$", "")
                    .replace(".", "")
                    .replace(",", ".")
                    .trim();

            if (texto.isBlank()) {
                return null;
            }

            return new BigDecimal(texto);
        } catch (Exception ignored) {
            return null;
        }
    }

    private Integer extrairInteger(Map<String, Object> payload, String... chaves) {
        Object valor = buscarPrimeiroValor(payload, chaves);

        if (valor == null) {
            return null;
        }

        try {
            if (valor instanceof Number numero) {
                return numero.intValue();
            }

            String texto = String.valueOf(valor).trim();

            if (texto.isBlank()) {
                return null;
            }

            return Integer.parseInt(texto);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String extrairString(Map<String, Object> payload, String... chaves) {
        Object valor = buscarPrimeiroValor(payload, chaves);

        if (valor == null) {
            return null;
        }

        String texto = String.valueOf(valor).trim();

        return texto.isBlank() ? null : texto;
    }

    private String normalizarPremio(String premio) {
        if (premio == null || premio.isBlank()) {
            return null;
        }

        String texto = premio
                .trim()
                .toUpperCase()
                .replace("Ã", "A")
                .replace("Á", "A")
                .replace("À", "A")
                .replace("Â", "A")
                .replace("É", "E")
                .replace("Ê", "E")
                .replace("Í", "I")
                .replace("Ó", "O")
                .replace("Ô", "O")
                .replace("Õ", "O")
                .replace("Ú", "U")
                .replace("Ç", "C")
                .replace(" ", "_")
                .replace("-", "_");

        if (texto.equals("PRIMEIRA_LINHA")
                || texto.equals("LINHA")
                || texto.contains("PRIMEIRA")) {
            return "PRIMEIRA_LINHA";
        }

        if (texto.equals("CARTELA_CHEIA")
                || texto.equals("BINGO")
                || texto.contains("CARTELA")) {
            return "CARTELA_CHEIA";
        }

        if (texto.equals("DUPLA_LINHA")
                || texto.equals("DUPLO_BINGO")
                || texto.contains("DUPLO")
                || texto.contains("DUPLA")) {
            return "DUPLA_LINHA";
        }

        if (texto.equals("SEGUNDA_LINHA")
                || texto.equals("BOLA_MAX")
                || texto.contains("BOLA")
                || texto.contains("ACUMULADO")) {
            return "SEGUNDA_LINHA";
        }

        if (texto.equals("DOACAO")
                || texto.equals("DOAÇÃO")
                || texto.contains("DOACAO")) {
            return "DOACAO";
        }

        return texto;
    }

    private List<String> premiosPagosComoLista(String premiosPagos) {
        if (premiosPagos == null || premiosPagos.isBlank()) {
            return List.of();
        }

        return Arrays.stream(premiosPagos.split(","))
                .map(String::trim)
                .filter(item -> !item.isBlank())
                .toList();
    }

    private Map<String, Object> montarPayloadRodada(Rodada rodada, String tipoEvento) {
        Map<String, Object> payload = new LinkedHashMap<>();

        payload.put("type", tipoEvento);
        payload.put("rodadaId", rodada.getId());
        payload.put("id", rodada.getId());
        payload.put("sessaoId", rodada.getSessao() != null ? rodada.getSessao().getId() : null);
        payload.put("numeroRodada", rodada.getNumeroRodada());
        payload.put("status", rodada.getStatus() != null ? rodada.getStatus().name() : null);

        payload.put("linha", rodada.getPremioLinha());
        payload.put("premioLinha", rodada.getPremioLinha());
        payload.put("valorLinha", rodada.getPremioLinha());

        payload.put("bingo", rodada.getPremioBingo());
        payload.put("premioBingo", rodada.getPremioBingo());
        payload.put("valorBingo", rodada.getPremioBingo());

        payload.put("duploBingo", rodada.getPremioDuploBingo());
        payload.put("premioDuploBingo", rodada.getPremioDuploBingo());
        payload.put("valorDuploBingo", rodada.getPremioDuploBingo());

        payload.put("bolaMax", rodada.getBolaMax());
        payload.put("premioBolaMax", rodada.getBolaMax());
        payload.put("numeroBolaMax", rodada.getBolaMax());

        payload.put("doacao", rodada.getValorDoacao());
        payload.put("valorDoacao", rodada.getValorDoacao());

        payload.put("premioAtual", rodada.getPremioAtual());
        payload.put("premio", rodada.getPremioAtual());

        payload.put("premiosPagos", premiosPagosComoLista(rodada.getPremiosPagos()));

        if (rodada.getIniciouEm() != null) {
            payload.put("iniciouEm", rodada.getIniciouEm().toString());
        }

        if (rodada.getEncerrouEm() != null) {
            payload.put("encerrouEm", rodada.getEncerrouEm().toString());
            payload.put("timestamp", rodada.getEncerrouEm().toString());
        }

        return payload;
    }

    private void publicarEventoRodada(Rodada rodada, String tipoEvento) {
        Map<String, Object> payload = montarPayloadRodada(rodada, tipoEvento);

        if (rodada.getSessao() != null) {
            bingoEventPublisher.publicarSessao(rodada.getSessao().getId(), payload);
            bingoEventPublisher.publicarTv(rodada.getSessao().getId(), payload);
        }

        bingoEventPublisher.publicarRodada(rodada.getId(), payload);
    }

    private void exigirAcesso(Rodada rodada, Usuario usuarioLogado) {
        if (rodada.getSessao() == null || rodada.getSessao().getSala() == null) {
            throw new RegraNegocioException("A rodada não está vinculada a uma sala.");
        }

        salaAcessoService.exigirAcesso(usuarioLogado, rodada.getSessao().getSala().getId());
    }

    private RodadaResponse toResponse(Rodada rodada) {
        return RodadaResponse.builder()
                .id(rodada.getId())
                .numeroRodada(rodada.getNumeroRodada())
                .status(rodada.getStatus() != null ? rodada.getStatus().name() : "SEM_STATUS")
                .iniciouEm(rodada.getIniciouEm())
                .encerrouEm(rodada.getEncerrouEm())
                .sessaoId(rodada.getSessao() != null ? rodada.getSessao().getId() : null)

                .linha(rodada.getPremioLinha())
                .premioLinha(rodada.getPremioLinha())
                .valorLinha(rodada.getPremioLinha())

                .bingo(rodada.getPremioBingo())
                .premioBingo(rodada.getPremioBingo())
                .valorBingo(rodada.getPremioBingo())

                .duploBingo(rodada.getPremioDuploBingo())
                .premioDuploBingo(rodada.getPremioDuploBingo())
                .valorDuploBingo(rodada.getPremioDuploBingo())

                .bolaMax(rodada.getBolaMax())
                .premioBolaMax(rodada.getBolaMax())
                .numeroBolaMax(rodada.getBolaMax())

                .doacao(rodada.getValorDoacao())
                .valorDoacao(rodada.getValorDoacao())

                .premioAtual(rodada.getPremioAtual())
                .premio(rodada.getPremioAtual())
                .premiosPagos(premiosPagosComoLista(rodada.getPremiosPagos()))
                .build();
    }
}

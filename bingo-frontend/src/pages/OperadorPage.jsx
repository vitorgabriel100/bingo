import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";
import useWebSocket from "../hooks/useWebSocket";

export default function OperadorPage() {
  const navigate = useNavigate();

  const [sessaoId, setSessaoId] = useState(null);
  const [rodadaId, setRodadaId] = useState(null);
  const [numeroRodada, setNumeroRodada] = useState(null);

  const [numeroAtual, setNumeroAtual] = useState(null);
  const [numeroAnimado, setNumeroAnimado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [mensagem, setMensagem] = useState("Preparando sessão...");
  const [statusRodada, setStatusRodada] = useState("AGUARDANDO");
  const [autoSorteio, setAutoSorteio] = useState(false);
  const [sorteando, setSorteando] = useState(false);
  const [sorteioLiberado, setSorteioLiberado] = useState(false);

  const [premioAtual, setPremioAtual] = useState("PRIMEIRA_LINHA");
  const [premiosPagos, setPremiosPagos] = useState([]);

  const [mostrarModalPremiacao, setMostrarModalPremiacao] = useState(false);
  const [salvandoPremiacao, setSalvandoPremiacao] = useState(false);

  const [premiacaoRodada, setPremiacaoRodada] = useState({
    linha: "",
    bingo: "",
    duploBingo: "",
    bolaMax: "60",
    doacao: "",
  });

  const timeoutAutoRef = useRef(null);
  const timeoutLiberarSorteioRef = useRef(null);
  const numerosRegistradosRef = useRef(new Set());

  const numeros = Array.from({ length: 75 }, (_, i) => i + 1);

  const INTERVALO_AUTO_MS = 10000;
  const TEMPO_CONTAGEM_TV_MS = 14500;

  const opcoesPremio = [
    { value: "PRIMEIRA_LINHA", label: "Linha", campo: "linha" },
    { value: "CARTELA_CHEIA", label: "Bingo", campo: "bingo" },
    { value: "DUPLA_LINHA", label: "Duplo Bingo", campo: "duploBingo" },
    { value: "SEGUNDA_LINHA", label: "Bola Max", campo: "bolaMax" },
  ];

  const opcoesValores = [
    { campo: "linha", label: "Linha", tipo: "moeda", passos: [5, 10, 50] },
    { campo: "bingo", label: "Bingo", tipo: "moeda", passos: [10, 50, 100] },
    {
      campo: "duploBingo",
      label: "Duplo Bingo",
      tipo: "moeda",
      passos: [10, 50, 100],
    },
    { campo: "bolaMax", label: "Bola Max", tipo: "numero", passos: [1, 5, 10] },
    { campo: "doacao", label: "Doação", tipo: "moeda", passos: [1, 5, 10] },
  ];

  function formatarPremio(premio) {
    const mapa = {
      PRIMEIRA_LINHA: "Linha",
      SEGUNDA_LINHA: "Bola Max",
      BOLA_MAX: "Bola Max",
      DUPLA_LINHA: "Duplo Bingo",
      CARTELA_CHEIA: "Bingo",
      DOACAO: "Doação",
    };

    return mapa[premio] || premio;
  }

  function formatarMoeda(valor) {
    if (valor === null || valor === undefined || valor === "") return "--";

    const numero = Number(String(valor).replace(",", "."));

    if (!Number.isFinite(numero)) return `R$ ${valor}`;

    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function valorAtualFormatado(campo) {
    const valor = premiacaoRodada[campo];

    if (campo === "bolaMax") {
      return valor ? `Até a bola ${valor}` : "--";
    }

    return formatarMoeda(valor);
  }

  function valorPremioAtual(premio = premioAtual) {
    if (premio === "PRIMEIRA_LINHA") return formatarMoeda(premiacaoRodada.linha);
    if (premio === "CARTELA_CHEIA") return formatarMoeda(premiacaoRodada.bingo);
    if (premio === "DUPLA_LINHA") return formatarMoeda(premiacaoRodada.duploBingo);

    if (premio === "SEGUNDA_LINHA" || premio === "BOLA_MAX") {
      return premiacaoRodada.bolaMax
        ? `Até a bola ${premiacaoRodada.bolaMax}`
        : "--";
    }

    if (premio === "DOACAO") return formatarMoeda(premiacaoRodada.doacao);

    return "--";
  }

  function proximoPremio(premio) {
    const index = opcoesPremio.findIndex((p) => p.value === premio);
    const proximo = opcoesPremio[index + 1];
    return proximo ? proximo.value : premio;
  }

  function statusFinalizado(status) {
    return ["FINALIZADA", "FINALIZADO", "ENCERRADA", "ENCERRADO"].includes(
      String(status || "").toUpperCase()
    );
  }

  function limparRodadaSelecionada() {
    setRodadaId(null);
    setNumeroRodada(null);
    setStatusRodada("AGUARDANDO");
    setSorteioLiberado(false);
    setAutoSorteio(false);
    setSorteando(false);
    setPremioAtual("PRIMEIRA_LINHA");
    setPremiosPagos([]);
    setPremiacaoRodada({
      linha: "",
      bingo: "",
      duploBingo: "",
      bolaMax: "60",
      doacao: "",
    });
  }

  function liberarSorteioAposContagem() {
    if (timeoutLiberarSorteioRef.current) {
      clearTimeout(timeoutLiberarSorteioRef.current);
    }

    setSorteioLiberado(false);
    setMensagem("Rodada iniciada. Aguarde a contagem da TV.");

    timeoutLiberarSorteioRef.current = setTimeout(() => {
      setSorteioLiberado(true);
      setMensagem("Rodada pronta para sorteio.");
    }, TEMPO_CONTAGEM_TV_MS);
  }

  function iniciarAnimacaoBolinha(numero) {
    setNumeroAnimado(null);
    setSorteando(true);

    setTimeout(() => {
      setNumeroAnimado(numero);
      setNumeroAtual(numero);
      setSorteando(false);
    }, 120);
  }

  function extrairLista(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  }

  function extrairNumeroSorteado(data) {
    if (typeof data === "number") return data;

    return (
      data?.numero ??
      data?.numeroSorteado ??
      data?.valor ??
      data?.bola ??
      data?.numeroAtual ??
      data?.number ??
      data?.data?.numero ??
      data?.data?.numeroSorteado ??
      null
    );
  }

  function montarFontes(data) {
    return [
      data,
      data?.data,
      data?.payload,
      data?.body,
      data?.rodada,
      data?.round,
      data?.premiacao,
      data?.premiacaoAtual,
      data?.premios,
      data?.valoresPremio,
    ].filter(Boolean);
  }

  function buscarValorEmFontes(fontes, chaves) {
    for (const fonte of fontes) {
      if (!fonte || typeof fonte !== "object") continue;

      for (const chave of chaves) {
        const valor = fonte[chave];

        if (valor !== undefined && valor !== null && valor !== "") {
          return valor;
        }
      }
    }

    return undefined;
  }

  function normalizarPremiacaoFonte(data) {
    if (!data) return null;

    const fontes = montarFontes(data);

    const linha = buscarValorEmFontes(fontes, [
      "linha",
      "premioLinha",
      "valorLinha",
      "primeiraLinha",
      "valorPrimeiraLinha",
      "premioPrimeiraLinha",
    ]);

    const bingo = buscarValorEmFontes(fontes, [
      "bingo",
      "premioBingo",
      "valorBingo",
      "cartelaCheia",
      "valorCartelaCheia",
      "premioCartelaCheia",
    ]);

    const duploBingo = buscarValorEmFontes(fontes, [
      "duploBingo",
      "duplo_bingo",
      "premioDuploBingo",
      "valorDuploBingo",
      "duplaLinha",
      "valorDuplaLinha",
      "premioDuplaLinha",
    ]);

    const bolaMax = buscarValorEmFontes(fontes, [
      "bolaMax",
      "bola_max",
      "premioBolaMax",
      "numeroBolaMax",
      "valorBolaMax",
      "acumulado",
    ]);

    const doacao = buscarValorEmFontes(fontes, [
      "doacao",
      "doação",
      "valorDoacao",
      "valorDoação",
      "premioDoacao",
      "arrecadacao",
    ]);

    const premiacao = {};

    if (linha !== undefined) premiacao.linha = linha;
    if (bingo !== undefined) premiacao.bingo = bingo;
    if (duploBingo !== undefined) premiacao.duploBingo = duploBingo;
    if (bolaMax !== undefined) premiacao.bolaMax = bolaMax;
    if (doacao !== undefined) premiacao.doacao = doacao;

    return Object.keys(premiacao).length > 0 ? premiacao : null;
  }

  function normalizarPremioAtual(valor) {
    if (!valor) return null;

    const texto = String(valor)
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (
      texto === "PRIMEIRA_LINHA" ||
      texto === "LINHA" ||
      texto.includes("PRIMEIRA")
    ) {
      return "PRIMEIRA_LINHA";
    }

    if (
      texto === "CARTELA_CHEIA" ||
      texto === "BINGO" ||
      texto.includes("CARTELA")
    ) {
      return "CARTELA_CHEIA";
    }

    if (
      texto === "DUPLA_LINHA" ||
      texto === "DUPLO_BINGO" ||
      texto.includes("DUPLO") ||
      texto.includes("DUPLA")
    ) {
      return "DUPLA_LINHA";
    }

    if (
      texto === "SEGUNDA_LINHA" ||
      texto === "BOLA_MAX" ||
      texto.includes("BOLA") ||
      texto.includes("ACUMULADO")
    ) {
      return "SEGUNDA_LINHA";
    }

    if (texto === "DOACAO" || texto.includes("DOACAO")) {
      return "DOACAO";
    }

    return valor;
  }

  function extrairPremioAtual(data) {
    const fontes = montarFontes(data);

    const premio = buscarValorEmFontes(fontes, [
      "premioAtual",
      "premio",
      "tipoPremio",
      "premioDaVez",
      "concorrendoAgora",
      "etapaPremio",
      "fasePremio",
    ]);

    return normalizarPremioAtual(premio);
  }

  function extrairPremiosPagos(data) {
    const fontes = montarFontes(data);

    const pagos = buscarValorEmFontes(fontes, [
      "premiosPagos",
      "premios_pagos",
      "pagamentos",
      "premiosFinalizados",
      "premiosMarcados",
    ]);

    if (Array.isArray(pagos)) {
      return pagos.map(normalizarPremioAtual).filter(Boolean);
    }

    if (typeof pagos === "string") {
      return pagos
        .split(",")
        .map((item) => normalizarPremioAtual(item.trim()))
        .filter(Boolean);
    }

    return null;
  }

  function aplicarDadosRodada(data) {
    if (!data) return;

    const fontes = montarFontes(data);
    const id = buscarValorEmFontes(fontes, ["id", "rodadaId"]);

    const numero = buscarValorEmFontes(fontes, [
      "numeroRodada",
      "numero_rodada",
      "ordemRodada",
    ]);

    const status = buscarValorEmFontes(fontes, ["status", "situacao"]);

    const premiacao = normalizarPremiacaoFonte(data);
    const premio = extrairPremioAtual(data);
    const pagos = extrairPremiosPagos(data);

    if (id) setRodadaId(id);
    if (numero) setNumeroRodada(numero);
    if (status) setStatusRodada(status);

    if (premiacao) {
      setPremiacaoRodada((prev) => ({
        ...prev,
        ...premiacao,
      }));
    }

    if (premio) {
      setPremioAtual(premio);
    }

    if (pagos) {
      setPremiosPagos(pagos);
    }
  }

  function montarPayloadPremiacao(premiacao = premiacaoRodada) {
    return {
      linha: premiacao.linha,
      bingo: premiacao.bingo,
      duploBingo: premiacao.duploBingo,
      bolaMax: premiacao.bolaMax,
      doacao: premiacao.doacao,

      premioLinha: premiacao.linha,
      premioBingo: premiacao.bingo,
      premioDuploBingo: premiacao.duploBingo,
      premioBolaMax: premiacao.bolaMax,
      valorDoacao: premiacao.doacao,
    };
  }

  async function tentarRequisicoes(requisicoes) {
    let ultimoErro = null;

    for (const requisicao of requisicoes) {
      try {
        let response;

        if (requisicao.metodo === "get") {
          response = await api.get(requisicao.url);
        }

        if (requisicao.metodo === "post") {
          response = await api.post(requisicao.url, requisicao.body);
        }

        if (requisicao.metodo === "patch") {
          response = await api.patch(requisicao.url, requisicao.body);
        }

        if (requisicao.metodo === "put") {
          response = await api.put(requisicao.url, requisicao.body);
        }

        return response?.data;
      } catch (error) {
        ultimoErro = error;
      }
    }

    throw ultimoErro || new Error("Nenhuma rota do backend respondeu.");
  }

  async function carregarDadosRodada(idRodada) {
    if (!idRodada) return;

    try {
      const data = await tentarRequisicoes([
        { metodo: "get", url: `/rodadas/${idRodada}` },
        { metodo: "get", url: `/rodadas/${idRodada}/premiacao` },
        { metodo: "get", url: `/rodadas/${idRodada}/premios` },
      ]);

      aplicarDadosRodada(data);
    } catch (error) {
      console.warn("Não foi possível carregar dados completos da rodada:", error);
    }
  }

  async function atualizarPremiacaoBackend(
    novaPremiacao = premiacaoRodada,
    idRodada = rodadaId,
    mostrarMensagem = true
  ) {
    if (!idRodada) {
      setMensagem("Crie ou selecione uma rodada antes de alterar os valores.");
      return;
    }

    try {
      setSalvandoPremiacao(true);

      const payload = montarPayloadPremiacao(novaPremiacao);

      const data = await tentarRequisicoes([
        {
          metodo: "patch",
          url: `/rodadas/${idRodada}/premiacao`,
          body: payload,
        },
        {
          metodo: "patch",
          url: `/rodadas/${idRodada}/premios`,
          body: payload,
        },
        {
          metodo: "patch",
          url: `/rodadas/${idRodada}`,
          body: payload,
        },
      ]);

      setPremiacaoRodada((prev) => ({
        ...prev,
        ...novaPremiacao,
      }));

      aplicarDadosRodada({
        ...payload,
        ...data,
      });

      await carregarDadosRodada(idRodada);

      if (mostrarMensagem) {
        setMensagem("Valores da premiação atualizados pelo backend.");
      }
    } catch (error) {
      console.error("Erro ao atualizar premiação:", error);
      console.error("Status:", error.response?.status);
      console.error("Resposta do backend:", error.response?.data);

      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          error?.response?.data?.erro ||
          "Erro ao atualizar premiação. Confirme se o backend possui rota para salvar os prêmios."
      );
    } finally {
      setSalvandoPremiacao(false);
    }
  }

  async function atualizarPremioAtualBackend(
    novoPremio,
    idRodada = rodadaId,
    mostrarMensagem = true
  ) {
    if (!idRodada) {
      setMensagem("Crie ou selecione uma rodada antes de alterar o prêmio atual.");
      return;
    }

    if (premiosPagos.includes(novoPremio)) {
      setMensagem(`${formatarPremio(novoPremio)} já foi marcado como pago.`);
      return;
    }

    try {
      const payload = {
        premioAtual: novoPremio,
        premio: novoPremio,
        tipoPremio: novoPremio,
      };

      const data = await tentarRequisicoes([
        {
          metodo: "patch",
          url: `/rodadas/${idRodada}/premio-atual`,
          body: payload,
        },
        {
          metodo: "patch",
          url: `/rodadas/${idRodada}/premio`,
          body: payload,
        },
        {
          metodo: "patch",
          url: `/rodadas/${idRodada}`,
          body: payload,
        },
      ]);

      setPremioAtual(extrairPremioAtual(data) || novoPremio);
      aplicarDadosRodada({
        ...payload,
        ...data,
      });

      await carregarDadosRodada(idRodada);

      if (mostrarMensagem) {
        setMensagem(`Agora concorrendo a: ${formatarPremio(novoPremio)}.`);
      }
    } catch (error) {
      console.error("Erro ao atualizar prêmio atual:", error);
      console.error("Status:", error.response?.status);
      console.error("Resposta do backend:", error.response?.data);

      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          error?.response?.data?.erro ||
          "Erro ao atualizar prêmio atual no backend."
      );
    }
  }

  async function atualizarPremiosPagosBackend(
    novosPremiosPagos,
    novoPremioAtual = premioAtual,
    mostrarMensagem = true
  ) {
    if (!rodadaId) {
      setMensagem("Crie ou selecione uma rodada antes de marcar pagamento.");
      return;
    }

    try {
      const payload = {
        premiosPagos: novosPremiosPagos,
        premios_pagos: novosPremiosPagos,
        premioAtual: novoPremioAtual,
        premio: novoPremioAtual,
      };

      const data = await tentarRequisicoes([
        {
          metodo: "patch",
          url: `/rodadas/${rodadaId}/premios-pagos`,
          body: payload,
        },
        {
          metodo: "patch",
          url: `/rodadas/${rodadaId}/premios/status`,
          body: payload,
        },
        {
          metodo: "patch",
          url: `/rodadas/${rodadaId}`,
          body: payload,
        },
      ]);

      setPremiosPagos(novosPremiosPagos);
      setPremioAtual(novoPremioAtual);

      aplicarDadosRodada({
        ...payload,
        ...data,
      });

      await carregarDadosRodada(rodadaId);

      if (mostrarMensagem) {
        setMensagem("Pagamento/prêmios atualizados pelo backend.");
      }
    } catch (error) {
      console.error("Erro ao atualizar prêmios pagos:", error);
      console.error("Status:", error.response?.status);
      console.error("Resposta do backend:", error.response?.data);

      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          error?.response?.data?.erro ||
          "Erro ao atualizar prêmios pagos no backend."
      );
    }
  }

  async function alterarValorPremiacao(campo, delta) {
    const valorAtual = Number(String(premiacaoRodada[campo] || 0).replace(",", "."));
    const valorSeguro = Number.isFinite(valorAtual) ? valorAtual : 0;

    let novoValor = valorSeguro + delta;

    if (campo === "bolaMax") {
      novoValor = Math.max(1, Math.min(75, Math.round(novoValor)));
    } else {
      novoValor = Math.max(0, novoValor);
    }

    const novaPremiacao = {
      ...premiacaoRodada,
      [campo]: String(novoValor),
    };

    setPremiacaoRodada(novaPremiacao);

    await atualizarPremiacaoBackend(novaPremiacao);
  }

  function atualizarPremiacao(campo, valor) {
    setPremiacaoRodada((prev) => ({
      ...prev,
      [campo]: valor,
    }));
  }

  function premiacaoValida() {
    return (
      premiacaoRodada.linha &&
      premiacaoRodada.bingo &&
      premiacaoRodada.duploBingo &&
      premiacaoRodada.bolaMax &&
      premiacaoRodada.doacao
    );
  }

  function registrarNumeroSorteado(numero) {
    const numeroNormalizado = Number(numero);

    if (!Number.isFinite(numeroNormalizado)) {
      console.error("Número sorteado inválido:", numero);
      setMensagem("Número sorteado inválido.");
      setSorteando(false);
      return;
    }

    if (numerosRegistradosRef.current.has(numeroNormalizado)) {
      setSorteando(false);
      return;
    }

    numerosRegistradosRef.current.add(numeroNormalizado);

    iniciarAnimacaoBolinha(numeroNormalizado);

    setHistorico((prev) => {
      if (prev.includes(numeroNormalizado)) return prev;
      return [...prev, numeroNormalizado];
    });

    setMensagem(`Saiu o ${String(numeroNormalizado).padStart(2, "0")}!`);
  }

  async function criarSessaoAutomatica() {
    const tentativas = [
      () => api.post("/sessoes", { nome: "Sessão Principal" }),
      () => api.post("/sessoes", { descricao: "Sessão Principal" }),
      () => api.post("/sessoes"),
    ];

    for (const tentativa of tentativas) {
      try {
        const response = await tentativa();
        if (response.data?.id) return response.data;
      } catch {
        // tenta o próximo formato
      }
    }

    throw new Error("Não foi possível criar sessão automaticamente.");
  }

  async function carregarOuCriarSessao() {
    try {
      setMensagem("Buscando sessão...");

      try {
        const ativa = await api.get("/sessoes/ativa");

        if (ativa.data?.id) {
          setSessaoId(ativa.data.id);
          return ativa.data.id;
        }
      } catch {
        // continua
      }

      const response = await api.get("/sessoes");
      const sessoes = extrairLista(response.data);

      if (sessoes.length > 0) {
        const sessao =
          sessoes.find(
            (s) =>
              s.status === "ATIVA" ||
              s.status === "EM_ANDAMENTO" ||
              s.status === "AGENDADA" ||
              s.ativa === true
          ) || sessoes[0];

        setSessaoId(sessao.id);
        return sessao.id;
      }

      const novaSessao = await criarSessaoAutomatica();

      setSessaoId(novaSessao.id);
      setMensagem("Sessão criada automaticamente.");

      return novaSessao.id;
    } catch (error) {
      console.error("Erro ao carregar/criar sessão:", error);

      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          "Erro ao carregar ou criar sessão."
      );

      return null;
    }
  }

  async function carregarRodadaAtiva(idSessao) {
    if (!idSessao) return;

    try {
      const response = await api.get(`/rodadas/sessao/${idSessao}/ativa`);

      if (response.data?.id) {
        const status = response.data.status || "AGUARDANDO";

        if (statusFinalizado(status)) {
          limparRodadaSelecionada();
          setMensagem("Nenhuma rodada ativa. Crie uma nova rodada.");
          return;
        }

        aplicarDadosRodada(response.data);

        setRodadaId(response.data.id);
        setNumeroRodada(response.data.numeroRodada);
        setStatusRodada(status);

        if (status === "EM_ANDAMENTO") {
          setSorteioLiberado(true);
        } else {
          setSorteioLiberado(false);
        }

        await carregarDadosRodada(response.data.id);

        setMensagem(`Rodada ${response.data.numeroRodada || response.data.id} carregada.`);
      } else {
        limparRodadaSelecionada();
        setMensagem("Nenhuma rodada ativa. Crie uma nova rodada.");
      }
    } catch {
      limparRodadaSelecionada();
      setMensagem("Nenhuma rodada ativa. Crie uma nova rodada.");
    }
  }

  async function carregarHistorico(idRodada) {
    if (!idRodada) return;

    try {
      const response = await api.get(`/rodadas/${idRodada}/numeros`);

      const numerosSorteados = extrairLista(response.data)
        .map((item) => item?.numero ?? item?.numeroSorteado ?? item)
        .filter((numero) => numero !== null && numero !== undefined)
        .map(Number)
        .filter((numero) => Number.isFinite(numero));

      numerosRegistradosRef.current = new Set(numerosSorteados);

      setHistorico(numerosSorteados);

      const ultimoNumero =
        numerosSorteados.length > 0
          ? numerosSorteados[numerosSorteados.length - 1]
          : null;

      setNumeroAtual(ultimoNumero);
      setNumeroAnimado(ultimoNumero);
    } catch (error) {
      console.error("Erro ao carregar histórico", error);
      setMensagem("Erro ao carregar histórico da rodada.");
    }
  }

  const handleWsMessage = useCallback((event) => {
    if (!event?.type) return;

    const tiposAtualizacaoPremio = [
      "PRIZE_UPDATED",
      "PRIZES_UPDATED",
      "PREMIO_ATUALIZADO",
      "PREMIACAO_ATUALIZADA",
      "PREMIOS_ATUALIZADOS",
      "ROUND_PRIZE_UPDATED",
      "ROUND_PRIZES_UPDATED",
      "ROUND_UPDATED",
    ];

    if (tiposAtualizacaoPremio.includes(event.type)) {
      aplicarDadosRodada(event);
      setMensagem("Premiação atualizada pelo backend.");
      return;
    }

    if (event.type === "NUMBER_DRAWN") {
      aplicarDadosRodada(event);

      const numero = extrairNumeroSorteado(event);

      if (numero !== null && numero !== undefined) {
        registrarNumeroSorteado(numero);
      }

      return;
    }

    if (event.type === "ROUND_CREATED") {
      const idRodada = event.rodadaId || event.id;

      if (idRodada) {
        setRodadaId(idRodada);
      }

      if (event.numeroRodada) {
        setNumeroRodada(event.numeroRodada);
      }

      aplicarDadosRodada(event);

      setStatusRodada(event.status || "CRIADA");
      setSorteioLiberado(false);
      setMensagem(`Rodada ${event.numeroRodada || idRodada} criada.`);
      return;
    }

    if (event.type === "ROUND_STARTED" || event.type === "GAME_STARTED") {
      const idRodada = event.rodadaId || event.id;

      if (idRodada) {
        setRodadaId(idRodada);
      }

      if (event.numeroRodada) {
        setNumeroRodada(event.numeroRodada);
      }

      aplicarDadosRodada(event);

      setStatusRodada("EM_ANDAMENTO");
      liberarSorteioAposContagem();

      return;
    }

    if (event.type === "ROUND_PAUSED") {
      setStatusRodada("PAUSADA");
      setAutoSorteio(false);
      setSorteioLiberado(false);
      setMensagem("Rodada pausada.");

      return;
    }

    if (event.type === "ROUND_FINISHED") {
      setStatusRodada("FINALIZADA");
      setRodadaId(null);
      setNumeroRodada(null);
      setAutoSorteio(false);
      setSorteioLiberado(false);
      setSorteando(false);
      setMensagem("Rodada encerrada.");
    }
  }, []);

  useWebSocket({
    sessaoId,
    rodadaId,
    onMessage: handleWsMessage,
  });

  useEffect(() => {
    async function iniciarTela() {
      const idSessao = await carregarOuCriarSessao();

      if (!idSessao) return;

      await carregarRodadaAtiva(idSessao);
    }

    iniciarTela();
  }, []);

  useEffect(() => {
    carregarHistorico(rodadaId);
    carregarDadosRodada(rodadaId);
  }, [rodadaId]);

  function abrirModalNovaRodada() {
    setPremiacaoRodada({
      linha: "",
      bingo: "",
      duploBingo: "",
      bolaMax: "60",
      doacao: "",
    });

    setMostrarModalPremiacao(true);
  }

  async function iniciarRodada() {
    if (!rodadaId) {
      setMensagem("Crie ou selecione uma rodada antes de iniciar.");
      return;
    }

    if (statusFinalizado(statusRodada)) {
      setMensagem("Essa rodada já foi encerrada. Crie uma nova rodada.");
      limparRodadaSelecionada();
      return;
    }

    try {
      setAutoSorteio(false);
      setSorteioLiberado(false);
      setMensagem("Iniciando rodada...");

      const response = await api.patch(`/rodadas/${rodadaId}/iniciar`);

      aplicarDadosRodada(response.data);

      const novoStatus = response.data?.status || "EM_ANDAMENTO";

      setStatusRodada(novoStatus);

      liberarSorteioAposContagem();
    } catch (error) {
      console.error("Erro ao iniciar rodada:", error);
      console.error("Status:", error.response?.status);
      console.error("Resposta do backend:", error.response?.data);

      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          error?.response?.data?.erro ||
          "Erro ao iniciar rodada."
      );
    }
  }

  async function pausarRodada() {
    if (!rodadaId) {
      setMensagem("Nenhuma rodada selecionada.");
      return;
    }

    if (statusFinalizado(statusRodada)) {
      setMensagem("Essa rodada já está encerrada.");
      limparRodadaSelecionada();
      return;
    }

    try {
      const response = await api.patch(`/rodadas/${rodadaId}/pausar`);

      aplicarDadosRodada(response.data);

      setStatusRodada(response.data.status || "PAUSADA");
      setAutoSorteio(false);
      setSorteioLiberado(false);
      setMensagem("Rodada pausada.");
    } catch (error) {
      console.error("Erro ao pausar rodada:", error);
      console.error("Status:", error.response?.status);
      console.error("Resposta do backend:", error.response?.data);

      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          error?.response?.data?.erro ||
          "Erro ao pausar rodada."
      );
    }
  }

  async function encerrarRodada() {
    if (!rodadaId) {
      setMensagem("Nenhuma rodada selecionada.");
      return;
    }

    if (statusFinalizado(statusRodada)) {
      setMensagem("Essa rodada já está encerrada.");
      limparRodadaSelecionada();
      return;
    }

    try {
      setAutoSorteio(false);
      setSorteioLiberado(false);
      setSorteando(false);
      setMensagem("Encerrando rodada...");

      const response = await api.patch(`/rodadas/${rodadaId}/encerrar`);

      console.log("Rodada encerrada:", response.data);

      const novoStatus = response.data?.status || "FINALIZADA";

      setStatusRodada(novoStatus);
      setAutoSorteio(false);
      setSorteioLiberado(false);
      setSorteando(false);
      setRodadaId(null);
      setNumeroRodada(null);
      setMensagem("Rodada encerrada com sucesso.");
    } catch (error) {
      console.error("Erro ao encerrar rodada:", error);
      console.error("Status:", error.response?.status);
      console.error("Resposta do backend:", error.response?.data);

      const mensagemErro =
        error?.response?.data?.mensagem ||
        error?.response?.data?.message ||
        error?.response?.data?.erro ||
        error?.response?.data ||
        "Erro ao encerrar rodada.";

      setMensagem(`Erro ao encerrar rodada: ${mensagemErro}`);
    }
  }

  async function sortearNumero() {
    if (!rodadaId) {
      setMensagem("Crie ou selecione uma rodada antes de sortear.");
      return;
    }

    if (statusFinalizado(statusRodada)) {
      setMensagem("Essa rodada já foi encerrada. Crie uma nova rodada.");
      limparRodadaSelecionada();
      return;
    }

    if (statusRodada !== "EM_ANDAMENTO") {
      setMensagem("Inicie a rodada antes de sortear.");
      return;
    }

    if (!sorteioLiberado) {
      setMensagem("Aguarde a contagem terminar na TV.");
      return;
    }

    if (historico.length >= 75) {
      setMensagem("Todos os 75 números já foram sorteados.");
      setAutoSorteio(false);
      return;
    }

    if (sorteando) {
      return;
    }

    try {
      setSorteando(true);
      setMensagem("Sorteando número...");

      const response = await api.post(`/rodadas/${rodadaId}/sortear`);

      aplicarDadosRodada(response.data);

      const numero = extrairNumeroSorteado(response.data);

      if (numero === null || numero === undefined) {
        setMensagem("Sorteio realizado, mas o número não veio na resposta.");
        setSorteando(false);
        return;
      }

      registrarNumeroSorteado(numero);
    } catch (error) {
      console.error("Erro ao sortear número:", error);
      console.error("Status:", error.response?.status);
      console.error("Resposta do backend:", error.response?.data);

      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          error?.response?.data?.erro ||
          "Erro ao sortear número."
      );

      setAutoSorteio(false);
      setSorteando(false);
    }
  }

  async function novaRodada() {
    if (!premiacaoValida()) {
      setMensagem("Preencha todos os valores da premiação.");
      return;
    }

    let idSessao = sessaoId;

    if (!idSessao) {
      idSessao = await carregarOuCriarSessao();
    }

    if (!idSessao) {
      setMensagem("Não foi possível localizar ou criar uma sessão.");
      return;
    }

    try {
      if (timeoutLiberarSorteioRef.current) {
        clearTimeout(timeoutLiberarSorteioRef.current);
      }

      if (timeoutAutoRef.current) {
        clearTimeout(timeoutAutoRef.current);
      }

      const payloadNovaRodada = {
        ...montarPayloadPremiacao(premiacaoRodada),
        premioAtual: "PRIMEIRA_LINHA",
        premio: "PRIMEIRA_LINHA",
        premiosPagos: [],
      };

      const response = await api.post(`/rodadas/sessao/${idSessao}`, payloadNovaRodada);

      const novaRodadaId = response.data.id;

      setRodadaId(novaRodadaId);
      setNumeroRodada(response.data.numeroRodada);

      aplicarDadosRodada({
        ...payloadNovaRodada,
        ...response.data,
      });

      await atualizarPremiacaoBackend(premiacaoRodada, novaRodadaId, false);
      await atualizarPremioAtualBackend("PRIMEIRA_LINHA", novaRodadaId, false);

      numerosRegistradosRef.current = new Set();

      setNumeroAtual(null);
      setNumeroAnimado(null);
      setHistorico([]);
      setStatusRodada(response.data.status || "CRIADA");
      setAutoSorteio(false);
      setSorteando(false);
      setSorteioLiberado(false);
      setPremioAtual("PRIMEIRA_LINHA");
      setPremiosPagos([]);
      setMostrarModalPremiacao(false);

      await carregarDadosRodada(novaRodadaId);

      setMensagem(`Nova rodada criada: rodada ${response.data.numeroRodada || novaRodadaId}.`);
    } catch (error) {
      console.error("Erro ao criar nova rodada:", error);
      console.error("Status:", error.response?.status);
      console.error("Resposta do backend:", error.response?.data);

      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          error?.response?.data?.erro ||
          "Erro ao criar nova rodada. Confirme se o backend aceita salvar premiação."
      );
    }
  }

  async function selecionarPremioAtual(premio) {
    await atualizarPremioAtualBackend(premio);
  }

  async function marcarGanhador(premio) {
    if (premiosPagos.includes(premio)) {
      setMensagem(`${formatarPremio(premio)} já foi marcado como pago.`);
      return;
    }

    const novosPremiosPagos = [...premiosPagos, premio];
    const proximo = proximoPremio(premio);

    const novoPremioAtual =
      proximo !== premio && !novosPremiosPagos.includes(proximo)
        ? proximo
        : premioAtual;

    await atualizarPremiosPagosBackend(novosPremiosPagos, novoPremioAtual, false);

    if (novoPremioAtual !== premioAtual) {
      setMensagem(
        `${formatarPremio(premio)} pago. Agora concorrendo a: ${formatarPremio(
          novoPremioAtual
        )}.`
      );
    } else {
      setMensagem(`${formatarPremio(premio)} pago.`);
    }
  }

  async function desfazerPremios() {
    await atualizarPremiosPagosBackend([], "PRIMEIRA_LINHA", false);
    setMensagem("Marcações de prêmio reiniciadas no backend.");
  }

  useEffect(() => {
    if (timeoutAutoRef.current) {
      clearTimeout(timeoutAutoRef.current);
    }

    if (!autoSorteio) return;
    if (statusRodada !== "EM_ANDAMENTO") return;
    if (!sorteioLiberado) return;
    if (!rodadaId) return;
    if (sorteando) return;

    if (historico.length >= 75) {
      setAutoSorteio(false);
      return;
    }

    timeoutAutoRef.current = setTimeout(() => {
      sortearNumero();
    }, INTERVALO_AUTO_MS);

    return () => {
      if (timeoutAutoRef.current) {
        clearTimeout(timeoutAutoRef.current);
      }
    };
  }, [
    autoSorteio,
    statusRodada,
    sorteioLiberado,
    rodadaId,
    historico.length,
    sorteando,
  ]);

  useEffect(() => {
    return () => {
      if (timeoutAutoRef.current) {
        clearTimeout(timeoutAutoRef.current);
      }

      if (timeoutLiberarSorteioRef.current) {
        clearTimeout(timeoutLiberarSorteioRef.current);
      }
    };
  }, []);

  const rodadaEstaFinalizada = statusFinalizado(statusRodada);

  const sorteioBloqueado =
    !rodadaId ||
    rodadaEstaFinalizada ||
    statusRodada !== "EM_ANDAMENTO" ||
    !sorteioLiberado ||
    historico.length >= 75 ||
    sorteando;

  const ultimosNove = historico.slice(-9).reverse();
  const ordemAtual = historico.length;

  return (
    <Layout title="Operador">
      <div className="operator-mobile-panel">
        <section className="operator-mobile-header">
          <div className="operator-mobile-status">
            <div>
              <span className="operator-mini-label">Sessão</span>
              <strong>{sessaoId || "--"}</strong>
            </div>

            <div>
              <span className="operator-mini-label">Rodada</span>
              <strong>#{numeroRodada || rodadaId || "--"}</strong>
            </div>

            <div>
              <span className="operator-mini-label">Status</span>
              <strong
                className={`status-pill status-${String(
                  statusRodada
                ).toLowerCase()}`}
              >
                {statusRodada}
              </strong>
            </div>
          </div>

          <div className="operator-mobile-message">{mensagem}</div>
        </section>

        <section className="operator-mobile-card">
          <div className="operator-bingo-grid">
            {numeros.map((numero) => (
              <div
                key={numero}
                className={`operator-bingo-cell ${
                  historico.includes(numero) ? "drawn" : ""
                } ${numeroAtual === numero ? "current" : ""}`}
              >
                {String(numero).padStart(2, "0")}
              </div>
            ))}
          </div>
        </section>

        <section className="operator-mobile-card operator-last-balls-card">
          <div className="operator-last-balls-header">
            <span>ATUAL</span>
            <span>ÚLTIMAS BOLAS</span>
          </div>

          <div className="operator-last-balls-row">
            {ultimosNove.length > 0 ? (
              ultimosNove.map((n, index) => (
                <span key={`${n}-${index}`}>{String(n).padStart(2, "0")}</span>
              ))
            ) : (
              <>
                <span>--</span>
                <span>--</span>
                <span>--</span>
                <span>--</span>
                <span>--</span>
                <span>--</span>
                <span>--</span>
                <span>--</span>
                <span>--</span>
              </>
            )}
          </div>
        </section>

        <section className="operator-mobile-center">
          <div className={`operator-big-ball ${sorteando ? "is-sorting" : ""}`}>
            <span>
              {numeroAnimado !== null && numeroAnimado !== undefined
                ? String(numeroAnimado).padStart(2, "0")
                : numeroAtual !== null && numeroAtual !== undefined
                ? String(numeroAtual).padStart(2, "0")
                : "--"}
            </span>
          </div>

          <div className="operator-order-text">
            Ordem: <strong>{ordemAtual}</strong>
          </div>
        </section>

        <section className="operator-mobile-actions">
          <button
            className="operator-action-btn primary"
            onClick={sortearNumero}
            disabled={sorteioBloqueado}
          >
            {sorteando
              ? "SORTEANDO..."
              : !sorteioLiberado && statusRodada === "EM_ANDAMENTO"
              ? "AGUARDE A CONTAGEM"
              : "SORTEAR"}
          </button>

          <button
            className="operator-action-btn danger"
            onClick={encerrarRodada}
            disabled={!rodadaId || rodadaEstaFinalizada}
          >
            ENCERRAR
          </button>
        </section>

        <section className="operator-mobile-actions operator-secondary-actions">
          <button
            onClick={iniciarRodada}
            disabled={
              !rodadaId ||
              statusRodada === "EM_ANDAMENTO" ||
              rodadaEstaFinalizada
            }
          >
            Iniciar
          </button>

          <button
            onClick={pausarRodada}
            disabled={!rodadaId || rodadaEstaFinalizada}
          >
            Pausar
          </button>

          <button
            onClick={() => setAutoSorteio((v) => !v)}
            disabled={
              !rodadaId ||
              rodadaEstaFinalizada ||
              statusRodada !== "EM_ANDAMENTO" ||
              !sorteioLiberado ||
              historico.length >= 75
            }
            className={autoSorteio ? "auto-on" : ""}
          >
            Auto: {autoSorteio ? "ON" : "OFF"}
          </button>

          <button onClick={abrirModalNovaRodada}>Nova Rodada</button>

          <button onClick={() => navigate("/historico-rodadas")}>
            Histórico
          </button>

          <button onClick={desfazerPremios}>Reiniciar prêmios</button>
        </section>

        <section className="operator-mobile-prizes">
          <h3>CONCORRENDO A:</h3>

          <div className="operator-prize-grid">
            {opcoesPremio.map((opcao) => (
              <button
                key={opcao.value}
                className={`operator-prize-btn current-prize ${
                  premioAtual === opcao.value ? "active" : ""
                } ${premiosPagos.includes(opcao.value) ? "paid" : ""}`}
                onClick={() => selecionarPremioAtual(opcao.value)}
                disabled={!rodadaId || premiosPagos.includes(opcao.value)}
              >
                {opcao.label}
                <br />
                <small>{valorPremioAtual(opcao.value)}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="operator-mobile-prizes">
          <h3>VALORES DA RODADA:</h3>

          <div className="operator-prize-grid">
            {opcoesValores.map((item) => (
              <div
                key={item.campo}
                className="operator-prize-btn current-prize"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  cursor: "default",
                }}
              >
                <span>{item.label}</span>

                <strong style={{ fontSize: "18px" }}>
                  {valorAtualFormatado(item.campo)}
                </strong>

                <input
                  type="number"
                  value={premiacaoRodada[item.campo]}
                  onChange={(e) => atualizarPremiacao(item.campo, e.target.value)}
                  disabled={!rodadaId || salvandoPremiacao}
                  style={{
                    width: "100%",
                    border: "1px solid rgba(255, 215, 120, 0.35)",
                    borderRadius: "10px",
                    padding: "10px",
                    background: "rgba(0,0,0,0.28)",
                    color: "#fff7df",
                    fontWeight: 900,
                    textAlign: "center",
                  }}
                />

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "6px",
                  }}
                >
                  {item.passos.map((passo) => (
                    <button
                      key={`${item.campo}-${passo}`}
                      type="button"
                      onClick={() => alterarValorPremiacao(item.campo, passo)}
                      disabled={!rodadaId || salvandoPremiacao}
                      style={{
                        border: "none",
                        borderRadius: "8px",
                        padding: "8px 4px",
                        background: "linear-gradient(180deg, #ffe58a, #ffb300)",
                        color: "#2b1200",
                        fontWeight: 1000,
                      }}
                    >
                      +{passo}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            className="operator-action-btn primary"
            onClick={() => atualizarPremiacaoBackend(premiacaoRodada)}
            disabled={!rodadaId || salvandoPremiacao}
            style={{ marginTop: "12px" }}
          >
            {salvandoPremiacao ? "SALVANDO..." : "SALVAR VALORES"}
          </button>
        </section>

        <section className="operator-mobile-prizes">
          <h3>MARCAR GANHADOR/PAGAMENTO:</h3>

          <div className="operator-prize-grid">
            {opcoesPremio.map((opcao) => (
              <button
                key={opcao.value}
                className={`operator-prize-btn payment-prize ${
                  premiosPagos.includes(opcao.value) ? "paid" : ""
                }`}
                onClick={() => marcarGanhador(opcao.value)}
                disabled={!rodadaId}
              >
                {premiosPagos.includes(opcao.value)
                  ? `${opcao.label} ✓`
                  : opcao.label}
              </button>
            ))}
          </div>
        </section>

        {mostrarModalPremiacao && (
          <div className="operator-prize-modal-overlay">
            <div className="operator-prize-modal">
              <h2>Nova Rodada</h2>
              <p>Preencha os valores da premiação antes de iniciar.</p>

              <label>
                Linha
                <input
                  type="number"
                  value={premiacaoRodada.linha}
                  onChange={(e) => atualizarPremiacao("linha", e.target.value)}
                  placeholder="Ex: 50"
                />
              </label>

              <label>
                Bingo
                <input
                  type="number"
                  value={premiacaoRodada.bingo}
                  onChange={(e) => atualizarPremiacao("bingo", e.target.value)}
                  placeholder="Ex: 100"
                />
              </label>

              <label>
                Duplo Bingo
                <input
                  type="number"
                  value={premiacaoRodada.duploBingo}
                  onChange={(e) =>
                    atualizarPremiacao("duploBingo", e.target.value)
                  }
                  placeholder="Ex: 50"
                />
              </label>

              <label>
                Bola Max
                <input
                  type="number"
                  value={premiacaoRodada.bolaMax}
                  onChange={(e) =>
                    atualizarPremiacao("bolaMax", e.target.value)
                  }
                  placeholder="Ex: 60"
                />
              </label>

              <label>
                Valor da Doação
                <input
                  type="number"
                  value={premiacaoRodada.doacao}
                  onChange={(e) => atualizarPremiacao("doacao", e.target.value)}
                  placeholder="Ex: 10"
                />
              </label>

              <div className="operator-prize-modal-actions">
                <button onClick={() => setMostrarModalPremiacao(false)}>
                  Cancelar
                </button>

                <button
                  className="primary"
                  onClick={novaRodada}
                  disabled={!premiacaoValida()}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
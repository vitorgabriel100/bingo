import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";
import useWebSocket from "../hooks/useWebSocket";

export default function OperadorPage() {
  const navigate = useNavigate();

  const [sessaoId, setSessaoId] = useState(null);
  const [rodadaId, setRodadaId] = useState(null);

  const [numeroAtual, setNumeroAtual] = useState(null);
  const [numeroAnimado, setNumeroAnimado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [mensagem, setMensagem] = useState("Preparando sessão...");
  const [statusRodada, setStatusRodada] = useState("AGUARDANDO");
  const [autoSorteio, setAutoSorteio] = useState(false);
  const [sorteando, setSorteando] = useState(false);

  const [premioAtual, setPremioAtual] = useState("PRIMEIRA_LINHA");
  const [premiosPagos, setPremiosPagos] = useState([]);

  const timeoutAutoRef = useRef(null);
  const numerosRegistradosRef = useRef(new Set());

  const numeros = Array.from({ length: 75 }, (_, i) => i + 1);
  const INTERVALO_AUTO_MS = 10000;

  const opcoesPremio = [
    { value: "PRIMEIRA_LINHA", label: "Linha" },
    { value: "SEGUNDA_LINHA", label: "Acumulado" },
    { value: "DUPLA_LINHA", label: "Duplo Bingo" },
    { value: "CARTELA_CHEIA", label: "Bingo" },
  ];

  function formatarPremio(premio) {
    const mapa = {
      PRIMEIRA_LINHA: "Linha",
      SEGUNDA_LINHA: "Acumulado",
      DUPLA_LINHA: "Duplo Bingo",
      CARTELA_CHEIA: "Bingo",
    };

    return mapa[premio] || premio;
  }

  function proximoPremio(premio) {
    const index = opcoesPremio.findIndex((p) => p.value === premio);
    const proximo = opcoesPremio[index + 1];
    return proximo ? proximo.value : premio;
  }

  function iniciarAnimacaoBolinha(numero) {
    setNumeroAnimado(null);
    setSorteando(true);

    setTimeout(() => {
      setNumeroAnimado(numero);
    }, 80);

    setTimeout(() => {
      setNumeroAtual(numero);
      setSorteando(false);
    }, 1300);
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
        setRodadaId(response.data.id);
        setStatusRodada(response.data.status || "AGUARDANDO");

        localStorage.setItem("rodadaSelecionadaId", response.data.id);
        localStorage.setItem(
          "rodadaSelecionadaStatus",
          response.data.status || "AGUARDANDO"
        );

        setMensagem(`Rodada ${response.data.numeroRodada} carregada.`);
      } else {
        setMensagem("Nenhuma rodada ativa. Crie uma nova rodada.");
      }
    } catch {
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

    if (event.type === "NUMBER_DRAWN") {
      const numero = extrairNumeroSorteado(event);

      if (numero !== null && numero !== undefined) {
        registrarNumeroSorteado(numero);
      }

      return;
    }

    if (event.type === "ROUND_CREATED") {
      if (event.rodadaId) {
        setRodadaId(event.rodadaId);
        localStorage.setItem("rodadaSelecionadaId", event.rodadaId);
      }

      setStatusRodada(event.status || "CRIADA");
      localStorage.setItem("rodadaSelecionadaStatus", event.status || "CRIADA");
      setMensagem(`Rodada ${event.numeroRodada || event.rodadaId} criada.`);
      return;
    }

    if (event.type === "ROUND_STARTED") {
      if (event.rodadaId) {
        setRodadaId(event.rodadaId);
        localStorage.setItem("rodadaSelecionadaId", event.rodadaId);
      }

      setStatusRodada("EM_ANDAMENTO");
      localStorage.setItem("rodadaSelecionadaStatus", "EM_ANDAMENTO");
      setMensagem("Rodada iniciada.");
      return;
    }

    if (event.type === "ROUND_PAUSED") {
      setStatusRodada("PAUSADA");
      localStorage.setItem("rodadaSelecionadaStatus", "PAUSADA");
      setAutoSorteio(false);
      setMensagem("Rodada pausada.");
      return;
    }

    if (event.type === "ROUND_FINISHED") {
      setStatusRodada("FINALIZADA");
      localStorage.setItem("rodadaSelecionadaStatus", "FINALIZADA");
      setAutoSorteio(false);
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
      const premioSalvo = localStorage.getItem("premioAtualOperador");
      const premiosPagosSalvos = localStorage.getItem("premiosPagosOperador");

      if (premioSalvo) {
        setPremioAtual(premioSalvo);
      }

      if (premiosPagosSalvos) {
        try {
          setPremiosPagos(JSON.parse(premiosPagosSalvos));
        } catch {
          setPremiosPagos([]);
        }
      }

      const idSessao = await carregarOuCriarSessao();

      if (!idSessao) return;

      const rodadaSalva = localStorage.getItem("rodadaSelecionadaId");
      const statusSalvo = localStorage.getItem("rodadaSelecionadaStatus");

      if (rodadaSalva) {
        setRodadaId(Number(rodadaSalva));
        setStatusRodada(statusSalvo || "AGUARDANDO");
        setMensagem("Rodada carregada do histórico.");
      } else {
        await carregarRodadaAtiva(idSessao);
      }
    }

    iniciarTela();
  }, []);

  useEffect(() => {
    carregarHistorico(rodadaId);
  }, [rodadaId]);

  useEffect(() => {
    localStorage.setItem("premioAtualOperador", premioAtual);
  }, [premioAtual]);

  useEffect(() => {
    localStorage.setItem("premiosPagosOperador", JSON.stringify(premiosPagos));
  }, [premiosPagos]);

  async function iniciarRodada() {
    if (!rodadaId) {
      setMensagem("Crie ou selecione uma rodada antes de iniciar.");
      return;
    }

    try {
      const response = await api.patch(`/rodadas/${rodadaId}/iniciar`);

      setStatusRodada(response.data.status || "EM_ANDAMENTO");
      localStorage.setItem(
        "rodadaSelecionadaStatus",
        response.data.status || "EM_ANDAMENTO"
      );

      setMensagem("Rodada iniciada.");
    } catch (error) {
      console.error("Erro ao iniciar rodada:", error);

      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          "Erro ao iniciar rodada."
      );
    }
  }

  async function pausarRodada() {
    if (!rodadaId) {
      setMensagem("Nenhuma rodada selecionada.");
      return;
    }

    try {
      const response = await api.patch(`/rodadas/${rodadaId}/pausar`);

      setStatusRodada(response.data.status || "PAUSADA");
      localStorage.setItem(
        "rodadaSelecionadaStatus",
        response.data.status || "PAUSADA"
      );

      setAutoSorteio(false);
      setMensagem("Rodada pausada.");
    } catch (error) {
      console.error("Erro ao pausar rodada:", error);

      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          "Erro ao pausar rodada."
      );
    }
  }

  async function encerrarRodada() {
    if (!rodadaId) {
      setMensagem("Nenhuma rodada selecionada.");
      return;
    }

    try {
      const response = await api.patch(`/rodadas/${rodadaId}/encerrar`);

      setStatusRodada(response.data.status || "FINALIZADA");
      localStorage.setItem(
        "rodadaSelecionadaStatus",
        response.data.status || "FINALIZADA"
      );

      setAutoSorteio(false);
      setMensagem("Rodada encerrada.");
    } catch (error) {
      console.error("Erro ao encerrar rodada:", error);

      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          "Erro ao encerrar rodada."
      );
    }
  }

  async function sortearNumero() {
    if (!rodadaId) {
      setMensagem("Crie ou selecione uma rodada antes de sortear.");
      return;
    }

    if (statusRodada !== "EM_ANDAMENTO") {
      setMensagem("Inicie a rodada antes de sortear.");
      return;
    }

    if (historico.length >= 75) {
      setMensagem("Todos os 75 números já foram sorteados.");
      setAutoSorteio(false);
      return;
    }

    if (sorteando) {
      setMensagem("Aguarde a animação do número atual.");
      return;
    }

    try {
      setSorteando(true);
      setMensagem("Sorteando número...");

      const response = await api.post(`/rodadas/${rodadaId}/sortear`);
      const numero = extrairNumeroSorteado(response.data);

      if (numero === null || numero === undefined) {
        setMensagem("Sorteio realizado, mas o número não veio na resposta.");
        setSorteando(false);
        return;
      }

      registrarNumeroSorteado(numero);
    } catch (error) {
      console.error("Erro ao sortear número:", error);

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
    let idSessao = sessaoId;

    if (!idSessao) {
      idSessao = await carregarOuCriarSessao();
    }

    if (!idSessao) {
      setMensagem("Não foi possível localizar ou criar uma sessão.");
      return;
    }

    try {
      localStorage.removeItem("rodadaSelecionadaId");
      localStorage.removeItem("rodadaSelecionadaStatus");
      localStorage.removeItem("premioAtualOperador");
      localStorage.removeItem("premiosPagosOperador");

      const response = await api.post(`/rodadas/sessao/${idSessao}`);

      setRodadaId(response.data.id);
      localStorage.setItem("rodadaSelecionadaId", response.data.id);

      numerosRegistradosRef.current = new Set();

      setNumeroAtual(null);
      setNumeroAnimado(null);
      setHistorico([]);
      setStatusRodada(response.data.status || "CRIADA");

      localStorage.setItem(
        "rodadaSelecionadaStatus",
        response.data.status || "CRIADA"
      );

      setAutoSorteio(false);
      setSorteando(false);
      setPremioAtual("PRIMEIRA_LINHA");
      setPremiosPagos([]);

      setMensagem(`Nova rodada criada: rodada ${response.data.numeroRodada}.`);
    } catch (error) {
      console.error("Erro ao criar nova rodada:", error);

      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          "Erro ao criar nova rodada."
      );
    }
  }

  function selecionarPremioAtual(premio) {
    if (premiosPagos.includes(premio)) {
      setMensagem(`${formatarPremio(premio)} já foi marcado como pago.`);
      return;
    }

    setPremioAtual(premio);
    localStorage.setItem("premioAtualOperador", premio);

    window.dispatchEvent(
      new CustomEvent("premioAtualizado", {
        detail: premio,
      })
    );

    setMensagem(`Agora concorrendo a: ${formatarPremio(premio)}.`);
  }

  function marcarGanhador(premio) {
    if (premiosPagos.includes(premio)) {
      setMensagem(`${formatarPremio(premio)} já foi marcado como pago.`);
      return;
    }

    const novosPremiosPagos = [...premiosPagos, premio];
    setPremiosPagos(novosPremiosPagos);

    const proximo = proximoPremio(premio);

    if (proximo !== premio && !novosPremiosPagos.includes(proximo)) {
      setPremioAtual(proximo);
      localStorage.setItem("premioAtualOperador", proximo);

      window.dispatchEvent(
        new CustomEvent("premioAtualizado", {
          detail: proximo,
        })
      );

      setMensagem(
        `${formatarPremio(premio)} pago. Agora concorrendo a: ${formatarPremio(
          proximo
        )}.`
      );
    } else {
      setMensagem(
        `${formatarPremio(premio)} pago. Todos os prêmios foram marcados.`
      );
    }
  }

  function desfazerPremios() {
    setPremiosPagos([]);
    setPremioAtual("PRIMEIRA_LINHA");
    localStorage.setItem("premioAtualOperador", "PRIMEIRA_LINHA");

    window.dispatchEvent(
      new CustomEvent("premioAtualizado", {
        detail: "PRIMEIRA_LINHA",
      })
    );

    setMensagem("Marcações de prêmio reiniciadas.");
  }

  useEffect(() => {
    if (timeoutAutoRef.current) {
      clearTimeout(timeoutAutoRef.current);
    }

    if (!autoSorteio) return;
    if (statusRodada !== "EM_ANDAMENTO") return;
    if (!rodadaId) return;

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
  }, [autoSorteio, statusRodada, rodadaId, historico.length, sorteando]);

  useEffect(() => {
    return () => {
      if (timeoutAutoRef.current) {
        clearTimeout(timeoutAutoRef.current);
      }
    };
  }, []);

  const sorteioBloqueado =
    !rodadaId ||
    statusRodada !== "EM_ANDAMENTO" ||
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
              <strong>#{rodadaId || "--"}</strong>
            </div>

            <div>
              <span className="operator-mini-label">Status</span>
              <strong className={`status-pill status-${statusRodada.toLowerCase()}`}>
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
                } ${
                  numeroAtual === numero ? "current" : ""
                }`}
              >
                {numero}
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
            {sorteando ? "SORTEANDO..." : "SORTEAR"}
          </button>

          <button
            className="operator-action-btn danger"
            onClick={encerrarRodada}
            disabled={!rodadaId}
          >
            ENCERRAR
          </button>
        </section>

        <section className="operator-mobile-actions operator-secondary-actions">
          <button onClick={iniciarRodada} disabled={!rodadaId}>
            Iniciar
          </button>

          <button onClick={pausarRodada} disabled={!rodadaId}>
            Pausar
          </button>

          <button
            onClick={() => setAutoSorteio((v) => !v)}
            disabled={
              !rodadaId ||
              statusRodada !== "EM_ANDAMENTO" ||
              historico.length >= 75
            }
            className={autoSorteio ? "auto-on" : ""}
          >
            Auto: {autoSorteio ? "ON" : "OFF"}
          </button>

          <button onClick={novaRodada}>Nova Rodada</button>
          <button onClick={() => navigate("/historico-rodadas")}>Histórico</button>
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
              >
                {opcao.label}
              </button>
            ))}
          </div>
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
              >
                {premiosPagos.includes(opcao.value)
                  ? `${opcao.label} ✓`
                  : opcao.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
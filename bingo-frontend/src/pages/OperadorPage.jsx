import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";
import useWebSocket from "../hooks/useWebSocket";

export default function OperadorPage() {
  const navigate = useNavigate();

  const [sessaoId] = useState(2);
  const [rodadaId, setRodadaId] = useState(null);

  const [numeroAtual, setNumeroAtual] = useState(null);
  const [numeroAnimado, setNumeroAnimado] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [mensagem, setMensagem] = useState("Buscando rodada ativa...");
  const [statusRodada, setStatusRodada] = useState("AGUARDANDO");
  const [autoSorteio, setAutoSorteio] = useState(false);
  const [sorteando, setSorteando] = useState(false);

  const [premioAtual, setPremioAtual] = useState("PRIMEIRA_LINHA");
  const [premiosPagos, setPremiosPagos] = useState([]);

  const timeoutAutoRef = useRef(null);

  const numeros = Array.from({ length: 75 }, (_, i) => i + 1);

  const INTERVALO_AUTO_MS = 10000;

  const opcoesPremio = [
    { value: "PRIMEIRA_LINHA", label: "Primeira Linha" },
    { value: "SEGUNDA_LINHA", label: "Segunda Linha" },
    { value: "DUPLA_LINHA", label: "Dupla Linha" },
    { value: "CARTELA_CHEIA", label: "Cartela Cheia" },
  ];

  function formatarPremio(premio) {
    const item = opcoesPremio.find((p) => p.value === premio);
    return item ? item.label : premio;
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

  async function carregarRodadaAtiva() {
    try {
      const response = await api.get(`/rodadas/sessao/${sessaoId}/ativa`);

      if (response.data && response.data.id) {
        setRodadaId(response.data.id);
        setStatusRodada(response.data.status || "AGUARDANDO");
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
      const numerosSorteados = response.data.map((item) => item.numero);

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
    if (!event || !event.type) return;

    if (event.type === "NUMBER_DRAWN") {
      iniciarAnimacaoBolinha(event.numero);

      setHistorico((prev) =>
        prev.includes(event.numero) ? prev : [...prev, event.numero]
      );

      setMensagem(`Saiu o ${event.numero}!`);
    }

    if (event.type === "ROUND_STARTED") {
      setStatusRodada("EM_ANDAMENTO");
      setMensagem("Rodada iniciada.");
    }

    if (event.type === "ROUND_PAUSED") {
      setStatusRodada("PAUSADA");
      setAutoSorteio(false);
      setMensagem("Rodada pausada.");
    }

    if (event.type === "ROUND_FINISHED") {
      setStatusRodada("FINALIZADA");
      setAutoSorteio(false);
      setMensagem("Rodada encerrada.");
    }
  }, []);

  useWebSocket(
    rodadaId
      ? [`/topic/sessao/${sessaoId}`, `/topic/rodada/${rodadaId}`]
      : [`/topic/sessao/${sessaoId}`],
    handleWsMessage
  );

  useEffect(() => {
    const rodadaSalva = localStorage.getItem("rodadaSelecionadaId");
    const statusSalvo = localStorage.getItem("rodadaSelecionadaStatus");
    const premioSalvo = localStorage.getItem("premioAtualOperador");
    const premiosPagosSalvos = localStorage.getItem("premiosPagosOperador");

    if (premioSalvo) {
      setPremioAtual(premioSalvo);
    }

    if (premiosPagosSalvos) {
      setPremiosPagos(JSON.parse(premiosPagosSalvos));
    }

    if (rodadaSalva) {
      setRodadaId(Number(rodadaSalva));
      setStatusRodada(statusSalvo || "AGUARDANDO");
      setMensagem("Rodada carregada do histórico.");
    } else {
      carregarRodadaAtiva();
    }
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
      setMensagem(error?.response?.data?.mensagem || "Erro ao iniciar rodada.");
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
      setMensagem(error?.response?.data?.mensagem || "Erro ao pausar rodada.");
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
      setMensagem(error?.response?.data?.mensagem || "Erro ao encerrar rodada.");
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
      await api.post(`/rodadas/${rodadaId}/sortear`);
    } catch (error) {
      setMensagem(error?.response?.data?.mensagem || "Erro ao sortear número.");
      setAutoSorteio(false);
      setSorteando(false);
    }
  }

  async function novaRodada() {
    try {
      localStorage.removeItem("rodadaSelecionadaId");
      localStorage.removeItem("rodadaSelecionadaStatus");
      localStorage.removeItem("premioAtualOperador");
      localStorage.removeItem("premiosPagosOperador");

      const response = await api.post(`/rodadas/sessao/${sessaoId}`);

      setRodadaId(response.data.id);
      setNumeroAtual(null);
      setNumeroAnimado(null);
      setHistorico([]);
      setStatusRodada(response.data.status || "CRIADA");
      setAutoSorteio(false);
      setSorteando(false);
      setPremioAtual("PRIMEIRA_LINHA");
      setPremiosPagos([]);
      setMensagem(`Nova rodada criada: rodada ${response.data.numeroRodada}.`);
    } catch (error) {
      setMensagem(error?.response?.data?.mensagem || "Erro ao criar nova rodada.");
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
      setMensagem(`${formatarPremio(premio)} pago. Todos os prêmios foram marcados.`);
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
  }, [autoSorteio, statusRodada, rodadaId, historico.length]);

  const sorteioBloqueado =
    !rodadaId ||
    statusRodada !== "EM_ANDAMENTO" ||
    historico.length >= 75 ||
    sorteando;

  return (
  <Layout title="Operador">
    <div className="operator-simple-page">
      <section className="operator-top">
        <div className="operator-card operator-status-card">
          <span className="operator-label">Rodada atual</span>
          <div className="operator-status-line">
            <strong>#{rodadaId || "--"}</strong>
            <span className={`status-pill status-${statusRodada.toLowerCase()}`}>
              {statusRodada}
            </span>
          </div>
          <small>{mensagem}</small>
        </div>

        <div className="operator-card operator-current-card">
          <span className="operator-label">Número sorteado</span>

          <div className={`operator-current-ball ${sorteando ? "is-sorting" : ""}`}>
            <span>
              {numeroAnimado !== null && numeroAnimado !== undefined
                ? String(numeroAnimado).padStart(2, "0")
                : numeroAtual !== null && numeroAtual !== undefined
                ? String(numeroAtual).padStart(2, "0")
                : "--"}
            </span>
          </div>

          <p>{historico.length}/75 números sorteados</p>
        </div>

        <div className="operator-card operator-prize-card">
          <span className="operator-label">Concorrendo agora</span>
          <strong className="operator-prize-highlight">
            {formatarPremio(premioAtual)}
          </strong>

          <button
            className="draw-button"
            onClick={sortearNumero}
            disabled={sorteioBloqueado}
          >
            {sorteando ? "SORTEANDO..." : "SORTEAR"}
          </button>
        </div>
      </section>

      <section className="operator-card operator-controls-card">
        <div className="controls">
          <button onClick={iniciarRodada} disabled={!rodadaId}>
            Iniciar
          </button>

          <button onClick={pausarRodada} disabled={!rodadaId}>
            Pausar
          </button>

          <button
            onClick={() => setAutoSorteio((v) => !v)}
            disabled={
              !rodadaId || statusRodada !== "EM_ANDAMENTO" || historico.length >= 75
            }
            className={autoSorteio ? "auto-on" : ""}
          >
            Auto: {autoSorteio ? "ON" : "OFF"}
          </button>

          <button className="danger" onClick={encerrarRodada} disabled={!rodadaId}>
            Encerrar
          </button>

          <button onClick={novaRodada}>Nova Rodada</button>

          <button onClick={() => navigate("/historico-rodadas")}>
            Histórico
          </button>
        </div>
      </section>

      <section className="operator-middle">
        <section className="operator-card prize-panel-simple">
          <div className="prize-header">
            <div>
              <span>Painel de Prêmios</span>
              <h2>Controle do Bingo</h2>
            </div>

            <button className="reset-prizes" onClick={desfazerPremios}>
              Reiniciar prêmios
            </button>
          </div>

          <div className="prize-section">
            <h3>Concorrendo a:</h3>

            <div className="prize-grid">
              {opcoesPremio.map((opcao) => (
                <button
                  key={opcao.value}
                  className={`prize-button dispute ${
                    premioAtual === opcao.value ? "active" : ""
                  } ${premiosPagos.includes(opcao.value) ? "paid" : ""}`}
                  onClick={() => selecionarPremioAtual(opcao.value)}
                >
                  <span>{opcao.label}</span>
                  <small>
                    {premiosPagos.includes(opcao.value)
                      ? "Pago"
                      : premioAtual === opcao.value
                      ? "Valendo agora"
                      : "Selecionar"}
                  </small>
                </button>
              ))}
            </div>
          </div>

          <div className="prize-section">
            <h3>Marcar ganhador / pagamento:</h3>

            <div className="prize-grid">
              {opcoesPremio.map((opcao) => (
                <button
                  key={opcao.value}
                  className={`prize-button payment ${
                    premiosPagos.includes(opcao.value) ? "paid" : ""
                  }`}
                  onClick={() => marcarGanhador(opcao.value)}
                >
                  <span>{opcao.label}</span>
                  <small>
                    {premiosPagos.includes(opcao.value)
                      ? "Ganhador marcado"
                      : "Marcar pagamento"}
                  </small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="operator-card operator-history-simple">
          <h3>Últimos números</h3>

          <div className="history-list">
            {historico.length > 0 ? (
              historico
                .slice()
                .reverse()
                .slice(0, 15)
                .map((n, index) => (
                  <span key={`${n}-${index}`}>{String(n).padStart(2, "0")}</span>
                ))
            ) : (
              <p>Nenhum número sorteado ainda.</p>
            )}
          </div>
        </section>
      </section>

      <section className="operator-card operator-grid-simple">
        <div className="grid-header">
          <h3>Números do bingo</h3>
          <span>{historico.length} marcados</span>
        </div>

        <div className="operator-grid">
          {numeros.map((numero) => (
            <div
              key={numero}
              className={historico.includes(numero) ? "grid-item drawn" : "grid-item"}
            >
              {String(numero).padStart(2, "0")}
            </div>
          ))}
        </div>
      </section>
    </div>
  </Layout>
);
}
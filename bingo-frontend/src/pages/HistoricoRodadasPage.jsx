import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import SalaSelector from "../components/SalaSelector";
import useSalas from "../hooks/useSalas";
import api from "../services/api";

export default function HistoricoRodadasPage() {
  const navigate = useNavigate();
  const {
    salas,
    salaSelecionadaId,
    selecionarSala,
    carregandoSalas,
  } = useSalas();

  const [sessaoId, setSessaoId] = useState(null);
  const [rodadas, setRodadas] = useState([]);
  const [mensagem, setMensagem] = useState("Carregando histórico...");
  const [carregando, setCarregando] = useState(false);

  const [rodadaAbertaId, setRodadaAbertaId] = useState(null);
  const [detalhesRodadas, setDetalhesRodadas] = useState({});
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  const hoje = new Date().toISOString().slice(0, 10);
  const [dataFiltro, setDataFiltro] = useState(hoje);

  function extrairLista(data) {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.rodadas)) return data.rodadas;
    if (Array.isArray(data?.numeros)) return data.numeros;
    if (Array.isArray(data?.numerosSorteados)) return data.numerosSorteados;
    return [];
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

    return {
      linha: linha ?? "",
      bingo: bingo ?? "",
      duploBingo: duploBingo ?? "",
      bolaMax: bolaMax ?? "",
      doacao: doacao ?? "",
    };
  }

  function statusFinalizado(status) {
    return ["FINALIZADA", "FINALIZADO", "ENCERRADA", "ENCERRADO"].includes(
      String(status || "").toUpperCase()
    );
  }

  function statusAtivo(status) {
    return ["EM_ANDAMENTO", "PAUSADA", "CRIADA", "AGUARDANDO"].includes(
      String(status || "").toUpperCase()
    );
  }

  function formatarStatus(status) {
    if (!status) return "AGUARDANDO";
    return String(status).replaceAll("_", " ");
  }

  function formatarData(data) {
    if (!data) return "-";

    const dataObj = new Date(data);

    if (Number.isNaN(dataObj.getTime())) {
      return "-";
    }

    return dataObj.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatarMoeda(valor) {
    if (valor === null || valor === undefined || valor === "") return "-";

    const numero = Number(String(valor).replace(",", "."));

    if (!Number.isFinite(numero)) return `R$ ${valor}`;

    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarNumero(numero) {
    if (numero === null || numero === undefined || numero === "") return "--";
    return String(Number(numero)).padStart(2, "0");
  }

  function pegarDataBaseRodada(rodada) {
    return (
      rodada?.iniciouEm ||
      rodada?.dataInicio ||
      rodada?.data_inicio ||
      rodada?.criadoEm ||
      rodada?.createdAt ||
      rodada?.created_at ||
      null
    );
  }

  function pegarInicioRodada(rodada) {
    return (
      rodada?.iniciouEm ||
      rodada?.dataInicio ||
      rodada?.data_inicio ||
      rodada?.criadoEm ||
      rodada?.createdAt ||
      rodada?.created_at ||
      null
    );
  }

  function pegarFimRodada(rodada) {
    return (
      rodada?.encerrouEm ||
      rodada?.dataFim ||
      rodada?.data_fim ||
      rodada?.finalizadoEm ||
      rodada?.finalizadaEm ||
      rodada?.updatedAt ||
      rodada?.updated_at ||
      null
    );
  }

  function calcularDuracao(inicio, fim, status) {
    if (!inicio) return "-";

    const inicioData = new Date(inicio);
    const fimData = fim ? new Date(fim) : new Date();

    if (
      Number.isNaN(inicioData.getTime()) ||
      Number.isNaN(fimData.getTime())
    ) {
      return "-";
    }

    if (!statusFinalizado(status) && !fim) {
      return "Em andamento";
    }

    const diffMs = Math.max(0, fimData.getTime() - inicioData.getTime());
    const totalSegundos = Math.floor(diffMs / 1000);

    const horas = Math.floor(totalSegundos / 3600);
    const minutos = Math.floor((totalSegundos % 3600) / 60);
    const segundos = totalSegundos % 60;

    if (horas > 0) {
      return `${horas}h ${minutos}min`;
    }

    if (minutos > 0) {
      return `${minutos}min ${segundos}s`;
    }

    return `${segundos}s`;
  }

  function rodadaEhDaData(rodada, data) {
    if (!data) return true;

    const dataBase = pegarDataBaseRodada(rodada);

    if (!dataBase) return false;

    const dataObj = new Date(dataBase);

    if (Number.isNaN(dataObj.getTime())) return false;

    return dataObj.toISOString().slice(0, 10) === data;
  }

  function ordenarRodadas(lista) {
    return [...lista].sort((a, b) => {
      const numeroA = Number(a?.numeroRodada || a?.numero_rodada || a?.id || 0);
      const numeroB = Number(b?.numeroRodada || b?.numero_rodada || b?.id || 0);

      return numeroB - numeroA;
    });
  }

  function normalizarNumerosSorteados(data) {
    return extrairLista(data)
      .map((item) => item?.numero ?? item?.numeroSorteado ?? item?.valor ?? item)
      .filter((numero) => numero !== null && numero !== undefined)
      .map(Number)
      .filter((numero) => Number.isFinite(numero));
  }

  const rodadasFiltradas = useMemo(() => {
    return ordenarRodadas(rodadas).filter((rodada) =>
      rodadaEhDaData(rodada, dataFiltro)
    );
  }, [rodadas, dataFiltro]);

  const resumoDoDia = useMemo(() => {
    const total = rodadasFiltradas.length;

    const emAndamento = rodadasFiltradas.filter(
      (rodada) => String(rodada.status || "").toUpperCase() === "EM_ANDAMENTO"
    ).length;

    const pausadas = rodadasFiltradas.filter(
      (rodada) => String(rodada.status || "").toUpperCase() === "PAUSADA"
    ).length;

    const finalizadas = rodadasFiltradas.filter((rodada) =>
      statusFinalizado(rodada.status)
    ).length;

    const bolasSorteadas = rodadasFiltradas.reduce((totalBolas, rodada) => {
      const detalhe = detalhesRodadas[rodada.id];
      return totalBolas + (detalhe?.numeros?.length || 0);
    }, 0);

    return {
      total,
      emAndamento,
      pausadas,
      finalizadas,
      bolasSorteadas,
    };
  }, [rodadasFiltradas, detalhesRodadas]);

  async function carregarOuCriarSessao(idSala) {
    try {
      try {
        const ativa = await api.get("/sessoes/ativa", {
          params: { salaId: idSala },
        });

        if (ativa.data?.id) {
          setSessaoId(ativa.data.id);
          return ativa.data.id;
        }
      } catch {
        // tenta pela listagem
      }

      const response = await api.get("/sessoes");
      const sessoes = extrairLista(response.data).filter(
        (sessao) => sessao.salaId === idSala
      );

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

      setMensagem("Nenhuma sessão encontrada.");
      return null;
    } catch (error) {
      console.error("Erro ao carregar sessão:", error);

      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          "Erro ao carregar sessão."
      );

      return null;
    }
  }

  async function carregarRodadas(idSessao = sessaoId) {
    if (!idSessao) {
      setMensagem("Nenhuma sessão selecionada.");
      return;
    }

    try {
      setCarregando(true);
      setMensagem("Carregando histórico de rodadas...");

      const response = await api.get(`/rodadas/sessao/${idSessao}`);
      const lista = extrairLista(response.data);

      setRodadas(lista);
      setMensagem(
        lista.length > 0
          ? "Histórico carregado com sucesso."
          : "Nenhuma rodada encontrada nesta sessão."
      );
    } catch (error) {
      console.error("Erro ao carregar histórico de rodadas:", error);

      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          "Erro ao carregar histórico de rodadas."
      );
    } finally {
      setCarregando(false);
    }
  }

  async function carregarDetalhesRodada(rodada) {
    if (!rodada?.id) return;

    const rodadaId = rodada.id;

    if (detalhesRodadas[rodadaId]) {
      setRodadaAbertaId((atual) => (atual === rodadaId ? null : rodadaId));
      return;
    }

    try {
      setCarregandoDetalhes(true);
      setMensagem(`Carregando detalhes da rodada ${rodadaId}...`);

      let dadosRodada = rodada;
      let numeros = [];
      let premiacao = normalizarPremiacaoFonte(rodada);

      try {
        const responseRodada = await api.get(`/rodadas/${rodadaId}`);
        dadosRodada = {
          ...rodada,
          ...responseRodada.data,
        };

        premiacao = {
          ...premiacao,
          ...normalizarPremiacaoFonte(responseRodada.data),
        };
      } catch {
        // mantém os dados que já vieram na lista
      }

      try {
        const responseNumeros = await api.get(`/rodadas/${rodadaId}/numeros`);
        numeros = normalizarNumerosSorteados(responseNumeros.data);
      } catch {
        numeros = [];
      }

      try {
        const responsePremiacao = await api.get(`/rodadas/${rodadaId}/premiacao`);
        premiacao = {
          ...premiacao,
          ...normalizarPremiacaoFonte(responsePremiacao.data),
        };
      } catch {
        // mantém premiação já encontrada
      }

      const detalhe = {
        rodada: dadosRodada,
        numeros,
        premiacao,
      };

      setDetalhesRodadas((prev) => ({
        ...prev,
        [rodadaId]: detalhe,
      }));

      setRodadaAbertaId(rodadaId);
      setMensagem(`Detalhes da rodada ${rodadaId} carregados.`);
    } catch (error) {
      console.error("Erro ao carregar detalhes da rodada:", error);

      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          "Erro ao carregar detalhes da rodada."
      );
    } finally {
      setCarregandoDetalhes(false);
    }
  }

  async function encerrarRodada(rodadaId) {
    if (!rodadaId) {
      setMensagem("Rodada inválida.");
      return;
    }

    const confirmou = window.confirm(
      `Tem certeza que deseja encerrar a rodada ${rodadaId}?`
    );

    if (!confirmou) {
      setMensagem("Encerramento cancelado.");
      return;
    }

    try {
      setMensagem(`Encerrando rodada ${rodadaId}...`);

      await api.patch(`/rodadas/${rodadaId}/encerrar`);

      setMensagem(`Rodada ${rodadaId} encerrada com sucesso.`);

      setDetalhesRodadas((prev) => {
        const copia = { ...prev };
        delete copia[rodadaId];
        return copia;
      });

      await carregarRodadas();
    } catch (error) {
      console.error("Erro ao encerrar rodada:", error);

      setMensagem(
        error?.response?.data?.mensagem ||
          error?.response?.data?.message ||
          error?.response?.data?.erro ||
          "Erro ao encerrar rodada."
      );
    }
  }

  function usarRodada(rodada) {
    if (!rodada?.id) {
      setMensagem("Rodada inválida.");
      return;
    }

    localStorage.setItem("rodadaSelecionadaId", rodada.id);
    localStorage.setItem("rodadaSelecionadaStatus", rodada.status || "");
    localStorage.setItem(
      "rodadaSelecionadaNumero",
      rodada.numeroRodada || rodada.numero_rodada || ""
    );

    navigate("/rodada");
  }

  async function iniciarTela(idSala) {
    const idSessao = await carregarOuCriarSessao(idSala);

    if (idSessao) {
      await carregarRodadas(idSessao);
    }
  }

  useEffect(() => {
    if (!salaSelecionadaId) return;
    let ativo = true;
    Promise.resolve().then(() => {
      if (ativo) iniciarTela(salaSelecionadaId);
    });
    return () => {
      ativo = false;
    };
  }, [salaSelecionadaId]);

  return (
    <Layout
      title="Sessões e histórico"
      subtitle="Consulte as rodadas e os números sorteados de uma sala por vez."
      actions={
        <SalaSelector
          salas={salas}
          value={salaSelecionadaId}
          onChange={selecionarSala}
          disabled={carregandoSalas}
        />
      }
    >
      <div className="round-history-page">
        <header className="round-history-header">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2>Histórico de Rodadas</h2>
              <p>
                Sessão <strong>{sessaoId || "--"}</strong>
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  fontWeight: 800,
                  color: "#cbd5e1",
                }}
              >
                Data
                <input
                  type="date"
                  value={dataFiltro}
                  onChange={(e) => setDataFiltro(e.target.value)}
                  style={{
                    border: "1px solid rgba(148, 163, 184, 0.35)",
                    borderRadius: "10px",
                    padding: "10px",
                    background: "#020617",
                    color: "#fff",
                    fontWeight: 800,
                  }}
                />
              </label>

              <button onClick={() => carregarRodadas()} disabled={carregando}>
                {carregando ? "Atualizando..." : "Atualizar"}
              </button>

              <button onClick={() => navigate("/operador")}>Voltar</button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(120px, 1fr))",
              gap: "10px",
              marginTop: "16px",
            }}
          >
            <div>
              <span>Total no dia</span>
              <strong>{resumoDoDia.total}</strong>
            </div>

            <div>
              <span>Em andamento</span>
              <strong>{resumoDoDia.emAndamento}</strong>
            </div>

            <div>
              <span>Pausadas</span>
              <strong>{resumoDoDia.pausadas}</strong>
            </div>

            <div>
              <span>Finalizadas</span>
              <strong>{resumoDoDia.finalizadas}</strong>
            </div>

            <div>
              <span>Bolas consultadas</span>
              <strong>{resumoDoDia.bolasSorteadas}</strong>
            </div>
          </div>

          {mensagem && (
            <strong
              style={{
                display: "block",
                marginTop: "14px",
                color: "#fde047",
              }}
            >
              {mensagem}
            </strong>
          )}
        </header>

        <div className="round-list">
          {rodadasFiltradas.length > 0 ? (
            rodadasFiltradas.map((rodada) => {
              const numeroRodada =
                rodada.numeroRodada || rodada.numero_rodada || rodada.id;

              const iniciouEm = pegarInicioRodada(rodada);
              const encerrouEm = pegarFimRodada(rodada);
              const status = rodada.status || "AGUARDANDO";
              const detalhe = detalhesRodadas[rodada.id];

              const rodadaDetalhada = detalhe?.rodada || rodada;
              const inicioDetalhe = pegarInicioRodada(rodadaDetalhada);
              const fimDetalhe = pegarFimRodada(rodadaDetalhada);
              const duracao = calcularDuracao(inicioDetalhe, fimDetalhe, status);

              return (
                <div key={rodada.id}>
                  <div className="round-card">
                    <div>
                      <h3>Rodada {numeroRodada}</h3>
                      <span>ID: {rodada.id}</span>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong
                        className={`status-${String(status).toLowerCase()}`}
                      >
                        {formatarStatus(status)}
                      </strong>
                    </div>

                    <div>
                      <span>Início</span>
                      <strong>{formatarData(iniciouEm)}</strong>
                    </div>

                    <div>
                      <span>Encerramento</span>
                      <strong>
                        {statusFinalizado(status) ? formatarData(encerrouEm) : "-"}
                      </strong>
                    </div>

                    <div className="round-actions">
                      <button onClick={() => carregarDetalhesRodada(rodada)}>
                        {rodadaAbertaId === rodada.id ? "Ocultar" : "Detalhes"}
                      </button>

                      <button onClick={() => usarRodada(rodada)}>Usar</button>

                      {statusAtivo(status) && !statusFinalizado(status) && (
                        <button
                          className="danger"
                          onClick={() => encerrarRodada(rodada.id)}
                        >
                          Encerrar
                        </button>
                      )}
                    </div>
                  </div>

                  {rodadaAbertaId === rodada.id && (
                    <div
                      style={{
                        marginTop: "-8px",
                        marginBottom: "14px",
                        padding: "16px",
                        borderRadius: "0 0 18px 18px",
                        background: "rgba(15, 23, 42, 0.92)",
                        border: "1px solid rgba(148, 163, 184, 0.25)",
                        color: "#fff",
                      }}
                    >
                      {carregandoDetalhes && !detalhe ? (
                        <p>Carregando detalhes...</p>
                      ) : (
                        <>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(160px, 1fr))",
                              gap: "12px",
                              marginBottom: "16px",
                            }}
                          >
                            <div>
                              <span style={{ color: "#94a3b8", fontWeight: 800 }}>
                                Duração
                              </span>
                              <strong style={{ display: "block", color: "#fde047" }}>
                                {duracao}
                              </strong>
                            </div>

                            <div>
                              <span style={{ color: "#94a3b8", fontWeight: 800 }}>
                                Bolas sorteadas
                              </span>
                              <strong style={{ display: "block", color: "#fde047" }}>
                                {detalhe?.numeros?.length || 0}/75
                              </strong>
                            </div>

                            <div>
                              <span style={{ color: "#94a3b8", fontWeight: 800 }}>
                                Início real
                              </span>
                              <strong style={{ display: "block" }}>
                                {formatarData(inicioDetalhe)}
                              </strong>
                            </div>

                            <div>
                              <span style={{ color: "#94a3b8", fontWeight: 800 }}>
                                Fim real
                              </span>
                              <strong style={{ display: "block" }}>
                                {statusFinalizado(status)
                                  ? formatarData(fimDetalhe)
                                  : "-"}
                              </strong>
                            </div>
                          </div>

                          <h3
                            style={{
                              margin: "0 0 10px",
                              color: "#fde047",
                            }}
                          >
                            Valores da rodada
                          </h3>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(140px, 1fr))",
                              gap: "10px",
                              marginBottom: "16px",
                            }}
                          >
                            <div>
                              <span style={{ color: "#94a3b8", fontWeight: 800 }}>
                                Linha
                              </span>
                              <strong style={{ display: "block" }}>
                                {formatarMoeda(detalhe?.premiacao?.linha)}
                              </strong>
                            </div>

                            <div>
                              <span style={{ color: "#94a3b8", fontWeight: 800 }}>
                                Bingo
                              </span>
                              <strong style={{ display: "block" }}>
                                {formatarMoeda(detalhe?.premiacao?.bingo)}
                              </strong>
                            </div>

                            <div>
                              <span style={{ color: "#94a3b8", fontWeight: 800 }}>
                                Duplo Bingo
                              </span>
                              <strong style={{ display: "block" }}>
                                {formatarMoeda(detalhe?.premiacao?.duploBingo)}
                              </strong>
                            </div>

                            <div>
                              <span style={{ color: "#94a3b8", fontWeight: 800 }}>
                                Bola Max
                              </span>
                              <strong style={{ display: "block" }}>
                                {detalhe?.premiacao?.bolaMax
                                  ? `Até a bola ${detalhe.premiacao.bolaMax}`
                                  : "-"}
                              </strong>
                            </div>

                            <div>
                              <span style={{ color: "#94a3b8", fontWeight: 800 }}>
                                Doação
                              </span>
                              <strong style={{ display: "block" }}>
                                {formatarMoeda(detalhe?.premiacao?.doacao)}
                              </strong>
                            </div>
                          </div>

                          <h3
                            style={{
                              margin: "0 0 10px",
                              color: "#fde047",
                            }}
                          >
                            Números sorteados
                          </h3>

                          {detalhe?.numeros?.length > 0 ? (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "8px",
                              }}
                            >
                              {detalhe.numeros.map((numero, index) => (
                                <span
                                  key={`${numero}-${index}`}
                                  style={{
                                    width: "42px",
                                    height: "42px",
                                    borderRadius: "50%",
                                    display: "grid",
                                    placeItems: "center",
                                    background:
                                      "linear-gradient(180deg, #f5c452, #d58f0e)",
                                    color: "#2b1200",
                                    fontWeight: 1000,
                                    boxShadow:
                                      "0 8px 18px rgba(0, 0, 0, 0.28)",
                                  }}
                                  title={`Ordem ${index + 1}`}
                                >
                                  {formatarNumero(numero)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: "#cbd5e1" }}>
                              Nenhum número encontrado para esta rodada.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p>Nenhuma rodada encontrada para esta data.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}

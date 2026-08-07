import { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import SalaSelector from "../components/SalaSelector";
import useSalas from "../hooks/useSalas";
import useWebSocket from "../hooks/useWebSocket";
import api from "../services/api";

const STATUS_RODADA_PRIORIDADE = ["EM_ANDAMENTO", "PAUSADA", "AGUARDANDO", "CRIADA"];

function mensagemErro(error, fallback) {
  return error?.response?.data?.mensagem || error?.response?.data?.message || fallback;
}

export default function ParticipantesPage() {
  const {
    salas,
    salaSelecionada,
    salaSelecionadaId,
    selecionarSala,
    carregandoSalas,
    erroSalas,
  } = useSalas();
  const [participantes, setParticipantes] = useState([]);
  const [cartelas, setCartelas] = useState([]);
  const [vinculacoes, setVinculacoes] = useState([]);
  const [progresso, setProgresso] = useState([]);
  const [vencedores, setVencedores] = useState([]);
  const [sessao, setSessao] = useState(null);
  const [rodada, setRodada] = useState(null);
  const [participanteId, setParticipanteId] = useState("");
  const [cartelasSelecionadas, setCartelasSelecionadas] = useState([]);
  const [buscaCartela, setBuscaCartela] = useState("");
  const [novoParticipante, setNovoParticipante] = useState({
    nomeCompleto: "",
    apelido: "",
    telefone: "",
  });
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregarDinamicos = useCallback(async (sessaoAtual, rodadaAtual) => {
    if (!sessaoAtual?.id) return;

    const chamadas = [api.get(`/sessoes/${sessaoAtual.id}/cartelas`)];
    if (rodadaAtual?.id) {
      chamadas.push(
        api.get(`/rodadas/${rodadaAtual.id}/progresso-cartelas`),
        api.get(`/rodadas/${rodadaAtual.id}/vencedores`)
      );
    }

    const respostas = await Promise.all(chamadas);
    setVinculacoes(Array.isArray(respostas[0].data) ? respostas[0].data : []);
    setProgresso(rodadaAtual && Array.isArray(respostas[1]?.data) ? respostas[1].data : []);
    setVencedores(rodadaAtual && Array.isArray(respostas[2]?.data) ? respostas[2].data : []);
  }, []);

  useEffect(() => {
    if (!salaSelecionada) return;

    async function carregar() {
      setCarregando(true);
      setErro("");
      setMensagem("");
      setCartelasSelecionadas([]);

      try {
        const [participantesResponse, cartelasResponse, sessaoResponse] = await Promise.all([
          api.get(`/salas/${salaSelecionada.id}/participantes`),
          api.get(`/salas/${salaSelecionada.id}/cartelas`, {
            params: { serie: salaSelecionada.serieCartela },
          }),
          api.get("/sessoes/ativa", { params: { salaId: salaSelecionada.id } }),
        ]);

        const sessaoAtual = sessaoResponse.data;
        const rodadasResponse = await api.get(`/rodadas/sessao/${sessaoAtual.id}`);
        const rodadas = Array.isArray(rodadasResponse.data) ? rodadasResponse.data : [];
        const rodadaAtual = STATUS_RODADA_PRIORIDADE
          .map((status) => rodadas.find((item) => item.status === status))
          .find(Boolean) || null;

        setParticipantes(Array.isArray(participantesResponse.data) ? participantesResponse.data : []);
        setCartelas(Array.isArray(cartelasResponse.data) ? cartelasResponse.data : []);
        setSessao(sessaoAtual);
        setRodada(rodadaAtual);
        await carregarDinamicos(sessaoAtual, rodadaAtual);
      } catch (error) {
        setErro(mensagemErro(error, "Não foi possível carregar a operação da sessão."));
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, [salaSelecionada, carregarDinamicos]);

  const recarregarRodadaAtual = useCallback(async () => {
    if (!sessao?.id) return;
    const response = await api.get(`/rodadas/sessao/${sessao.id}`);
    const rodadas = Array.isArray(response.data) ? response.data : [];
    const rodadaAtual = STATUS_RODADA_PRIORIDADE
      .map((status) => rodadas.find((item) => item.status === status))
      .find(Boolean) || null;
    setRodada(rodadaAtual);
    await carregarDinamicos(sessao, rodadaAtual);
  }, [carregarDinamicos, sessao]);

  const handleWsMessage = useCallback(
    (event) => {
      if (["ROUND_STARTED", "ROUND_FINISHED"].includes(event.type)) {
        recarregarRodadaAtual().catch(() => {});
        return;
      }

      if (["NUMBER_DRAWN", "ROUND_PAUSED", "ROUND_RESUMED", "WINNER_REGISTERED"].includes(event.type)) {
        carregarDinamicos(sessao, rodada).catch(() => {});
      }
    },
    [carregarDinamicos, recarregarRodadaAtual, sessao, rodada]
  );

  useWebSocket({ sessaoId: sessao?.id, rodadaId: rodada?.id, onMessage: handleWsMessage });

  const idsVinculados = useMemo(
    () => new Set(vinculacoes.map((item) => item.cartelaId)),
    [vinculacoes]
  );

  const cartelasDisponiveis = useMemo(() => {
    const termo = buscaCartela.trim();
    return cartelas.filter(
      (cartela) =>
        !idsVinculados.has(cartela.id) &&
        (!termo || String(cartela.numero).includes(termo))
    );
  }, [cartelas, idsVinculados, buscaCartela]);

  function alternarCartela(cartelaId) {
    setCartelasSelecionadas((atuais) =>
      atuais.includes(cartelaId)
        ? atuais.filter((id) => id !== cartelaId)
        : [...atuais, cartelaId]
    );
  }

  function atualizarNovoParticipante(event) {
    setNovoParticipante((atual) => ({
      ...atual,
      [event.target.name]: event.target.value,
    }));
  }

  async function cadastrarParticipante(event) {
    event.preventDefault();
    if (!salaSelecionadaId) return;
    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      const response = await api.post(
        `/salas/${salaSelecionadaId}/participantes`,
        novoParticipante
      );
      setParticipantes((atuais) => [response.data, ...atuais]);
      setParticipanteId(String(response.data.id));
      setNovoParticipante({ nomeCompleto: "", apelido: "", telefone: "" });
      setMensagem(`${response.data.apelido} foi cadastrado e já está selecionado.`);
    } catch (error) {
      setErro(mensagemErro(error, "Não foi possível cadastrar o participante."));
    } finally {
      setSalvando(false);
    }
  }

  async function vincular(event) {
    event.preventDefault();
    if (!sessao?.id || !participanteId || cartelasSelecionadas.length === 0) return;
    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      await api.post(`/sessoes/${sessao.id}/cartelas`, {
        participanteId: Number(participanteId),
        cartelaIds: cartelasSelecionadas,
      });
      const quantidade = cartelasSelecionadas.length;
      setCartelasSelecionadas([]);
      setBuscaCartela("");
      await carregarDinamicos(sessao, rodada);
      setMensagem(`${quantidade} cartela(s) vinculada(s) ao participante.`);
    } catch (error) {
      setErro(mensagemErro(error, "Não foi possível vincular as cartelas."));
    } finally {
      setSalvando(false);
    }
  }

  async function removerVinculo(vinculacao) {
    const confirmar = window.confirm(
      `Desvincular a cartela ${vinculacao.cartelaNumero} de ${vinculacao.participanteApelido}?`
    );
    if (!confirmar) return;

    setErro("");
    try {
      await api.delete(`/sessoes/${sessao.id}/cartelas/${vinculacao.cartelaId}`);
      await carregarDinamicos(sessao, rodada);
      setMensagem("Cartela desvinculada da sessão.");
    } catch (error) {
      setErro(mensagemErro(error, "Não foi possível remover o vínculo."));
    }
  }

  async function validarVencedor(item, tipoPremio) {
    const labels = { LINHA: "linha", DUPLA_LINHA: "dupla linha", BINGO: "bingo" };
    const confirmar = window.confirm(
      `Confirmar ${labels[tipoPremio]} para ${item.participanteApelido}, cartela ${item.cartelaNumero}?`
    );
    if (!confirmar) return;

    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      await api.post(`/rodadas/${rodada.id}/vencedores`, {
        cartelaId: item.cartelaId,
        tipoPremio,
      });
      await carregarDinamicos(sessao, rodada);
      setMensagem("Vencedor validado e incluído no ranking.");
    } catch (error) {
      setErro(mensagemErro(error, "A cartela não atende aos critérios do prêmio."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Layout
      title="Participantes"
      subtitle="Distribua cartelas, acompanhe quem está perto e valide vencedores."
      actions={<SalaSelector salas={salas} value={salaSelecionadaId} onChange={selecionarSala} disabled={carregandoSalas} />}
    >
      {(erroSalas || erro) && <div className="ui-alert error">{erroSalas || erro}</div>}
      {mensagem && <div className="ui-alert success">{mensagem}</div>}

      <section className="session-strip ui-panel">
        <div><span>Sessão</span><strong>{sessao?.descricao || "Carregando"}</strong></div>
        <div><span>Identificador</span><strong>{sessao?.id || "--"}</strong></div>
        <div><span>Rodada acompanhada</span><strong>{rodada?.numeroRodada || "--"}</strong></div>
        <div><span>Status</span><strong className="status-chip">{rodada?.status?.replaceAll("_", " ") || "Aguardando"}</strong></div>
      </section>

      <details className="ui-panel quick-participant-panel">
        <summary>
          <span><strong>Cadastrar participante</strong><small>Use quando a pessoa ainda não estiver na lista.</small></span>
          <b>Novo cadastro</b>
        </summary>
        <form className="quick-participant-form" onSubmit={cadastrarParticipante}>
          <label>Nome completo<input name="nomeCompleto" value={novoParticipante.nomeCompleto} onChange={atualizarNovoParticipante} required /></label>
          <label>Apelido<input name="apelido" value={novoParticipante.apelido} onChange={atualizarNovoParticipante} required /></label>
          <label>Telefone com DDD<input name="telefone" value={novoParticipante.telefone} onChange={atualizarNovoParticipante} inputMode="tel" required /></label>
          <button className="ui-button primary" type="submit" disabled={salvando}>{salvando ? "Cadastrando..." : "Cadastrar"}</button>
        </form>
      </details>

      <section className="participant-work-grid">
        <form className="ui-panel assignment-panel" onSubmit={vincular}>
          <div className="ui-panel-header">
            <div>
              <span className="ui-kicker">Distribuição</span>
              <h2>Vincular cartelas</h2>
              <p>A mesma cartela só pode pertencer a uma pessoa por sessão.</p>
            </div>
          </div>

          <label className="field-block">
            Participante
            <select value={participanteId} onChange={(event) => setParticipanteId(event.target.value)} required>
              <option value="">Selecione</option>
              {participantes.map((participante) => (
                <option key={participante.id} value={participante.id}>
                  {participante.apelido} — {participante.nomeCompleto}
                </option>
              ))}
            </select>
          </label>

          <div className="card-picker-header">
            <label>
              Buscar cartela
              <input value={buscaCartela} onChange={(event) => setBuscaCartela(event.target.value)} placeholder="Ex.: 701" />
            </label>
            <span>{cartelasSelecionadas.length} selecionada(s)</span>
          </div>

          <div className="card-pick-grid">
            {cartelasDisponiveis.map((cartela) => (
              <button
                type="button"
                key={cartela.id}
                className={cartelasSelecionadas.includes(cartela.id) ? "selected" : ""}
                onClick={() => alternarCartela(cartela.id)}
              >
                <strong>{cartela.numero}</strong>
                <span>Série {cartela.serie}</span>
              </button>
            ))}
            {!carregando && cartelasDisponiveis.length === 0 && (
              <p className="empty-state">Nenhuma cartela disponível para este filtro.</p>
            )}
          </div>

          <button className="ui-button primary full" type="submit" disabled={salvando || !participanteId || cartelasSelecionadas.length === 0}>
            {salvando ? "Salvando..." : "Vincular cartelas selecionadas"}
          </button>
        </form>

        <article className="ui-panel assigned-panel">
          <div className="ui-panel-header">
            <div><span className="ui-kicker">Sessão atual</span><h2>Cartelas em jogo</h2></div>
            <strong className="ui-count">{vinculacoes.length}</strong>
          </div>
          <div className="assigned-list">
            {vinculacoes.map((item) => (
              <div key={item.id}>
                <span className="assigned-card-number">{item.cartelaNumero}</span>
                <div><strong>{item.participanteApelido}</strong><small>{item.participanteNome}</small></div>
                <button type="button" onClick={() => removerVinculo(item)}>Desvincular</button>
              </div>
            ))}
            {!carregando && vinculacoes.length === 0 && <p className="empty-state">Nenhuma cartela vinculada.</p>}
          </div>
        </article>
      </section>

      <section className="ui-panel progress-panel">
        <div className="ui-panel-header">
          <div>
            <span className="ui-kicker">Acompanhamento automático</span>
            <h2>Quem está perto de bingar</h2>
            <p>A lista é atualizada conforme as bolas são sorteadas.</p>
          </div>
          <strong className="ui-count">{progresso.length}</strong>
        </div>

        <div className="responsive-table-wrap">
          <table className="clean-table progress-table">
            <thead><tr><th>Participante</th><th>Cartela</th><th>Progresso</th><th>Linhas</th><th>Faltam</th><th>Validar</th></tr></thead>
            <tbody>
              {progresso.map((item) => (
                <tr key={item.vinculacaoId}>
                  <td><strong>{item.participanteApelido}</strong><small>{item.participanteNome}</small></td>
                  <td><strong>{item.cartelaNumero}</strong><small>Série {item.serie}</small></td>
                  <td>
                    <div className="progress-meter"><span style={{ width: `${item.progressoPercentual}%` }} /></div>
                    <small>{item.acertos}/24 números</small>
                  </td>
                  <td>{item.linhasCompletas}</td>
                  <td><strong>{item.faltamParaBingo}</strong><small>{item.numerosFaltantes.slice(0, 5).join(", ") || "Completa"}</small></td>
                  <td>
                    <div className="validation-actions">
                      <button type="button" disabled={!item.qualificaLinha || salvando} onClick={() => validarVencedor(item, "LINHA")}>Linha</button>
                      <button type="button" disabled={!item.qualificaDuplaLinha || salvando} onClick={() => validarVencedor(item, "DUPLA_LINHA")}>Dupla</button>
                      <button type="button" className="primary" disabled={!item.qualificaBingo || salvando} onClick={() => validarVencedor(item, "BINGO")}>Bingo</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!carregando && progresso.length === 0 && <p className="empty-state">Vincule cartelas para acompanhar o progresso.</p>}
        </div>
      </section>

      <section className="ui-panel winners-panel">
        <div className="ui-panel-header">
          <div><span className="ui-kicker">Resultado da rodada</span><h2>Vencedores validados</h2></div>
          <strong className="ui-count">{vencedores.length}</strong>
        </div>
        <div className="winner-cards">
          {vencedores.map((vencedor) => (
            <article key={vencedor.id}>
              <span>{vencedor.tipoPremio.replaceAll("_", " ")}</span>
              <strong>{vencedor.participanteApelido}</strong>
              <small>Cartela {vencedor.cartelaNumero} · {vencedor.quantidadeAcertos} acertos</small>
            </article>
          ))}
          {vencedores.length === 0 && <p className="empty-state">Nenhum vencedor validado nesta rodada.</p>}
        </div>
      </section>
    </Layout>
  );
}

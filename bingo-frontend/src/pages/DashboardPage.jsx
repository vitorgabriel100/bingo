import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import SalaSelector from "../components/SalaSelector";
import useSalas from "../hooks/useSalas";
import api from "../services/api";

const STATUS_ABERTOS = ["CRIADA", "AGENDADA", "EM_ANDAMENTO", "PAUSADA"];

export default function DashboardPage() {
  const {
    salas,
    salaSelecionada,
    salaSelecionadaId,
    selecionarSala,
    carregandoSalas,
    erroSalas,
  } = useSalas();
  const [dados, setDados] = useState({
    participantes: 0,
    cartelas: 0,
    vinculadas: 0,
    sessao: null,
    rodada: null,
    lider: null,
  });
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!salaSelecionada) return;

    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        const [participantesResponse, cartelasResponse, sessoesResponse, rankingResponse] =
          await Promise.all([
            api.get(`/salas/${salaSelecionada.id}/participantes`),
            api.get(`/salas/${salaSelecionada.id}/cartelas`, {
              params: { serie: salaSelecionada.serieCartela },
            }),
            api.get("/sessoes"),
            api.get(`/salas/${salaSelecionada.id}/ranking`),
          ]);

        const sessoes = Array.isArray(sessoesResponse.data) ? sessoesResponse.data : [];
        const sessao = sessoes.find(
          (item) =>
            item.salaId === salaSelecionada.id && STATUS_ABERTOS.includes(item.status)
        );
        let rodada = null;
        let vinculadas = 0;

        if (sessao) {
          const [rodadasResponse, vinculacoesResponse] = await Promise.all([
            api.get(`/rodadas/sessao/${sessao.id}`),
            api.get(`/sessoes/${sessao.id}/cartelas`),
          ]);
          const rodadas = Array.isArray(rodadasResponse.data) ? rodadasResponse.data : [];
          rodada = rodadas.find((item) => item.status === "EM_ANDAMENTO")
            || rodadas.find((item) => item.status === "PAUSADA")
            || rodadas.find((item) => ["AGUARDANDO", "CRIADA"].includes(item.status))
            || null;
          vinculadas = Array.isArray(vinculacoesResponse.data)
            ? vinculacoesResponse.data.length
            : 0;
        }

        const ranking = Array.isArray(rankingResponse.data) ? rankingResponse.data : [];
        setDados({
          participantes: participantesResponse.data?.length || 0,
          cartelas: cartelasResponse.data?.length || 0,
          vinculadas,
          sessao,
          rodada,
          lider: ranking[0] || null,
        });
      } catch (error) {
        setErro(error?.response?.data?.mensagem || "Não foi possível montar a visão geral.");
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, [salaSelecionada]);

  const statusEvento = useMemo(() => {
    if (!dados.sessao) return "Sem sessão aberta";
    if (dados.rodada?.status === "EM_ANDAMENTO") return "Rodada em andamento";
    if (dados.rodada?.status === "PAUSADA") return "Rodada pausada";
    return "Pronto para iniciar";
  }, [dados]);

  return (
    <Layout
      title="Visão geral"
      subtitle="Acompanhe o evento e acesse cada etapa sem misturar tarefas."
      actions={
        <SalaSelector
          salas={salas}
          value={salaSelecionadaId}
          onChange={selecionarSala}
          disabled={carregandoSalas}
        />
      }
    >
      {(erroSalas || erro) && <div className="ui-alert error">{erroSalas || erro}</div>}

      <section className="overview-hero ui-panel">
        <div>
          <span className="ui-kicker">Evento atual</span>
          <h2>{salaSelecionada?.nome || "Nenhuma sala disponível"}</h2>
          <p>{salaSelecionada?.local || "Cadastre ou selecione uma sala para começar."}</p>
        </div>
        <div className="event-status-block">
          <span className={`status-dot ${dados.rodada?.status === "EM_ANDAMENTO" ? "live" : ""}`} />
          <div>
            <small>Status operacional</small>
            <strong>{carregando ? "Atualizando..." : statusEvento}</strong>
          </div>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Participantes</span>
          <strong>{dados.participantes}</strong>
          <small>cadastrados na sala</small>
        </article>
        <article className="metric-card">
          <span>Cartelas</span>
          <strong>{dados.cartelas}</strong>
          <small>na série {salaSelecionada?.serieCartela || "--"}</small>
        </article>
        <article className="metric-card">
          <span>Em jogo</span>
          <strong>{dados.vinculadas}</strong>
          <small>cartelas vinculadas à sessão</small>
        </article>
        <article className="metric-card">
          <span>Rodada</span>
          <strong>{dados.rodada?.numeroRodada || "--"}</strong>
          <small>{dados.rodada?.status?.replaceAll("_", " ") || "não iniciada"}</small>
        </article>
      </section>

      <section className="overview-grid">
        <article className="ui-panel next-action-card">
          <span className="ui-kicker">Próxima ação</span>
          <h3>{dados.vinculadas ? "Conduzir a rodada" : "Distribuir cartelas"}</h3>
          <p>
            {dados.vinculadas
              ? "O evento já tem cartelas em jogo. Abra o painel ao vivo para iniciar ou continuar o sorteio."
              : "Vincule participantes e cartelas à sessão antes de iniciar o sorteio."}
          </p>
          <Link className="ui-button primary" to={dados.vinculadas ? "/rodada" : "/participantes"}>
            {dados.vinculadas ? "Abrir rodada" : "Organizar participantes"}
          </Link>
        </article>

        <article className="ui-panel leader-card">
          <span className="ui-kicker">Ranking da sala</span>
          {dados.lider ? (
            <>
              <h3>{dados.lider.participanteApelido}</h3>
              <p>{dados.lider.vitorias} vitória(s), sendo {dados.lider.bingos} bingo(s).</p>
            </>
          ) : (
            <>
              <h3>Ainda sem vencedores</h3>
              <p>O ranking será preenchido após a primeira validação.</p>
            </>
          )}
          <Link className="ui-button ghost" to="/ranking">Ver ranking completo</Link>
        </article>
      </section>
    </Layout>
  );
}

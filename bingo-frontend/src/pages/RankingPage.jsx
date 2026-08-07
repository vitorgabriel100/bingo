import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import SalaSelector from "../components/SalaSelector";
import useSalas from "../hooks/useSalas";
import api from "../services/api";

function formatarData(data) {
  if (!data) return "Sem vitória";
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RankingPage() {
  const {
    salas,
    salaSelecionada,
    salaSelecionadaId,
    selecionarSala,
    carregandoSalas,
    erroSalas,
  } = useSalas();
  const [ranking, setRanking] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!salaSelecionadaId) return;
    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        const response = await api.get(`/salas/${salaSelecionadaId}/ranking`);
        setRanking(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        setErro(error?.response?.data?.mensagem || "Não foi possível carregar o ranking.");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [salaSelecionadaId]);

  return (
    <Layout
      title="Ranking"
      subtitle="Resultados confirmados por sala, sem lançamentos manuais."
      actions={<SalaSelector salas={salas} value={salaSelecionadaId} onChange={selecionarSala} disabled={carregandoSalas} />}
    >
      {(erroSalas || erro) && <div className="ui-alert error">{erroSalas || erro}</div>}

      <section className="ranking-highlight-grid">
        {[0, 1, 2].map((indice) => {
          const item = ranking[indice];
          return (
            <article className={`ui-panel ranking-highlight place-${indice + 1}`} key={indice}>
              <span>{indice + 1}º lugar</span>
              <strong>{item?.participanteApelido || "Aguardando"}</strong>
              <p>{item ? `${item.vitorias} vitória(s) · ${item.bingos} bingo(s)` : "Sem resultado registrado"}</p>
            </article>
          );
        })}
      </section>

      <section className="ui-panel">
        <div className="ui-panel-header">
          <div><span className="ui-kicker">Classificação</span><h2>{salaSelecionada?.nome || "Sala"}</h2></div>
          <strong className="ui-count">{ranking.length}</strong>
        </div>

        <div className="responsive-table-wrap">
          <table className="clean-table ranking-table">
            <thead><tr><th>Posição</th><th>Participante</th><th>Vitórias</th><th>Bingos</th><th>Linhas</th><th>Sessões</th><th>Última vitória</th></tr></thead>
            <tbody>
              {ranking.map((item) => (
                <tr key={item.participanteId}>
                  <td><strong className="ranking-position">{item.posicao}</strong></td>
                  <td><strong>{item.participanteApelido}</strong><small>{item.participanteNome}</small></td>
                  <td>{item.vitorias}</td><td>{item.bingos}</td><td>{item.linhas}</td><td>{item.participacoes}</td><td>{formatarData(item.ultimaVitoria)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!carregando && ranking.length === 0 && <p className="empty-state">O ranking será preenchido após a primeira vitória validada.</p>}
          {carregando && <p className="empty-state">Atualizando ranking...</p>}
        </div>
      </section>
    </Layout>
  );
}

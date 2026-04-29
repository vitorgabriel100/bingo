import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";

export default function HistoricoRodadasPage() {
  const [sessaoId] = useState(2);
  const [rodadas, setRodadas] = useState([]);
  const [mensagem, setMensagem] = useState("");
  const navigate = useNavigate();

  async function carregarRodadas() {
    try {
      const response = await api.get(`/rodadas/sessao/${sessaoId}`);
      setRodadas(response.data);
    } catch (error) {
      setMensagem("Erro ao carregar histórico de rodadas.");
    }
  }

  async function encerrarRodada(rodadaId) {
    try {
      await api.patch(`/rodadas/${rodadaId}/encerrar`);
      setMensagem(`Rodada ${rodadaId} encerrada com sucesso.`);
      carregarRodadas();
    } catch (error) {
      setMensagem(
        error?.response?.data?.mensagem || "Erro ao encerrar rodada."
      );
    }
  }

  function usarRodada(rodada) {
    localStorage.setItem("rodadaSelecionadaId", rodada.id);
    localStorage.setItem("rodadaSelecionadaStatus", rodada.status);
    navigate("/operador");
  }

  useEffect(() => {
    carregarRodadas();
  }, []);

  return (
    <Layout title="Histórico de Rodadas">
      <div className="round-history-page">
<header className="round-history-header">
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
    
    <div>
      <h2>Histórico de Rodadas</h2>
      <p>Sessão {sessaoId}</p>
    </div>

    <button onClick={() => navigate("/operador")}>
      Voltar
    </button>

  </div>

  {mensagem && <strong>{mensagem}</strong>}
</header>

        <div className="round-list">
          {rodadas.length > 0 ? (
            rodadas.map((rodada) => (
              <div className="round-card" key={rodada.id}>
                <div>
                  <h3>Rodada {rodada.numeroRodada}</h3>
                  <span>ID: {rodada.id}</span>
                </div>

                <div>
                  <span>Status</span>
                  <strong className={`status-${rodada.status}`}>
                    {rodada.status}
                  </strong>
                </div>

                <div>
                  <span>Início</span>
                  <strong>
                    {rodada.iniciouEm
                      ? new Date(rodada.iniciouEm).toLocaleString("pt-BR")
                      : "-"}
                  </strong>
                </div>

                <div>
                  <span>Encerramento</span>
                  <strong>
                    {rodada.encerrouEm
                      ? new Date(rodada.encerrouEm).toLocaleString("pt-BR")
                      : "-"}
                  </strong>
                </div>

                <div className="round-actions">
                  <button onClick={() => usarRodada(rodada)}>
                    Usar
                  </button>

                  {(rodada.status === "EM_ANDAMENTO" ||
                    rodada.status === "PAUSADA") && (
                    <button
                      className="danger"
                      onClick={() => encerrarRodada(rodada.id)}
                    >
                      Encerrar
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p>Nenhuma rodada encontrada.</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
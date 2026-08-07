import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import SalaSelector from "../components/SalaSelector";
import { useAuth } from "../contexts/AuthContext";
import useSalas from "../hooks/useSalas";
import api from "../services/api";

export default function CartelasPage() {
  const { user } = useAuth();
  const {
    salas,
    salaSelecionada,
    salaSelecionadaId,
    selecionarSala,
    carregandoSalas,
    erroSalas,
  } = useSalas();
  const [cartelas, setCartelas] = useState([]);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({ serie: 8, numeroInicial: 701, numeroFinal: 800 });
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    if (!salaSelecionada) return;
    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        const response = await api.get(`/salas/${salaSelecionada.id}/cartelas`, {
          params: { serie: salaSelecionada.serieCartela },
        });
        setCartelas(Array.isArray(response.data) ? response.data : []);
        setForm({
          serie: salaSelecionada.serieCartela,
          numeroInicial: salaSelecionada.cartelaInicial,
          numeroFinal: salaSelecionada.cartelaFinal,
        });
      } catch (error) {
        setErro(error?.response?.data?.mensagem || "Não foi possível carregar as cartelas.");
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [salaSelecionada]);

  const cartelasFiltradas = useMemo(() => {
    const termo = busca.trim();
    if (!termo) return cartelas;
    return cartelas.filter((cartela) => String(cartela.numero).includes(termo));
  }, [cartelas, busca]);

  function atualizarForm(event) {
    setForm((atual) => ({ ...atual, [event.target.name]: Number(event.target.value) }));
  }

  async function gerarCartelas(event) {
    event.preventDefault();
    if (!salaSelecionadaId) return;
    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      const response = await api.post(`/salas/${salaSelecionadaId}/cartelas/gerar`, form);
      const lista = await api.get(`/salas/${salaSelecionadaId}/cartelas`, {
        params: { serie: form.serie },
      });
      setCartelas(Array.isArray(lista.data) ? lista.data : []);
      setMensagem(
        response.data.cartelasCriadas > 0
          ? `${response.data.cartelasCriadas} cartela(s) criada(s).`
          : "Todas as cartelas desse intervalo já existiam."
      );
    } catch (error) {
      setErro(error?.response?.data?.mensagem || "Não foi possível gerar as cartelas.");
    } finally {
      setSalvando(false);
    }
  }

  const podeGerar = ["GERENTE", "ADMIN"].includes(user?.perfil);

  return (
    <Layout
      title="Cartelas"
      subtitle="Gere, consulte e confira as cartelas de cada sala."
      actions={<SalaSelector salas={salas} value={salaSelecionadaId} onChange={selecionarSala} disabled={carregandoSalas} />}
    >
      {(erroSalas || erro) && <div className="ui-alert error">{erroSalas || erro}</div>}
      {mensagem && <div className="ui-alert success">{mensagem}</div>}

      {podeGerar && (
        <form className="ui-panel compact-form" onSubmit={gerarCartelas}>
          <div>
            <span className="ui-kicker">Gerador</span>
            <h3>Gerar intervalo</h3>
          </div>
          <label>Série<input type="number" min="1" name="serie" value={form.serie} onChange={atualizarForm} /></label>
          <label>Inicial<input type="number" min="1" name="numeroInicial" value={form.numeroInicial} onChange={atualizarForm} /></label>
          <label>Final<input type="number" min="1" name="numeroFinal" value={form.numeroFinal} onChange={atualizarForm} /></label>
          <button className="ui-button primary" type="submit" disabled={salvando || !salaSelecionadaId}>
            {salvando ? "Gerando..." : "Gerar cartelas"}
          </button>
        </form>
      )}

      <section className="ui-panel">
        <div className="ui-panel-header">
          <div>
            <span className="ui-kicker">Acervo da sala</span>
            <h2>Série {salaSelecionada?.serieCartela || form.serie}</h2>
          </div>
          <div className="list-toolbar">
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar número" />
            <strong className="ui-count">{cartelasFiltradas.length}</strong>
          </div>
        </div>

        {carregando ? (
          <p className="empty-state">Carregando cartelas...</p>
        ) : (
          <div className="bingo-card-catalog">
            {cartelasFiltradas.map((cartela) => (
              <article className="clean-bingo-card" key={cartela.id}>
                <header><strong>Cartela {cartela.numero}</strong><span>Série {cartela.serie}</span></header>
                <div className="bingo-letters">{["B", "I", "N", "G", "O"].map((letra) => <b key={letra}>{letra}</b>)}</div>
                <div className="bingo-numbers">
                  {cartela.grade.map((numero, posicao) => (
                    <span className={numero === null ? "free" : ""} key={`${cartela.id}-${posicao}`}>
                      {numero === null ? "L" : numero}
                    </span>
                  ))}
                </div>
              </article>
            ))}
            {!carregando && cartelasFiltradas.length === 0 && (
              <p className="empty-state">Nenhuma cartela encontrada.</p>
            )}
          </div>
        )}
      </section>
    </Layout>
  );
}

import { useState } from "react";
import Layout from "../components/Layout";
import SalaSelector from "../components/SalaSelector";
import { useAuth } from "../contexts/AuthContext";
import useSalas from "../hooks/useSalas";
import api from "../services/api";

const FORM_INICIAL = {
  nome: "",
  local: "",
  slug: "",
  serieCartela: 8,
  cartelaInicial: 701,
  cartelaFinal: 800,
};

export default function SalasPage() {
  const { user } = useAuth();
  const {
    salas,
    salaSelecionada,
    salaSelecionadaId,
    selecionarSala,
    carregandoSalas,
    erroSalas,
    recarregarSalas,
  } = useSalas();
  const [form, setForm] = useState(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  function atualizarCampo(event) {
    const { name, value, type } = event.target;
    setForm((atual) => ({
      ...atual,
      [name]: type === "number" ? Number(value) : value,
    }));
  }

  async function criarSala(event) {
    event.preventDefault();
    setErro("");
    setMensagem("");
    setSalvando(true);

    try {
      const response = await api.post("/salas", form);
      setForm(FORM_INICIAL);
      await recarregarSalas();
      selecionarSala(response.data.id);
      setMensagem(`Sala ${response.data.nome} criada com as cartelas configuradas.`);
    } catch (error) {
      setErro(error?.response?.data?.mensagem || "Não foi possível criar a sala.");
    } finally {
      setSalvando(false);
    }
  }

  async function copiarLink(sala) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${sala.linkCadastro}`);
      setMensagem("Link de cadastro copiado.");
    } catch {
      setErro("Não foi possível copiar o link neste navegador.");
    }
  }

  return (
    <Layout
      title="Salas"
      subtitle="Organize os pontos de bingo e mantenha cada operação isolada."
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
      {mensagem && <div className="ui-alert success">{mensagem}</div>}

      <section className="room-catalog-grid">
        <article className="ui-panel room-focus-card">
          <span className="ui-kicker">Sala selecionada</span>
          <h2>{salaSelecionada?.nome || "Nenhuma sala"}</h2>
          <p>{salaSelecionada?.local || "Local não informado"}</p>

          {salaSelecionada && (
            <>
              <div className="room-detail-grid">
                <div><span>Série</span><strong>{salaSelecionada.serieCartela}</strong></div>
                <div>
                  <span>Intervalo</span>
                  <strong>{salaSelecionada.cartelaInicial}–{salaSelecionada.cartelaFinal}</strong>
                </div>
                <div><span>Status</span><strong>{salaSelecionada.ativa ? "Ativa" : "Inativa"}</strong></div>
              </div>

              <div className="registration-link-box">
                <div>
                  <span>Cadastro público</span>
                  <code>{window.location.origin}{salaSelecionada.linkCadastro}</code>
                </div>
                <button className="ui-button ghost" type="button" onClick={() => copiarLink(salaSelecionada)}>
                  Copiar link
                </button>
              </div>
            </>
          )}
        </article>

        <article className="ui-panel room-list-card">
          <div className="ui-panel-header">
            <div>
              <span className="ui-kicker">Operação</span>
              <h3>Salas cadastradas</h3>
            </div>
            <strong className="ui-count">{salas.length}</strong>
          </div>

          <div className="clean-list">
            {salas.map((sala) => (
              <button
                type="button"
                className={sala.id === salaSelecionadaId ? "active" : ""}
                onClick={() => selecionarSala(sala.id)}
                key={sala.id}
              >
                <div>
                  <strong>{sala.nome}</strong>
                  <span>{sala.local || "Local não informado"}</span>
                </div>
                <small>Série {sala.serieCartela}</small>
              </button>
            ))}
            {!carregandoSalas && salas.length === 0 && (
              <p className="empty-state">Nenhuma sala cadastrada.</p>
            )}
          </div>
        </article>
      </section>

      {user?.perfil === "ADMIN" && (
        <form className="ui-panel separated-form" onSubmit={criarSala}>
          <div className="ui-panel-header">
            <div>
              <span className="ui-kicker">Nova operação</span>
              <h3>Criar sala</h3>
              <p>As cartelas do intervalo serão geradas automaticamente.</p>
            </div>
          </div>

          <div className="form-grid three-columns">
            <label>Nome da sala<input name="nome" value={form.nome} onChange={atualizarCampo} required /></label>
            <label>Local<input name="local" value={form.local} onChange={atualizarCampo} /></label>
            <label>Endereço curto<input name="slug" value={form.slug} onChange={atualizarCampo} placeholder="praca-de-moema" /></label>
            <label>Série<input type="number" min="1" name="serieCartela" value={form.serieCartela} onChange={atualizarCampo} required /></label>
            <label>Cartela inicial<input type="number" min="1" name="cartelaInicial" value={form.cartelaInicial} onChange={atualizarCampo} required /></label>
            <label>Cartela final<input type="number" min="1" name="cartelaFinal" value={form.cartelaFinal} onChange={atualizarCampo} required /></label>
          </div>

          <div className="form-actions">
            <button className="ui-button primary" type="submit" disabled={salvando}>
              {salvando ? "Criando sala..." : "Criar sala"}
            </button>
          </div>
        </form>
      )}
    </Layout>
  );
}

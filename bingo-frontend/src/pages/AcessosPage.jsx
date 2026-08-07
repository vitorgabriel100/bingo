import { useState } from "react";
import Layout from "../components/Layout";
import SalaSelector from "../components/SalaSelector";
import useSalas from "../hooks/useSalas";
import api from "../services/api";

const ACESSO_INICIAL = { nome: "", email: "", senha: "", perfil: "OPERADOR" };

export default function AcessosPage() {
  const {
    salas,
    salaSelecionada,
    salaSelecionadaId,
    selecionarSala,
    carregandoSalas,
    erroSalas,
  } = useSalas();
  const [form, setForm] = useState(ACESSO_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  function atualizar(event) {
    setForm((atual) => ({ ...atual, [event.target.name]: event.target.value }));
  }

  async function criarAcesso(event) {
    event.preventDefault();
    if (!salaSelecionadaId) return;
    setSalvando(true);
    setErro("");
    setMensagem("");
    try {
      const response = await api.post(`/salas/${salaSelecionadaId}/acessos`, form);
      setForm(ACESSO_INICIAL);
      setMensagem(
        response.data.usuarioCriado
          ? `Acesso de ${response.data.nome} criado para ${salaSelecionada.nome}.`
          : `O acesso existente foi vinculado a ${salaSelecionada.nome}.`
      );
    } catch (error) {
      setErro(error?.response?.data?.mensagem || "Não foi possível criar o acesso.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Layout
      title="Acessos"
      subtitle="Crie logins de operador e gerente para cada sala."
      actions={<SalaSelector salas={salas} value={salaSelecionadaId} onChange={selecionarSala} disabled={carregandoSalas} />}
    >
      {(erroSalas || erro) && <div className="ui-alert error">{erroSalas || erro}</div>}
      {mensagem && <div className="ui-alert success">{mensagem}</div>}

      <section className="ui-panel narrow-panel">
        <div className="ui-panel-header">
          <div>
            <span className="ui-kicker">Novo usuário</span>
            <h2>{salaSelecionada?.nome || "Selecione uma sala"}</h2>
            <p>O e-mail pode ser vinculado a mais de uma sala quando já existir.</p>
          </div>
        </div>

        <form className="separated-form embedded" onSubmit={criarAcesso}>
          <div className="form-grid two-columns">
            <label>Nome do responsável<input name="nome" value={form.nome} onChange={atualizar} required /></label>
            <label>E-mail<input type="email" name="email" value={form.email} onChange={atualizar} required /></label>
            <label>Senha<input type="password" minLength="6" name="senha" value={form.senha} onChange={atualizar} required /></label>
            <label>Perfil<select name="perfil" value={form.perfil} onChange={atualizar}><option value="OPERADOR">Operador</option><option value="GERENTE">Gerente</option></select></label>
          </div>
          <div className="form-actions">
            <button className="ui-button primary" type="submit" disabled={salvando || !salaSelecionadaId}>
              {salvando ? "Criando acesso..." : "Criar ou vincular acesso"}
            </button>
          </div>
        </form>
      </section>
    </Layout>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

const INICIAL = {
  salaId: "",
  nomeCompleto: "",
  apelido: "",
  telefone: "",
  email: "",
  senha: "",
};

export default function CadastroJogadorPage() {
  const navigate = useNavigate();
  const [salas, setSalas] = useState([]);
  const [form, setForm] = useState(INICIAL);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api.get("/public/salas")
      .then(({ data }) => {
        const lista = Array.isArray(data) ? data : [];
        setSalas(lista);
        if (lista.length === 1) setForm((atual) => ({ ...atual, salaId: String(lista[0].id) }));
      })
      .catch(() => setErro("Não foi possível carregar as salas disponíveis."));
  }, []);

  function alterar(event) {
    setForm((atual) => ({ ...atual, [event.target.name]: event.target.value }));
  }

  async function enviar(event) {
    event.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      await api.post("/public/jogadores", { ...form, salaId: Number(form.salaId) });
      navigate("/", { replace: true, state: { cadastroConcluido: true } });
    } catch (error) {
      setErro(error?.response?.data?.mensagem || "Não foi possível concluir o cadastro.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="player-auth-page">
      <section className="player-auth-card">
        <Link to="/" className="player-auth-back">Voltar ao login</Link>
        <span className="ui-kicker">Bingo Beneficente</span>
        <h1>Crie sua conta</h1>
        <p>Cadastre-se para consultar a programação e comprar cartelas.</p>

        <form onSubmit={enviar} className="player-auth-form">
          <label>Sala<select name="salaId" value={form.salaId} onChange={alterar} required><option value="">Selecione</option>{salas.map((sala) => <option key={sala.id} value={sala.id}>{sala.nome}</option>)}</select></label>
          <label>Nome completo<input name="nomeCompleto" value={form.nomeCompleto} onChange={alterar} maxLength={120} required /></label>
          <label>Apelido no jogo<input name="apelido" value={form.apelido} onChange={alterar} maxLength={60} required /></label>
          <label>Telefone<input name="telefone" value={form.telefone} onChange={alterar} placeholder="(11) 99999-9999" required /></label>
          <label>E-mail<input type="email" name="email" value={form.email} onChange={alterar} required /></label>
          <label>Senha<input type="password" name="senha" value={form.senha} onChange={alterar} minLength={6} required /></label>
          {erro && <div className="ui-alert error">{erro}</div>}
          <button className="ui-button primary" disabled={salvando}>{salvando ? "Cadastrando..." : "Criar minha conta"}</button>
        </form>
      </section>
    </main>
  );
}

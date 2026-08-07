import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      const user = await login(email, senha);

      if (user.perfil === "OPERADOR") {
        navigate("/dashboard");
      } else if (user.perfil === "JOGADOR") {
        navigate("/jogador");
      } else if (user.perfil === "GERENTE" || user.perfil === "ADMIN") {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      setErro(error?.response?.data?.mensagem || "Falha no login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-app-page">
      <div className="login-app-bg-light login-app-bg-light-one" />
      <div className="login-app-bg-light login-app-bg-light-two" />

      <main className="login-app-shell">
        <section className="login-app-brand">
          <div className="login-app-logo">
            <span>B</span>
          </div>

          <span className="login-app-eyebrow">Sistema oficial</span>

          <h1>Bingo Beneficente</h1>

          <p>
            Controle de sorteio, cartelas, configurações, histórico de rodadas
            e transmissão da TV em tempo real.
          </p>

          <div className="login-app-features">
            <div>
              <strong>Sorteio</strong>
              <span>Painel do operador</span>
            </div>

            <div>
              <strong>TV</strong>
              <span>Globo e números</span>
            </div>

            <div>
              <strong>Relatórios</strong>
              <span>Histórico das rodadas</span>
            </div>
          </div>
        </section>

        <section className="login-app-card">
          <div className="login-app-card-header">
            <span>Acesso ao aplicativo</span>
            <strong>Entrar</strong>
            <small>Informe seu e-mail e senha para continuar.</small>
          </div>

          <form onSubmit={handleSubmit} className="login-app-form">
            <label>
              E-mail
              <input
                type="email"
                placeholder="Digite seu e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>

            <label>
              Senha
              <input
                type="password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {erro && <p className="error-text login-error-text">{erro}</p>}

            <button type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar no sistema"}
            </button>
          </form>

          <div className="login-app-footer">
            <strong>Praça Moema 2</strong>
            <span></span>
          </div>
        </section>
      </main>
    </div>
  );
}

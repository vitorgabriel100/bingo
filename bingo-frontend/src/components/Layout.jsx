import { useAuth } from "../contexts/AuthContext";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Visão geral" },
  { to: "/rodada", label: "Rodada ao vivo" },
  { to: "/preparacao", label: "Preparação" },
  { to: "/programacao", label: "Programação e vendas" },
  { to: "/participantes", label: "Participantes" },
  { to: "/cartelas", label: "Cartelas" },
  { to: "/ranking", label: "Ranking" },
  { to: "/historico-rodadas", label: "Sessões e histórico" },
  { to: "/salas", label: "Salas" },
];

export default function Layout({ title, subtitle, actions, children }) {
  const { user, logout } = useAuth();
  const itens = user?.perfil === "ADMIN"
    ? [...NAV_ITEMS, { to: "/acessos", label: "Acessos" }]
    : user?.perfil === "JOGADOR"
      ? []
      : NAV_ITEMS;

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <NavLink className="workspace-brand" to="/dashboard">
          <span>B</span>
          <div>
            <strong>Bingo Beneficente</strong>
            <small>Gestão de eventos</small>
          </div>
        </NavLink>

        <nav className="workspace-nav" aria-label="Navegação principal">
          {itens.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {user && (
          <div className="workspace-user">
            <div className="workspace-avatar">
              {user.nome?.trim()?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div>
              <strong>{user.nome}</strong>
              <span>{user.perfil}</span>
            </div>
            <button type="button" onClick={logout}>Sair</button>
          </div>
        )}
      </aside>

      <section className="workspace-main">
        <header className="workspace-topbar">
          <div>
            <span className="workspace-eyebrow">Painel de controle</span>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions && <div className="workspace-actions">{actions}</div>}
        </header>

        <main className="workspace-content">{children}</main>
      </section>
    </div>
  );
}

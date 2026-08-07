import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";

export default function Layout({ title, children }) {
  const { user, logout } = useAuth();

  return (
    <div className="app-container">
      <header className="topbar">
        <div>
          <h1>{title}</h1>
          {user && (
            <p>
              {user.nome} | {user.perfil}
            </p>
          )}
        </div>

        {user && (
          <div className="topbar-actions">
            {["OPERADOR", "GERENTE", "ADMIN"].includes(user.perfil) && (
              <>
                <Link to="/operador">Operador</Link>
                <Link to="/salas">Salas</Link>
              </>
            )}
            <button onClick={logout} className="danger-btn">
              Sair
            </button>
          </div>
        )}
      </header>

      <main className="content">{children}</main>
    </div>
  );
}

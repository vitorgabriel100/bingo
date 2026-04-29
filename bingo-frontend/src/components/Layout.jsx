import { useAuth } from "../contexts/AuthContext";

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
          <button onClick={logout} className="danger-btn">
            Sair
          </button>
        )}
      </header>

      <main className="content">{children}</main>
    </div>
  );
}
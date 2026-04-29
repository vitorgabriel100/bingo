import { createContext, useContext, useEffect, useState } from "react";
import { loginRequest } from "../services/authService";
import api from "../services/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
  }, []);

  async function login(email, senha) {
    const data = await loginRequest(email, senha);

    const userData = {
      id: data.usuarioId,
      nome: data.nome,
      email: data.email,
      perfil: data.perfil,

      clienteId: data.clienteId,
      clienteNome: data.clienteNome,

      assinaturaStatus: data.assinaturaStatus,
      assinaturaVencimento: data.assinaturaVencimento,
      assinaturaAtiva: data.assinaturaAtiva,

      token: data.token,
      tipo: data.tipo,
    };

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(userData));

    api.defaults.headers.common.Authorization = `Bearer ${data.token}`;

    setUser(userData);
    return userData;
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    delete api.defaults.headers.common.Authorization;

    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
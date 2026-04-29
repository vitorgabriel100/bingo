import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import OperadorPage from "../pages/OperadorPage";
import JogadorPage from "../pages/JogadorPage";
import TvPage from "../pages/TvPage";
import HistoricoRodadasPage from "../pages/HistoricoRodadasPage";
import ProtectedRoute from "../components/ProtectedRoute";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />

        <Route
          path="/operador"
          element={
            <ProtectedRoute allowedRoles={["OPERADOR", "GERENTE", "ADMIN"]}>
              <OperadorPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/jogador"
          element={
            <ProtectedRoute allowedRoles={["JOGADOR", "ADMIN", "OPERADOR", "GERENTE"]}>
              <JogadorPage />
            </ProtectedRoute>
          }
        />

        <Route path="/tv" element={<TvPage />} />
        <Route path="/historico-rodadas" element={<HistoricoRodadasPage />} />
      </Routes>
    </BrowserRouter>
  );
}
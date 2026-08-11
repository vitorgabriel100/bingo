import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import OperadorPage from "../pages/OperadorPage";
import JogadorPage from "../pages/JogadorPage";
import TvPage from "../pages/TvPage";
import HistoricoRodadasPage from "../pages/HistoricoRodadasPage";
import ProtectedRoute from "../components/ProtectedRoute";
import SalasPage from "../pages/SalasPage";
import CadastroParticipantePage from "../pages/CadastroParticipantePage";
import DashboardPage from "../pages/DashboardPage";
import ParticipantesPage from "../pages/ParticipantesPage";
import CartelasPage from "../pages/CartelasPage";
import RankingPage from "../pages/RankingPage";
import AcessosPage from "../pages/AcessosPage";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/sala/:slug/cadastro"
          element={<CadastroParticipantePage />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={["OPERADOR", "GERENTE", "ADMIN"]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route path="/operador" element={<Navigate to="/rodada" replace />} />

        <Route
          path="/rodada"
          element={
            <ProtectedRoute allowedRoles={["OPERADOR", "GERENTE", "ADMIN"]}>
              <OperadorPage view="sorteio" />
            </ProtectedRoute>
          }
        />

        <Route
          path="/preparacao"
          element={
            <ProtectedRoute allowedRoles={["OPERADOR", "GERENTE", "ADMIN"]}>
              <OperadorPage view="configuracoes" />
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
        <Route path="/tv/sala/:salaId" element={<TvPage />} />
        <Route
          path="/historico-rodadas"
          element={
            <ProtectedRoute allowedRoles={["OPERADOR", "GERENTE", "ADMIN"]}>
              <HistoricoRodadasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/participantes"
          element={
            <ProtectedRoute allowedRoles={["OPERADOR", "GERENTE", "ADMIN"]}>
              <ParticipantesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cartelas"
          element={
            <ProtectedRoute allowedRoles={["OPERADOR", "GERENTE", "ADMIN"]}>
              <CartelasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ranking"
          element={
            <ProtectedRoute allowedRoles={["OPERADOR", "GERENTE", "ADMIN"]}>
              <RankingPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/salas"
          element={
            <ProtectedRoute allowedRoles={["OPERADOR", "GERENTE", "ADMIN"]}>
              <SalasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/acessos"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <AcessosPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

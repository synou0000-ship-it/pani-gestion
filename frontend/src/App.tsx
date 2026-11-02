import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { Layout } from './components/layout/Layout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { NouvelleVentePage } from './pages/NouvelleVentePage';
import { VentesPage } from './pages/VentesPage';
import { StockPage } from './pages/StockPage';
import { CaissePage } from './pages/CaissePage';
import { DepensesPage } from './pages/DepensesPage';
import { ClientsPage } from './pages/ClientsPage';
import { FournisseursPage } from './pages/FournisseursPage';
import { AchatsPage } from './pages/AchatsPage';
import { InventairePage } from './pages/InventairePage';
import { RapportsPage } from './pages/RapportsPage';
import { UtilisateursPage } from './pages/UtilisateursPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500" />
          <span className="text-sm font-semibold tracking-wider uppercase text-slate-400">
            PANI GESTION...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="ventes" element={<VentesPage />} />
        <Route path="ventes/nouvelle" element={<NouvelleVentePage />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="caisse" element={<CaissePage />} />
        <Route path="depenses" element={<DepensesPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="fournisseurs" element={<FournisseursPage />} />
        <Route path="achats" element={<AchatsPage />} />
        <Route path="inventaire" element={<InventairePage />} />
        <Route path="rapports" element={<RapportsPage />} />
        <Route path="utilisateurs" element={<UtilisateursPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};


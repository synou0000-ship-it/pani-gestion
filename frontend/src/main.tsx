import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { App } from './App';
import { initSQLite } from './lib/sqlite';
import { startAutoSync } from './lib/sync';
import { initOfflineDefaultData } from './lib/api';
import './index.css';

// Initialiser les données de cache local par défaut
initOfflineDefaultData();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchInterval: 10000, // Rafraîchissement automatique toutes les 10s pour synchro en direct
      retry: 1,
    },
  },
});

// Initialiser SQLite (sur APK Android) et démarrer la synchronisation bidirectionnelle
initSQLite().then(() => {
  startAutoSync();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

import React, { useState, useEffect } from 'react';
import { Menu, LogOut, RefreshCw, User as UserIcon, Database, CloudDownload, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeSync, syncBidirectional, forceFullResetSync, SyncStatus } from '../../lib/sync';
import { isSQLiteAvailable } from '../../lib/sqlite';
import { Button } from '../ui/Button';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [sync, setSync] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncTime: null,
    pendingCount: 0,
    error: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  });
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeSync((newStatus) => {
      setSync(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    const success = await syncBidirectional(true);
    if (success) {
      queryClient.invalidateQueries();
    }
  };

  const handleForceReset = async () => {
    setShowResetConfirm(false);
    setIsResetting(true);
    try {
      const success = await forceFullResetSync();
      if (success) {
        queryClient.invalidateQueries();
        alert('✅ Réinitialisation terminée ! Données synchronisées depuis le Cloud.');
      } else {
        alert('❌ Échec de la réinitialisation. Vérifiez votre connexion Internet.');
      }
    } finally {
      setIsResetting(false);
    }
  };

  const formatLastSync = (iso: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const hasSQLite = isSQLiteAvailable();

  return (
    <>
      <header className="h-14 sm:h-16 bg-white border-b border-slate-200/90 sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 shadow-[0_1px_2px_rgba(0,0,0,0.02)] safe-top">
        {/* Left side: Hamburger menu + Connectivity Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-1.5 -ml-1 rounded text-slate-600 hover:bg-slate-100 active:scale-95 transition-all focus:outline-none"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Mobile Mini Logo */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="h-7 w-7 rounded bg-emerald-700 flex items-center justify-center text-white font-serif font-bold text-xs shadow-xs">
              P
            </div>
            <span className="font-serif font-bold text-slate-900 text-sm tracking-wider hidden xs:inline">
              PANI
            </span>
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5">
            {/* Network pill */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-serif font-bold border transition-all ${
                sync.isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-900 border-amber-300'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  sync.isOnline ? 'bg-emerald-600 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span className="hidden sm:inline">
                {sync.isOnline ? 'En ligne' : 'Hors-ligne'}
              </span>
            </div>

            {/* SQLite Badge */}
            {hasSQLite && (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-serif font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                <Database className="h-3 w-3 shrink-0 text-indigo-600" />
                <span className="hidden md:inline">SQLite Local</span>
              </div>
            )}

            {/* Sync Button */}
            <Button
              variant="outline"
              size="xs"
              onClick={handleManualSync}
              disabled={sync.isSyncing || isResetting}
              className="h-7 text-[11px] border-slate-300 bg-white hover:bg-slate-50 text-slate-800 rounded-full px-3 shadow-none font-serif"
              title={sync.lastSyncTime ? `Dernière synchro : ${formatLastSync(sync.lastSyncTime)}` : 'Synchroniser'}
            >
              <RefreshCw className={`h-3 w-3 text-slate-500 ${sync.isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">
                {sync.isSyncing ? 'Synchro...' : 'Synchro'}
              </span>
              {sync.pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-serif font-bold animate-pulse">
                  {sync.pendingCount}
                </span>
              )}
              {sync.lastSyncTime && !sync.isSyncing && (
                <span className="hidden lg:inline text-[10px] text-slate-400 italic">
                  {formatLastSync(sync.lastSyncTime)}
                </span>
              )}
            </Button>

            {/* Bouton Réinitialiser depuis Cloud (mobile seulement, visible si SQLite actif) */}
            {hasSQLite && (
              <button
                onClick={() => setShowResetConfirm(true)}
                disabled={isResetting || sync.isSyncing}
                title="Réinitialiser les données depuis le Cloud"
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-serif font-bold border bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100 active:scale-95 transition-all disabled:opacity-50"
              >
                <CloudDownload className={`h-3 w-3 shrink-0 ${isResetting ? 'animate-bounce text-blue-600' : ''}`} />
                <span className="hidden sm:inline">{isResetting ? 'Reset...' : 'Reset Cloud'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right side: User Profile & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="h-8 w-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-serif font-bold text-xs shadow-xs border border-emerald-600">
                {user.prenom?.[0] || user.nom?.[0] || <UserIcon className="h-3.5 w-3.5" />}
              </div>
              <div className="hidden sm:block text-left leading-none font-serif">
                <div className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                  {user.prenom ? `${user.prenom} ${user.nom}` : user.nom}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                  {user.role?.nom || 'Administrateur'}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            title="Déconnexion"
            className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all"
            aria-label="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Modal de confirmation Réinitialisation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 font-serif">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Réinitialiser depuis le Cloud ?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Cette action est irréversible</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-5">
              Toutes les données locales du smartphone seront <strong>effacées</strong> et remplacées par les données du serveur Cloud (<span className="text-emerald-700 font-semibold">pani-gestion.vercel.app</span>).
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 px-4 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleForceReset}
                className="flex-1 py-2 px-4 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <CloudDownload className="h-4 w-4" />
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

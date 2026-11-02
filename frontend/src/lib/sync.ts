/**
 * Moteur de synchronisation bidirectionnelle PANI GESTION
 * PostgreSQL (Serveur / PC) <---> SQLite (Mobile Android / APK)
 */

import {
  api,
  getOfflineVentes,
  clearOfflineVentes,
  getOfflineClients,
  clearOfflineClients,
  getOfflineDepenses,
  clearOfflineDepenses,
  getOfflineAchats,
  clearOfflineAchats,
  getWebOfflinePendingCount,
} from './api';
import {
  isSQLiteAvailable,
  sqliteGetPendingItems,
  sqliteApplyPushMappings,
  sqliteUpsertRole,
  sqliteUpsertUtilisateur,
  sqliteUpsertProduit,
  sqliteUpsertTarif,
  sqliteUpsertClient,
  sqliteUpsertFournisseur,
  sqliteUpsertCaisse,
  sqliteUpsertVente,
  sqliteUpsertDepense,
  sqliteUpsertAchat,
  sqliteGetPendingCount,
} from './sqlite';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingCount: number;
  error: string | null;
  isOnline: boolean;
}

let syncStatus: SyncStatus = {
  isSyncing: false,
  lastSyncTime: localStorage.getItem('pani_last_sync_time'),
  pendingCount: 0,
  error: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
};

type SyncListener = (status: SyncStatus) => void;
const listeners: Set<SyncListener> = new Set();

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener({ ...syncStatus });
    } catch (err) {
      console.error('[Sync] Erreur dans un auditeur:', err);
    }
  });
}

export function subscribeSync(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({ ...syncStatus });
  return () => {
    listeners.delete(listener);
  };
}

export async function refreshPendingCount(): Promise<number> {
  let count = 0;
  if (isSQLiteAvailable()) {
    count = await sqliteGetPendingCount();
  } else {
    count = getWebOfflinePendingCount();
  }
  syncStatus.pendingCount = count;
  notifyListeners();
  return count;
}

export function getSyncStatus(): SyncStatus {
  return { ...syncStatus };
}

/**
 * PUSH : Envoie les données créées en local (SQLite sur mobile ou localStorage sur PC) vers PostgreSQL
 */
export async function pushLocalChanges(): Promise<boolean> {
  // 1. CAS MOBILE : SQLite
  if (isSQLiteAvailable()) {
    try {
      const pending = await sqliteGetPendingItems();
      const hasItems =
        pending.clients.length > 0 ||
        pending.ventes.length > 0 ||
        pending.depenses.length > 0 ||
        pending.achats.length > 0;

      if (!hasItems) {
        syncStatus.pendingCount = 0;
        notifyListeners();
        return true;
      }

      console.log(`[Sync] PUSH SQLite: Envoi de ${pending.ventes.length} ventes, ${pending.clients.length} clients, ${pending.depenses.length} dépenses, ${pending.achats.length} achats vers PostgreSQL...`);

      const res = await api.post('/sync/push', pending);
      if (res.data?.success && res.data?.data?.mappings) {
        await sqliteApplyPushMappings(res.data.data.mappings);
        syncStatus.pendingCount = await sqliteGetPendingCount();
        syncStatus.isOnline = true;
        notifyListeners();
        window.dispatchEvent(new Event('pani:data-changed'));
        console.log('[Sync] ✅ PUSH SQLite terminé avec succès et base locale mise à jour');
        return true;
      }
      return false;
    } catch (err: any) {
      syncStatus.isOnline = false;
      notifyListeners();
      console.warn('[Sync] ⚠️ Échec du PUSH SQLite vers le serveur (mode hors-ligne actif):', err.message);
      return false;
    }
  }

  // 2. CAS PC / WEB : localStorage
  try {
    const webVentes = getOfflineVentes();
    const webClients = getOfflineClients();
    const webDepenses = getOfflineDepenses();
    const webAchats = getOfflineAchats();

    const hasWebItems =
      webVentes.length > 0 ||
      webClients.length > 0 ||
      webDepenses.length > 0 ||
      webAchats.length > 0;

    if (!hasWebItems) {
      syncStatus.pendingCount = 0;
      notifyListeners();
      return true;
    }

    console.log(`[Sync] PUSH Web: Envoi de ${webVentes.length} ventes, ${webClients.length} clients, ${webDepenses.length} dépenses vers PostgreSQL...`);

    const res = await api.post('/sync/push', {
      ventes: webVentes,
      clients: webClients,
      depenses: webDepenses,
      achats: webAchats,
    });

    if (res.data?.success) {
      clearOfflineVentes();
      clearOfflineClients();
      clearOfflineDepenses();
      clearOfflineAchats();
      syncStatus.pendingCount = 0;
      syncStatus.isOnline = true;
      notifyListeners();
      window.dispatchEvent(new Event('pani:data-changed'));
      console.log('[Sync] ✅ PUSH Web terminé avec succès vers PostgreSQL');
      return true;
    }
    return false;
  } catch (err: any) {
    syncStatus.isOnline = false;
    notifyListeners();
    console.warn('[Sync] ⚠️ Échec du PUSH Web vers le serveur (mode hors-ligne actif):', err.message);
    return false;
  }
}

/**
 * PULL : Télécharge les modifications depuis PostgreSQL vers SQLite
 */
export async function pullServerChanges(): Promise<boolean> {
  try {
    const since = localStorage.getItem('pani_last_sync_time') || undefined;
    const res = await api.get('/sync/pull', { params: { since } });

    if (!res.data?.success || !res.data?.data) {
      return false;
    }

    const data = res.data.data;
    console.log(`[Sync] PULL: Reçu ${data.produits?.length || 0} produits, ${data.ventes?.length || 0} ventes, ${data.clients?.length || 0} clients depuis PostgreSQL`);

    // Si SQLite est actif (sur mobile), insérer toutes les données dans SQLite
    if (isSQLiteAvailable()) {
      if (data.roles) {
        for (const r of data.roles) await sqliteUpsertRole(r);
      }
      if (data.utilisateurs) {
        for (const u of data.utilisateurs) await sqliteUpsertUtilisateur(u);
      }
      if (data.produits) {
        for (const p of data.produits) await sqliteUpsertProduit(p);
      }
      if (data.tarifs) {
        for (const t of data.tarifs) await sqliteUpsertTarif(t);
      }
      if (data.clients) {
        for (const c of data.clients) await sqliteUpsertClient(c);
      }
      if (data.fournisseurs) {
        for (const f of data.fournisseurs) await sqliteUpsertFournisseur(f);
      }
      if (data.caisses) {
        for (const c of data.caisses) await sqliteUpsertCaisse(c);
      }
      if (data.ventes) {
        for (const v of data.ventes) await sqliteUpsertVente(v);
      }
      if (data.depenses) {
        for (const d of data.depenses) await sqliteUpsertDepense(d);
      }
      if (data.achats) {
        for (const a of data.achats) await sqliteUpsertAchat(a);
      }
    }

    // Mettre à jour l'horodatage de dernière synchronisation
    if (data.serverTime) {
      localStorage.setItem('pani_last_sync_time', data.serverTime);
      syncStatus.lastSyncTime = data.serverTime;
    }

    return true;
  } catch (err: any) {
    console.warn('[Sync] ⚠️ Échec du PULL depuis le serveur:', err.message);
    return false;
  }
}

/**
 * Synchronisation complète bidirectionnelle :
 * 1. PUSH (SQLite -> PostgreSQL)
 * 2. PULL (PostgreSQL -> SQLite)
 */
export async function syncBidirectional(isManual = false): Promise<boolean> {
  if (syncStatus.isSyncing) return false;

  const token = localStorage.getItem('pani_token');
  if (!token) return false;

  syncStatus.isSyncing = true;
  syncStatus.error = null;
  notifyListeners();

  try {
    // 1. Envoyer les modifications locales d'abord
    await pushLocalChanges();

    // 2. Récupérer les nouveautés du serveur
    const pullSuccess = await pullServerChanges();

    if (pullSuccess) {
      syncStatus.error = null;
      syncStatus.isOnline = true;
      await refreshPendingCount();
    } else {
      syncStatus.isOnline = false;
    }

    syncStatus.isSyncing = false;
    notifyListeners();
    return pullSuccess;
  } catch (err: any) {
    syncStatus.isSyncing = false;
    syncStatus.error = err.message || 'Erreur de synchronisation';
    syncStatus.isOnline = false;
    notifyListeners();
    return false;
  }
}

// =====================================================
// DÉMARRAGE AUTOMATIQUE DU SERVICE DE SYNCHRONISATION
// =====================================================

let autoSyncInterval: any = null;

export function startAutoSync(): void {
  if (typeof window === 'undefined') return;

  // Écoute des événements réseau du navigateur/OS
  window.addEventListener('online', () => {
    console.log('[Sync] Réseau rétabli — déclenchement de la synchronisation...');
    syncStatus.isOnline = true;
    notifyListeners();
    syncBidirectional();
  });

  window.addEventListener('offline', () => {
    console.log('[Sync] Connexion réseau perdue — passage en mode SQLite local');
    syncStatus.isOnline = false;
    notifyListeners();
  });

  // Cycle de synchronisation périodique toutes les 10 secondes
  if (!autoSyncInterval) {
    autoSyncInterval = setInterval(() => {
      if (navigator.onLine && localStorage.getItem('pani_token') && !syncStatus.isSyncing) {
        syncBidirectional();
      }
    }, 10000);
  }

  // Première synchronisation immédiate si connecté
  if (navigator.onLine && localStorage.getItem('pani_token')) {
    syncBidirectional();
  }
}

export function stopAutoSync(): void {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
}


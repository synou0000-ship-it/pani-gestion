import axios from 'axios';
import { Capacitor } from '@capacitor/core';

export const PRODUCTION_CLOUD_URL = 'https://pani-gestion.vercel.app/api';

// Détection précise et fiable de l'environnement natif Android / iOS (Capacitor APK)
export function isNativePlatform(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (Capacitor.isNativePlatform()) return true;
    const plat = Capacitor.getPlatform();
    if (plat === 'android' || plat === 'ios') return true;
  } catch (_) {}

  // Dans la WebView Android de Capacitor :
  // Le protocole est http/https et hostname est 'localhost' sans port personnalisé (ex: 5173 en dev)
  if (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '' || window.location.port === '80' || window.location.port === '443')) {
    return true;
  }
  if (window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:' || window.location.protocol === 'file:') {
    return true;
  }
  return false;
}

// Nettoyer et normaliser l'URL du serveur API
export function cleanServerURL(raw: string): string {
  let url = (raw || '').trim();
  if (!url) return '';

  // Si c'est juste un chemin relatif sur le web (ex: '/api')
  if (url === '/api') return '/api';

  // 1. Ajouter le protocole http:// si absent
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }

  // 2. Corriger si l'utilisateur a tapé le port 5173 (Vite frontend) au lieu de 5000 (Backend API)
  url = url.replace(':5173', ':5000');

  // 3. Supprimer les slashs de fin
  url = url.replace(/\/+$/, '');

  // 4. Si aucun port n'est spécifié après l'IP ou le nom d'hôte (ex: http://192.168.1.100)
  try {
    const parsed = new URL(url);
    if (!parsed.port && parsed.hostname !== 'localhost' && !parsed.hostname.includes('.com') && !parsed.hostname.includes('.org') && !parsed.hostname.includes('.app')) {
      parsed.port = '5000';
      url = parsed.toString().replace(/\/+$/, '');
    }
  } catch (_e) {
    if (!/:\d+/.test(url)) {
      url = url.replace(/^(https?:\/\/[^\/]+)/, '$1:5000');
    }
  }

  // 5. S'assurer de terminer par /api
  if (!url.endsWith('/api') && !url.includes('/api/')) {
    url = `${url}/api`;
  }

  return url;
}

// URLs de tunnels expirés ou anciennes adresses locales obsolètes
const EXPIRED_TUNNEL_PATTERNS = [
  'fortune-dose-historical-manufacturing',
  'effect-kits-reg-gnome',
  'injured-deaf-horses-magnetic',
];

export function getDefaultServerURL(): string {
  // 1. Sur Vercel Web (domaine *.vercel.app) : toujours utiliser /api relatif
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    const saved = localStorage.getItem('pani_server_url');
    if (saved && (saved.startsWith('http://') || saved.includes('localhost') || saved.includes('192.168.'))) {
      localStorage.removeItem('pani_server_url');
    } else if (saved && saved.startsWith('https://')) {
      return cleanServerURL(saved);
    }
    return '/api';
  }

  // 2. Sur Smartphone APK Android (Capacitor) :
  // Le Cloud Vercel est LE serveur obligatoire pour partager la même base PostgreSQL
  if (isNativePlatform()) {
    const saved = localStorage.getItem('pani_server_url');
    if (saved) {
      // Purger immédiatement les anciennes IPs locales (192.168.x, localhost, etc.)
      const isObsolete =
        saved.includes('192.168.') ||
        saved.includes('localhost') ||
        saved.includes(':5000') ||
        saved.includes(':5173') ||
        EXPIRED_TUNNEL_PATTERNS.some((p) => saved.includes(p));

      if (isObsolete) {
        localStorage.removeItem('pani_server_url');
        console.log('[API] Ancienne IP locale effacée sur smartphone -> retour Cloud Vercel');
        return PRODUCTION_CLOUD_URL;
      }
      return cleanServerURL(saved) || PRODUCTION_CLOUD_URL;
    }
    return PRODUCTION_CLOUD_URL;
  }

  // 3. En développement PC web (ex: Vite proxy)
  return (import.meta as any).env?.VITE_API_URL || '/api';
}

// Nettoyage automatique au démarrage pour garantir la synchronisation avec PostgreSQL
export function performInitialCleanup(): void {
  if (typeof window === 'undefined') return;

  const isNative = isNativePlatform();
  const savedUrl = localStorage.getItem('pani_server_url');

  if (savedUrl && (savedUrl.includes('192.168.') || savedUrl.includes('localhost') || savedUrl.includes(':5000') || EXPIRED_TUNNEL_PATTERNS.some(p => savedUrl.includes(p)))) {
    localStorage.removeItem('pani_server_url');
    console.log('[API] URL locale obsolète purgée');
  }

  // Si l'utilisateur est coincé dans une fausse session hors-ligne "Administrateur Local"
  const token = localStorage.getItem('pani_token');
  const user = localStorage.getItem('pani_user');
  if (token && token.startsWith('offline_token_')) {
    localStorage.removeItem('pani_token');
    localStorage.removeItem('pani_user');
    console.log('[API] Fausse session hors-ligne purgée');
  } else if (user && (user.includes('Administrateur Local') || user.includes('Mode Hors-Ligne'))) {
    localStorage.removeItem('pani_token');
    localStorage.removeItem('pani_user');
  }

  // Sur smartphone APK : vider les anciens caches obsolètes qui affichaient des données périmées
  if (isNative) {
    localStorage.removeItem('pani_offline_dashboard');
    localStorage.removeItem('pani_pending_count');
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('pani_cache_') || k === 'pani_last_sync_time')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    if (keysToRemove.length > 0) {
      console.log(`[API] ${keysToRemove.length} caches obsolètes supprimés sur smartphone`);
    }
  }
}

// Exécuter immédiatement
performInitialCleanup();

export function setServerURL(url: string): string {
  const cleanUrl = cleanServerURL(url);
  localStorage.setItem('pani_server_url', cleanUrl);
  api.defaults.baseURL = cleanUrl;
  return cleanUrl;
}

export function resetServerURL(): string {
  localStorage.removeItem('pani_server_url');
  const defaultUrl = getDefaultServerURL();
  api.defaults.baseURL = defaultUrl;
  return defaultUrl;
}

export const api = axios.create({
  baseURL: getDefaultServerURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Intercepteur pour injecter le token JWT et s'assurer de la bonne baseURL
api.interceptors.request.use((config) => {
  const currentBase = localStorage.getItem('pani_server_url') || getDefaultServerURL();
  if (config.baseURL !== currentBase && !config.url?.startsWith('http')) {
    config.baseURL = currentBase;
  }

  const token = localStorage.getItem('pani_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer l'expiration de session & cache hors-ligne
api.interceptors.response.use(
  (response) => {
    // Si la requête est un GET réussi, mettre en cache pour consultation hors-ligne
    if (response.config.method === 'get') {
      try {
        const cacheKey = `pani_cache_${response.config.url}`;
        localStorage.setItem(cacheKey, JSON.stringify(response.data));
      } catch (e) {
        // quota localStorage dépassé ou indisponible
      }
    }
    return response;
  },
  async (error) => {
    // Si erreur réseau (hors-ligne), timeout, ou erreur Cloudflare tunnel (530, 502, 503, 504, 520..525)
    const isNetworkOrTunnelError =
      !error.response ||
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      [502, 503, 504, 520, 521, 522, 523, 524, 530].includes(error.response?.status);

    if (isNetworkOrTunnelError && error.config && error.config.method === 'get') {
      const cacheKey = `pani_cache_${error.config.url}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        console.warn(`[Mode Hors-ligne] Données servies depuis le cache local pour ${error.config.url}`);
        return {
          data: JSON.parse(cached),
          status: 200,
          statusText: 'OK (Cache Local)',
          headers: { 'x-from-cache': 'true' },
          config: error.config,
          isFromCache: true
        };
      }
    }

    if (error.response?.status === 401) {
      localStorage.removeItem('pani_token');
      localStorage.removeItem('pani_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- GESTION DES DONNÉES HORS-LIGNE (FALLBACK PC WEB & MOBILE) ---
export interface OfflineVente {
  reference: string;
  clientId?: number | null;
  dateVente: string;
  montantTotal: number;
  montantPaye: number;
  resteAPayer: number;
  modePaiement: string;
  notes?: string;
  details: Array<{
    produitId: number;
    tarifId: number;
    quantite: number;
    prixUnitaire: number;
  }>;
}

export function saveOfflineVente(vente: OfflineVente): void {
  const queue: OfflineVente[] = JSON.parse(localStorage.getItem('pani_offline_ventes') || '[]');
  queue.push(vente);
  localStorage.setItem('pani_offline_ventes', JSON.stringify(queue));
  updateLocalPendingCount();
}

export function getOfflineVentes(): OfflineVente[] {
  return JSON.parse(localStorage.getItem('pani_offline_ventes') || '[]');
}

export function clearOfflineVentes(): void {
  localStorage.removeItem('pani_offline_ventes');
  updateLocalPendingCount();
}

export interface OfflineClient {
  localId?: number;
  nom: string;
  prenom?: string;
  telephone?: string;
  adresse?: string;
  typeClient?: string;
  email?: string;
}

export function saveOfflineClient(client: OfflineClient): void {
  const queue: OfflineClient[] = JSON.parse(localStorage.getItem('pani_offline_clients') || '[]');
  client.localId = Date.now();
  queue.push(client);
  localStorage.setItem('pani_offline_clients', JSON.stringify(queue));
  updateLocalPendingCount();
}

export function getOfflineClients(): OfflineClient[] {
  return JSON.parse(localStorage.getItem('pani_offline_clients') || '[]');
}

export function clearOfflineClients(): void {
  localStorage.removeItem('pani_offline_clients');
  updateLocalPendingCount();
}

export interface OfflineFournisseur {
  localId?: number;
  nom: string;
  contact?: string;
  telephone?: string;
  adresse?: string;
  email?: string;
}

export function saveOfflineFournisseur(fournisseur: OfflineFournisseur): void {
  const queue: OfflineFournisseur[] = JSON.parse(localStorage.getItem('pani_offline_fournisseurs') || '[]');
  fournisseur.localId = Date.now();
  queue.push(fournisseur);
  localStorage.setItem('pani_offline_fournisseurs', JSON.stringify(queue));
  updateLocalPendingCount();
}

export function getOfflineFournisseurs(): OfflineFournisseur[] {
  return JSON.parse(localStorage.getItem('pani_offline_fournisseurs') || '[]');
}

export function clearOfflineFournisseurs(): void {
  localStorage.removeItem('pani_offline_fournisseurs');
  updateLocalPendingCount();
}

export interface OfflineDepense {
  localId?: number;
  numero?: string;
  categorie: string;
  description: string;
  montant: number;
  modePaiement?: string;
  beneficiaire?: string;
  dateDepense?: string;
  notes?: string;
}

export function saveOfflineDepense(dep: OfflineDepense): void {
  const queue: OfflineDepense[] = JSON.parse(localStorage.getItem('pani_offline_depenses') || '[]');
  dep.localId = Date.now();
  dep.numero = dep.numero || `DEP-WEB-${Date.now()}`;
  dep.dateDepense = dep.dateDepense || new Date().toISOString();
  queue.push(dep);
  localStorage.setItem('pani_offline_depenses', JSON.stringify(queue));
  updateLocalPendingCount();
}

export function getOfflineDepenses(): OfflineDepense[] {
  return JSON.parse(localStorage.getItem('pani_offline_depenses') || '[]');
}

export function clearOfflineDepenses(): void {
  localStorage.removeItem('pani_offline_depenses');
  updateLocalPendingCount();
}

export interface OfflineAchat {
  localId?: number;
  reference?: string;
  fournisseurId: number;
  montantTotal: number;
  montantPaye: number;
  resteAPayer: number;
  statut?: string;
  dateAchat?: string;
  details?: Array<{
    produitId: number;
    quantite: number;
    prixUnitaire: number;
  }>;
}

export function saveOfflineAchat(achat: OfflineAchat): void {
  const queue: OfflineAchat[] = JSON.parse(localStorage.getItem('pani_offline_achats') || '[]');
  achat.localId = Date.now();
  achat.reference = achat.reference || `ACH-WEB-${Date.now()}`;
  achat.dateAchat = achat.dateAchat || new Date().toISOString();
  queue.push(achat);
  localStorage.setItem('pani_offline_achats', JSON.stringify(queue));
  updateLocalPendingCount();
}

export function getOfflineAchats(): OfflineAchat[] {
  return JSON.parse(localStorage.getItem('pani_offline_achats') || '[]');
}

export function clearOfflineAchats(): void {
  localStorage.removeItem('pani_offline_achats');
  updateLocalPendingCount();
}

export function getWebOfflinePendingCount(): number {
  return (
    getOfflineVentes().length +
    getOfflineClients().length +
    getOfflineFournisseurs().length +
    getOfflineDepenses().length +
    getOfflineAchats().length
  );
}

function updateLocalPendingCount(): void {
  const count = getWebOfflinePendingCount();
  localStorage.setItem('pani_pending_count', count.toString());
}

export async function syncOfflineVentes(): Promise<{ success: boolean; count: number }> {
  const queue = getOfflineVentes();
  if (queue.length === 0) return { success: true, count: 0 };

  try {
    const res = await api.post('/sync/push', { ventes: queue });
    if (res.data.success) {
      clearOfflineVentes();
      return { success: true, count: queue.length };
    }
  } catch (err) {
    console.warn('[Sync] Échec de synchronisation (toujours hors-ligne)');
  }
  return { success: false, count: queue.length };
}

// Initialiser les données de démonstration/secours pour le mode 100% hors-ligne
export function initOfflineDefaultData(): void {
  const defaultProduits = {
    success: true,
    data: [
      {
        id: 1,
        nom: 'Pani',
        description: 'Produit commercial Pani',
        unite: 'unité',
        stockActuel: 500,
        tarifs: [
          { id: 1, produitId: 1, designation: 'Petit prix', prix: 500, actif: true },
          { id: 2, produitId: 1, designation: 'Prix intermédiaire 1', prix: 1000, actif: true },
          { id: 3, produitId: 1, designation: 'Prix intermédiaire 2', prix: 1500, actif: true },
          { id: 4, produitId: 1, designation: 'Prix supérieur', prix: 2000, actif: true },
          { id: 5, produitId: 1, designation: 'Prix grossiste', prix: 2500, actif: true },
        ],
      },
    ],
  };

  const defaultClients = {
    success: true,
    data: [
      { id: 1, nom: 'Client Comptant', prenom: '', telephone: '', soldeCredit: 0 },
      { id: 2, nom: 'Diallo', prenom: 'Awa', telephone: '+223 70 00 00 01', soldeCredit: 0 },
      { id: 3, nom: 'Konaté', prenom: 'Oumar', telephone: '+223 70 00 00 02', soldeCredit: 0 },
      { id: 4, nom: 'Traoré', prenom: 'Mamadou', telephone: '+223 70 00 00 03', soldeCredit: 0 },
    ],
  };

  if (!localStorage.getItem('pani_cache_/produits')) {
    localStorage.setItem('pani_cache_/produits', JSON.stringify(defaultProduits));
  }
  if (!localStorage.getItem('pani_cache_/stock')) {
    localStorage.setItem('pani_cache_/stock', JSON.stringify(defaultProduits));
  }
  if (!localStorage.getItem('pani_cache_/clients')) {
    localStorage.setItem('pani_cache_/clients', JSON.stringify(defaultClients));
  }
}

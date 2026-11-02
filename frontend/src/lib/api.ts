import axios from 'axios';

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
    if (!parsed.port && parsed.hostname !== 'localhost' && !parsed.hostname.includes('.com') && !parsed.hostname.includes('.org')) {
      parsed.port = '5000';
      url = parsed.toString().replace(/\/+$/, '');
    }
  } catch (_e) {
    // Si URL() échoue, continuer avec un regex
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

// Déterminer l'URL de base du backend
// URLs de tunnels expirés à ignorer automatiquement
const EXPIRED_TUNNEL_PATTERNS = [
  'fortune-dose-historical-manufacturing',
  'effect-kits-reg-gnome',
  'injured-deaf-horses-magnetic',
];

export function getDefaultServerURL(): string {
  // 1. Si déjà personnalisé par l'utilisateur
  const saved = localStorage.getItem('pani_server_url');
  if (saved) {
    // Effacer automatiquement les anciens tunnels expirés
    const isExpired = EXPIRED_TUNNEL_PATTERNS.some(p => saved.includes(p));
    if (isExpired) {
      localStorage.removeItem('pani_server_url');
      console.warn('[API] Ancienne URL de tunnel expirée effacée :', saved);
      // Continue vers la détection automatique ci-dessous
    } else {
      const cleaned = cleanServerURL(saved);
      if (cleaned && cleaned !== saved) {
        localStorage.setItem('pani_server_url', cleaned);
      }
      return cleaned || 'http://192.168.1.100:5000/api';
    }
  }

  // 2. Détection environnement Android Capacitor (Native uniquement)
  const isNativeCapacitor = typeof window !== 'undefined' && (
    (window as any).Capacitor?.isNativePlatform?.() === true ||
    window.location.protocol === 'capacitor:'
  );

  // Sur APK Android natif : pointer vers l'IP du PC serveur
  if (isNativeCapacitor) {
    return 'http://192.168.1.100:5000/api';
  }

  // Sur navigateur web (PC local ou smartphone sur http://192.168.1.100:5173) :
  // Utiliser le proxy Vite /api par défaut
  return (import.meta as any).env?.VITE_API_URL || '/api';
}

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
  timeout: 4000,
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

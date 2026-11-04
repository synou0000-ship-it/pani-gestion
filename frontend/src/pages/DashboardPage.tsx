import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { isSQLiteAvailable, sqliteGetDashboardStats, sqliteGetPendingCount } from '../lib/sqlite';
import { formatFCFA } from '../lib/formatters';
import { StatCard, Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  TrendingUp,
  Receipt,
  Package,
  Landmark,
  Users,
  Truck,
  AlertTriangle,
  PlusCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';

// Fonction centrale : fusionne n'importe quelle base de données dashboard (serveur ou cache)
// avec la file d'attente locale (ventes, dépenses, achats non encore synchronisés)
const mergeWithOfflineQueue = (baseData: any, p: string): any => {
  const offlineVentes: any[] = (() => { try { return JSON.parse(localStorage.getItem('pani_offline_ventes') || '[]'); } catch { return []; } })();
  const offlineDepenses: any[] = (() => { try { return JSON.parse(localStorage.getItem('pani_offline_depenses') || '[]'); } catch { return []; } })();
  const offlineAchats: any[] = (() => { try { return JSON.parse(localStorage.getItem('pani_offline_achats') || '[]'); } catch { return []; } })();
  const cachedProduits: any[] = (() => { try { return JSON.parse(localStorage.getItem('pani_produits') || '[]'); } catch { return []; } })();

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  // Filtre par période
  const filtrer = (items: any[], champ: string) => items.filter(item => {
    const val: string = item[champ] || item.createdAt || item.date || '';
    if (!val) return true; // Si pas de date, considéré comme créé aujourd'hui
    if (p === 'jour') return val.startsWith(today);
    const d = new Date(val);
    if (isNaN(d.getTime())) return true;
    if (p === 'semaine') { const s = new Date(now); s.setDate(now.getDate() - 7); return d >= s; }
    if (p === 'mois') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (p === 'annee') return d.getFullYear() === now.getFullYear();
    return true;
  });

  const ventesF = filtrer(offlineVentes, 'dateVente');
  const depensesF = filtrer(offlineDepenses, 'dateDepense');
  const achatsF = filtrer(offlineAchats, 'dateAchat');

  const ventesTotalOffline = ventesF.reduce((s, v) => s + (Number(v.montantTotal) || 0), 0);
  const encaissTotalOffline = ventesF.reduce((s, v) => s + (Number(v.montantPaye) || 0), 0);
  const dettesClientsOffline = ventesF.reduce((s, v) => s + (Number(v.resteAPayer) || 0), 0);

  const depensesTotalOffline = depensesF.reduce((s, d) => s + (Number(d.montant) || 0), 0);
  const dettesFournisseursOffline = achatsF.reduce((s, a) => s + (Number(a.resteAPayer) || 0), 0);

  // Quantités vendues offline
  let qteVendueOffline = 0;
  ventesF.forEach(v => {
    if (v.details && Array.isArray(v.details)) {
      v.details.forEach((d: any) => { qteVendueOffline += (Number(d.quantite) || 0); });
    } else if (v.quantite) {
      qteVendueOffline += Number(v.quantite);
    }
  });

  // Quantités achetées offline
  let qteAcheteeOffline = 0;
  achatsF.forEach(a => {
    if (a.details && Array.isArray(a.details)) {
      a.details.forEach((d: any) => { qteAcheteeOffline += (Number(d.quantite) || 0); });
    }
  });

  const baseVentesTotal = Number(baseData?.ventes?.total) || 0;
  const baseVentesCount = Number(baseData?.ventes?.count) || 0;
  const baseEncaiss = Number(baseData?.encaissements?.total ?? baseData?.ventes?.montantPaye) || 0;
  const baseDepensesTotal = Number(baseData?.depenses?.total) || 0;
  const baseDepensesCount = Number(baseData?.depenses?.count) || 0;

  const totalVentes = baseVentesTotal + ventesTotalOffline;
  const totalDepenses = baseDepensesTotal + depensesTotalOffline;
  const totalEncaissements = baseEncaiss + encaissTotalOffline;
  const totalBenefice = totalVentes - totalDepenses;

  // Calcul du stock restant
  let stockActuel = 500;
  let stockNom = 'Pani';
  if (baseData?.stock && Array.isArray(baseData.stock) && baseData.stock.length > 0) {
    stockActuel = Number(baseData.stock[0].stockActuel) || 0;
    stockNom = baseData.stock[0].nom || 'Pani';
  } else if (cachedProduits.length > 0) {
    stockActuel = Number(cachedProduits[0].stock_actuel || cachedProduits[0].quantite_stock) || 500;
    stockNom = cachedProduits[0].nom || 'Pani';
  }
  const stockFinal = Math.max(0, stockActuel - qteVendueOffline + qteAcheteeOffline);

  // Top produits avec ventes locales incluses
  const prodMap: Record<string, { nom: string; totalVendu: number; chiffreAffaires: number }> = {};
  if (baseData?.topProduits && Array.isArray(baseData.topProduits)) {
    baseData.topProduits.forEach((tp: any) => {
      prodMap[tp.nom] = {
        nom: tp.nom,
        totalVendu: Number(tp.totalVendu) || 0,
        chiffreAffaires: Number(tp.chiffreAffaires) || 0,
      };
    });
  }
  ventesF.forEach(v => {
    const nom = v.produitNom || v.nomProduit || 'Pani';
    if (!prodMap[nom]) prodMap[nom] = { nom, totalVendu: 0, chiffreAffaires: 0 };
    prodMap[nom].totalVendu += (Number(v.quantite) || 1);
    prodMap[nom].chiffreAffaires += (Number(v.montantTotal) || 0);
  });
  const topProduits = Object.values(prodMap).sort((a, b) => b.chiffreAffaires - a.chiffreAffaires).slice(0, 5);

  // Solde théorique de caisse
  let caisseData = baseData?.caisse || null;
  if (caisseData) {
    caisseData = {
      ...caisseData,
      soldeTheorique: (Number(caisseData.soldeTheorique) || 0) + encaissTotalOffline - depensesTotalOffline,
    };
  }

  return {
    ...(baseData || {}),
    ventes: {
      count: baseVentesCount + ventesF.length,
      total: totalVentes,
    },
    encaissements: {
      total: totalEncaissements,
    },
    depenses: {
      count: baseDepensesCount + depensesF.length,
      total: totalDepenses,
    },
    beneficeEstime: totalBenefice,
    stock: [{ nom: stockNom, stockActuel: stockFinal }],
    dettesClients: {
      count: (Number(baseData?.dettesClients?.count) || 0) + (dettesClientsOffline > 0 ? 1 : 0),
      total: (Number(baseData?.dettesClients?.total) || 0) + dettesClientsOffline,
    },
    dettesFournisseurs: {
      count: (Number(baseData?.dettesFournisseurs?.count) || 0) + (dettesFournisseursOffline > 0 ? 1 : 0),
      total: (Number(baseData?.dettesFournisseurs?.total) || 0) + dettesFournisseursOffline,
    },
    ecartStock: baseData?.ecartStock || { totalEcart: 0 },
    caisse: caisseData,
    topProduits: topProduits.length > 0 ? topProduits : (baseData?.topProduits || []),
    isFromSQLite: baseData?.isFromSQLite || false,
  };
};

// Récupérer le snapshot serveur ou cache local sauvegardé
const getBaselineDashboard = (p: string): any => {
  try {
    const cached = localStorage.getItem('pani_offline_dashboard');
    if (cached) return JSON.parse(cached);

    const axiosCache =
      localStorage.getItem(`pani_cache_/dashboard?periode=${p}`) ||
      localStorage.getItem('pani_cache_/dashboard?periode=jour');
    if (axiosCache) {
      const parsed = JSON.parse(axiosCache);
      return parsed?.data || parsed;
    }
  } catch (_) {}

  return {
    ventes: { count: 0, total: 0 },
    encaissements: { total: 0 },
    depenses: { count: 0, total: 0 },
    beneficeEstime: 0,
    stock: [{ nom: 'Pani', stockActuel: 500 }],
    dettesClients: { count: 0, total: 0 },
    dettesFournisseurs: { count: 0, total: 0 },
    ecartStock: { totalEcart: 0 },
    caisse: null,
    topProduits: [],
  };
};

export const DashboardPage: React.FC = () => {
  const [periode, setPeriode] = useState<'jour' | 'semaine' | 'mois' | 'annee'>('jour');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  const fetchDashboard = async (p = periode) => {
    // ═══════════════════════════════════════════════════════════
    // STRATÉGIE : Serveur Cloud d'abord (PC + Mobile identiques)
    // SQLite = UNIQUEMENT si le serveur est inaccessible (hors-ligne réel)
    // ═══════════════════════════════════════════════════════════
    try {
      const res = await api.get(`/dashboard?periode=${p}`);
      if (res.data?.success) {
        const isFromCache =
          res.statusText === 'OK (Cache Local)' ||
          res.headers?.['x-from-cache'] === 'true' ||
          (res as any).isFromCache === true;

        if (isFromCache) {
          // Serveur inaccessible → fallback SQLite/cache
          setIsOffline(true);
          if (isSQLiteAvailable()) {
            try {
              const sqlStats = await sqliteGetDashboardStats(p);
              if (sqlStats) setData(sqlStats);
            } catch (_) {}
          } else {
            const merged = mergeWithOfflineQueue(res.data.data, p);
            setData(merged);
          }
          setLoading(false);
          return;
        }

        // ✅ Serveur Cloud en ligne → données identiques PC et mobile
        setIsOffline(false);
        try {
          localStorage.setItem('pani_offline_dashboard', JSON.stringify(res.data.data));
        } catch (_) {}

        // Fusionner les ventes locales non encore synchronisées
        const merged = mergeWithOfflineQueue(res.data.data, p);
        // Marquer explicitement isFromSQLite = false car données viennent du serveur
        setData({ ...merged, isFromSQLite: false });
        setLoading(false);
        return;
      }
    } catch (_err) {
      console.warn('[Dashboard] Serveur inaccessible — fallback local.');
      setIsOffline(true);
    }

    // Fallback : SQLite (mobile hors-ligne) ou cache localStorage (PC hors-ligne)
    if (isSQLiteAvailable()) {
      try {
        const sqlStats = await sqliteGetDashboardStats(p);
        if (sqlStats) setData(sqlStats);
      } catch (e) {
        console.error('[Dashboard] SQLite fallback error:', e);
      }
    } else {
      const baseline = getBaselineDashboard(p);
      const merged = mergeWithOfflineQueue(baseline, p);
      setData(merged);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboard(periode);
  }, [periode]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchDashboard(periode);
    };
    const handleOffline = () => setIsOffline(true);

    // Écouter les événements de modification locale de données (création de vente, dépense...)
    const handleDataChanged = () => {
      fetchDashboard(periode);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pani:data-changed', handleDataChanged);
    window.addEventListener('storage', handleDataChanged);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pani:data-changed', handleDataChanged);
      window.removeEventListener('storage', handleDataChanged);
    };
  }, [periode]);

  return (
    <div className="space-y-5 font-serif">

      {/* Bannière Mode Hors-ligne — uniquement si serveur inaccessible */}
      {isOffline && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2 text-amber-900 text-xs sm:text-sm font-serif font-medium">
            <WifiOff className="h-4 w-4 text-amber-700 shrink-0" />
            <span>
              Mode hors-ligne — {isSQLiteAvailable() ? 'Données locales SQLite' : 'Cache local'}
              {(() => {
                const pending = parseInt(localStorage.getItem('pani_pending_count') || '0');
                return pending > 0 ? ` • ${pending} élément(s) en attente de synchronisation` : '';
              })()}
            </span>
          </div>
          <button
            onClick={() => fetchDashboard(periode)}
            className="text-xs text-amber-900 hover:underline font-serif font-bold shrink-0"
          >
            Actualiser
          </button>
        </div>
      )}

      {/* Header & Filtres Vitrine - 100% Responsive et Anti-Débordement Mobile */}
      <div className="flex flex-col gap-3 pb-2.5 border-b border-slate-200">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-serif text-slate-900 tracking-tight truncate">
              Tableau de Bord
            </h1>
            <p className="text-xs font-serif text-slate-500 italic hidden sm:block">
              Synthèse d'activité commerciale, situation de caisse et état des stocks
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Sélecteur de période Desktop (masqué sur mobile) */}
            <div className="hidden sm:inline-flex rounded-md border border-slate-300 bg-white p-0.5 shadow-xs">
              {(['jour', 'semaine', 'mois', 'annee'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriode(p)}
                  className={`px-3 py-1 text-xs font-serif capitalize transition-colors rounded ${
                    periode === p
                      ? 'bg-emerald-700 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {p === 'jour' ? "Aujourd'hui" : p}
                </button>
              ))}
            </div>

            <Link to="/ventes/nouvelle" className="shrink-0">
              <Button
                variant="primary"
                size="sm"
                icon={<PlusCircle className="h-4 w-4" />}
                className="font-serif font-bold text-xs sm:text-sm shadow-xs whitespace-nowrap min-h-[40px] px-2.5 sm:px-3.5"
              >
                <span className="hidden xs:inline">Nouvelle </span>Vente
              </Button>
            </Link>
          </div>
        </div>

        {/* Sélecteur de période Mobile (4 colonnes égales, pleine largeur, aucun débordement) */}
        <div className="sm:hidden w-full">
          <div className="grid grid-cols-4 w-full rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
            {(['jour', 'semaine', 'mois', 'annee'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriode(p)}
                className={`py-2 text-[11px] font-serif capitalize transition-colors rounded-md text-center font-bold ${
                  periode === p
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {p === 'jour' ? "Aujourd'hui" : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bannière de session de caisse - Couleurs Distinctes & Adaptée Mobile */}
      {data?.caisse ? (
        <div className="bg-emerald-50/80 border border-emerald-300/80 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-emerald-600 text-white rounded-lg shadow-xs shrink-0">
              <Landmark className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold font-serif text-emerald-950 truncate">
                Session de Caisse : {data.caisse.reference}
              </div>
              <div className="text-[11px] font-serif text-emerald-800">
                Ouverte par <span className="font-semibold">{data.caisse.ouvertPar}</span> • Solde :{' '}
                <span className="font-bold text-emerald-950 not-italic text-xs">{formatFCFA(data.caisse.soldeTheorique)}</span>
              </div>
            </div>
          </div>
          <Link to="/caisse" className="w-full sm:w-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-serif font-bold text-xs py-2 min-h-[38px] justify-center"
            >
              Gérer la caisse
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-amber-50/80 border border-amber-300/80 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-amber-600 text-white rounded-lg shadow-xs shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold font-serif text-amber-950">
                Aucune session de caisse ouverte
              </div>
              <div className="text-[11px] font-serif text-amber-800">
                Ouvrez une session de caisse pour enregistrer les encaissements en espèces.
              </div>
            </div>
          </div>
          <Link to="/caisse" className="w-full sm:w-auto shrink-0">
            <Button
              variant="primary"
              size="sm"
              className="w-full sm:w-auto font-serif font-bold text-xs py-2 min-h-[38px] justify-center shadow-xs"
            >
              Ouvrir la caisse
            </Button>
          </Link>
        </div>
      )}

      {/* 8 Cartes KPI - Couleurs Harmonieuses pour une Lecture Immédiate */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-slate-200 bg-white p-3.5 sm:p-4 animate-pulse">
              <div className="flex items-center justify-between mb-2">
                <div className="h-3 w-16 bg-slate-200 rounded" />
                <div className="h-6 w-6 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-24 bg-slate-200 rounded mb-1.5" />
              <div className="h-2.5 w-16 bg-slate-100 rounded" />
            </div>
          ))
        ) : (
          <>
            {/* 1. Ventes - Émeraude */}
            <StatCard
              title={`Ventes (${periode})`}
              value={formatFCFA(data?.ventes?.total)}
              subtitle={`${data?.ventes?.count || 0} transaction(s)`}
              icon={<TrendingUp className="h-4 w-4" />}
              color="emerald"
            />

            {/* 2. Encaissements - Bleu Saphir */}
            <StatCard
              title="Encaissements"
              value={formatFCFA(data?.encaissements?.total)}
              subtitle="Espèces perçues"
              icon={<Landmark className="h-4 w-4" />}
              color="blue"
            />

            {/* 3. Dépenses - Rose Rubis */}
            <StatCard
              title={`Dépenses (${periode})`}
              value={formatFCFA(data?.depenses?.total)}
              subtitle={`${data?.depenses?.count || 0} charge(s)`}
              icon={<Receipt className="h-4 w-4" />}
              color="rose"
            />

            {/* 4. Bénéfice estimé - Émeraude ou Rose */}
            <StatCard
              title="Bénéfice estimé"
              value={formatFCFA(data?.beneficeEstime)}
              subtitle="Marge nette calculée"
              icon={<TrendingUp className="h-4 w-4" />}
              color={Number(data?.beneficeEstime || 0) >= 0 ? 'emerald' : 'rose'}
            />

            {/* 5. Stock disponible - Violet / Indigo */}
            <StatCard
              title="Stock disponible"
              value={`${data?.stock?.[0]?.stockActuel ?? 0} u`}
              subtitle={data?.stock?.[0]?.nom || "Articles en rayon"}
              icon={<Package className="h-4 w-4" />}
              color="purple"
            />

            {/* 6. Dettes clients - Ambre / Or */}
            <StatCard
              title="Créances clients"
              value={formatFCFA(data?.dettesClients?.total)}
              subtitle={`${data?.dettesClients?.count || 0} créance(s)`}
              icon={<Users className="h-4 w-4" />}
              color="amber"
            />

            {/* 7. Dettes fournisseurs - Ardoise */}
            <StatCard
              title="Dettes fournisseurs"
              value={formatFCFA(data?.dettesFournisseurs?.total)}
              subtitle="Engagements à régler"
              icon={<Truck className="h-4 w-4" />}
              color="slate"
            />

            {/* 8. Écart inventaire - Rose ou Ardoise */}
            <StatCard
              title="Écart inventaire"
              value={`${data?.ecartStock?.totalEcart ?? 0} u`}
              subtitle="Différence physique"
              icon={<ShieldAlert className="h-4 w-4" />}
              color={Number(data?.ecartStock?.totalEcart || 0) === 0 ? 'slate' : 'rose'}
            />
          </>
        )}
      </div>

      {/* Performance des Ventes & Accès Rapide - Vitrine Épurée avec Badges de Couleur */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Performance des Ventes */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold font-serif text-slate-900 tracking-wide">
              Performance des Ventes
            </h3>
            <Link to="/ventes" className="text-xs font-serif text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1">
              Consulter <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {data?.topProduits && data.topProduits.length > 0 ? (
            <div className="space-y-2">
              {data.topProduits.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded border border-slate-200 bg-slate-50/70 hover:bg-slate-100/70 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <span className="h-6 w-6 rounded bg-emerald-700 text-white font-serif font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-xs sm:text-sm font-serif font-bold text-slate-900">{item.nom}</div>
                      <div className="text-[11px] font-serif text-slate-500 italic">{item.totalVendu} unité(s) vendue(s)</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs sm:text-sm font-bold font-serif text-emerald-800">{formatFCFA(item.chiffreAffaires)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs italic font-serif">
              Aucune vente enregistrée pour cette période
            </div>
          )}
        </Card>

        {/* Accès Rapide avec Accents de Couleur Rehaussés */}
        <Card>
          <h3 className="text-sm font-bold font-serif text-slate-900 mb-3 pb-2 border-b border-slate-100">
            Accès Rapide
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
            <Link
              to="/ventes/nouvelle"
              className="flex flex-col sm:flex-row items-center gap-2.5 p-2.5 rounded border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/70 active:scale-[0.98] transition-all text-center sm:text-left shadow-xs"
            >
              <div className="p-2 rounded bg-emerald-600 text-white shadow-xs">
                <PlusCircle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-bold font-serif text-emerald-950 leading-tight">Nouveau Ticket</div>
                <div className="text-[10px] text-emerald-700 font-serif hidden sm:block">Enregistrer une vente</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-emerald-600 hidden sm:block" />
            </Link>

            <Link
              to="/depenses"
              className="flex flex-col sm:flex-row items-center gap-2.5 p-2.5 rounded border border-rose-200 bg-rose-50/60 hover:bg-rose-100/70 active:scale-[0.98] transition-all text-center sm:text-left shadow-xs"
            >
              <div className="p-2 rounded bg-rose-600 text-white shadow-xs">
                <Receipt className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-bold font-serif text-rose-950 leading-tight">Dépenses</div>
                <div className="text-[10px] text-rose-700 font-serif hidden sm:block">Enregistrer une charge</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-rose-600 hidden sm:block" />
            </Link>

            <Link
              to="/caisse"
              className="flex flex-col sm:flex-row items-center gap-2.5 p-2.5 rounded border border-sky-200 bg-sky-50/60 hover:bg-sky-100/70 active:scale-[0.98] transition-all text-center sm:text-left shadow-xs"
            >
              <div className="p-2 rounded bg-sky-600 text-white shadow-xs">
                <Landmark className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-bold font-serif text-sky-950 leading-tight">Caisse</div>
                <div className="text-[10px] text-sky-700 font-serif hidden sm:block">Clôture et solde</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-sky-600 hidden sm:block" />
            </Link>

            <Link
              to="/inventaire"
              className="flex flex-col sm:flex-row items-center gap-2.5 p-2.5 rounded border border-amber-200 bg-amber-50/60 hover:bg-amber-100/70 active:scale-[0.98] transition-all text-center sm:text-left shadow-xs"
            >
              <div className="p-2 rounded bg-amber-600 text-white shadow-xs">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-bold font-serif text-amber-950 leading-tight">Inventaire</div>
                <div className="text-[10px] text-amber-700 font-serif hidden sm:block">Comptage & manques</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-amber-600 hidden sm:block" />
            </Link>

            <Link
              to="/rapports"
              className="col-span-2 sm:col-span-1 flex flex-col sm:flex-row items-center gap-2.5 p-2.5 rounded border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 active:scale-[0.98] transition-all text-center sm:text-left shadow-xs"
            >
              <div className="p-2 rounded bg-purple-600 text-white shadow-xs">
                <Clock className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-bold font-serif text-purple-950 leading-tight">Rapports</div>
                <div className="text-[10px] text-purple-700 font-serif hidden sm:block">Statistiques & PDF</div>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-purple-600 hidden sm:block" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api, saveOfflineVente } from '../lib/api';
import {
  isSQLiteAvailable,
  sqliteGetProduits,
  sqliteGetClients,
  sqliteCreateLocalVente,
  sqliteUpsertVente,
} from '../lib/sqlite';
import { pushLocalChanges } from '../lib/sync';
import { formatFCFA } from '../lib/formatters';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  CheckCircle,
  AlertTriangle,
  User,
  CreditCard,
  Banknote,
} from 'lucide-react';

interface CartItem {
  produitId: number;
  produitNom: string;
  tarifId: number;
  designation: string;
  prixUnitaire: number;
  quantite: number;
}

export const NouvelleVentePage: React.FC = () => {
  const [produits, setProduits] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [montantPaye, setMontantPaye] = useState<string>('');
  const [modePaiement, setModePaiement] = useState<string>('especes');
  const [notes, setNotes] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [customQte, setCustomQte] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [venteReussie, setVenteReussie] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Charger les produits et clients (SQLite ou API)
  useEffect(() => {
    const fetchData = async () => {
      // 1. Tenter d'abord de charger depuis SQLite si disponible
      if (isSQLiteAvailable()) {
        try {
          const [sqlProds, sqlClients] = await Promise.all([
            sqliteGetProduits(),
            sqliteGetClients(),
          ]);
          if (sqlProds && sqlProds.length > 0) setProduits(sqlProds);
          if (sqlClients && sqlClients.length > 0) setClients(sqlClients);
        } catch (e) {
          console.warn('[Vente] Erreur lecture locale SQLite:', e);
        }
      }

      // 2. Si en ligne, rafraîchir depuis PostgreSQL via l'API
      try {
        const [prodRes, cliRes] = await Promise.all([
          api.get('/produits'),
          api.get('/clients?limit=100'),
        ]);
        if (prodRes.data?.data && prodRes.data.data.length > 0) setProduits(prodRes.data.data);
        if (cliRes.data?.data && cliRes.data.data.length > 0) setClients(cliRes.data.data);
      } catch (err) {
        console.warn('Erreur chargement données serveur (mode hors-ligne actif):', err);
      }

      // 3. Fallback de secours sur le cache local
      try {
        const cachedProd = localStorage.getItem('pani_cache_/produits');
        if (cachedProd) {
          const parsed = JSON.parse(cachedProd);
          if (parsed.data && parsed.data.length > 0) {
            setProduits((prev) => (prev.length === 0 ? parsed.data : prev));
          }
        }
        const cachedCli = localStorage.getItem('pani_cache_/clients');
        if (cachedCli) {
          const parsed = JSON.parse(cachedCli);
          if (parsed.data && parsed.data.length > 0) {
            setClients((prev) => (prev.length === 0 ? parsed.data : prev));
          }
        }
      } catch (_) {}
    };
    fetchData();
  }, []);

  const totalMontant = cart.reduce((acc, item) => acc + item.prixUnitaire * item.quantite, 0);
  const totalUnites = cart.reduce((acc, item) => acc + item.quantite, 0);

  // Par défaut si montantPaye est vide, c'est égal au total
  const payeNum = montantPaye === '' ? totalMontant : Number(montantPaye) || 0;
  const resteAPayer = Math.max(0, totalMontant - payeNum);

  // Ajouter un tarif rapide au panier
  const addTarifToCart = (tarif: any, prod: any) => {
    setErrorMsg(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.tarifId === tarif.id);
      if (existing) {
        return prev.map((item) =>
          item.tarifId === tarif.id
            ? { ...item, quantite: item.quantite + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          produitId: prod.id,
          produitNom: prod.nom,
          tarifId: tarif.id,
          designation: tarif.designation,
          prixUnitaire: Number(tarif.prix),
          quantite: 1,
        },
      ];
    });
  };

  // Ajouter un prix libre / spécifique
  const addCustomPriceToCart = () => {
    const prix = Number(customPrice);
    if (!prix || prix <= 0) return;
    const defaultProd = produits[0] || { id: 1, nom: 'Pani' };

    setCart((prev) => [
      ...prev,
      {
        produitId: defaultProd.id,
        produitNom: defaultProd.nom,
        tarifId: 0, // tarif spécifique
        designation: `Prix Spécifique (${prix} F)`,
        prixUnitaire: prix,
        quantite: customQte || 1,
      },
    ]);
    setCustomPrice('');
    setCustomQte(1);
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item, i) => {
          if (i === index) {
            const newQte = item.quantite + delta;
            return newQte > 0 ? { ...item, quantite: newQte } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Soumettre la vente — LOCAL-FIRST : Enregistrement local en premier, puis synchro en tâche de fond
  const handleValiderVente = async () => {
    if (cart.length === 0) {
      setErrorMsg('Veuillez ajouter au moins un produit au panier.');
      return;
    }

    if (resteAPayer > 0 && !selectedClientId) {
      setErrorMsg('Une vente à crédit nécessite obligatoirement de sélectionner un Client.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const clientIdNum = selectedClientId ? parseInt(selectedClientId) : null;
    const offlineRef = `VTE-${isSQLiteAvailable() ? 'MOB' : 'LOC'}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const details = cart.map((item) => ({
      produitId: item.produitId,
      tarifId: item.tarifId || 1,
      designation: item.designation,
      quantite: item.quantite,
      prixUnitaire: item.prixUnitaire,
      montant: item.quantite * item.prixUnitaire,
    }));

    // 1. ENREGISTREMENT SYSTÉMATIQUE EN PREMIER DANS LA BASE LOCALE (SQLite ou LocalStorage)
    let isSavedLocally = false;

    if (isSQLiteAvailable()) {
      try {
        await sqliteCreateLocalVente({
          reference: offlineRef,
          clientId: clientIdNum,
          montantTotal: totalMontant,
          montantPaye: payeNum,
          resteAPayer,
          modePaiement,
          notes,
          details,
        });
        isSavedLocally = true;
        console.log('[Vente] ✅ Vente enregistrée avec succès en PREMIÈRE dans SQLite local');
      } catch (sqlErr) {
        console.error('[Vente] Erreur enregistrement SQLite:', sqlErr);
      }
    }

    if (!isSavedLocally) {
      // Cas PC Web ou fallback : stockage local dans le navigateur
      saveOfflineVente({
        reference: offlineRef,
        clientId: clientIdNum,
        dateVente: new Date().toISOString(),
        montantTotal: totalMontant,
        montantPaye: payeNum,
        resteAPayer,
        modePaiement,
        notes,
        details: details.map((d) => ({
          produitId: d.produitId,
          tarifId: d.tarifId,
          quantite: d.quantite,
          prixUnitaire: d.prixUnitaire,
        })),
      });

      // Mettre à jour le stock dans le cache local
      try {
        const cached = localStorage.getItem('pani_cache_/produits') || localStorage.getItem('pani_cache_/stock');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.data && Array.isArray(parsed.data)) {
            for (const d of details) {
              const p = parsed.data.find((prod: any) => prod.id === d.produitId);
              if (p && p.stockActuel !== undefined) {
                p.stockActuel = Math.max(0, p.stockActuel - d.quantite);
              }
            }
            localStorage.setItem('pani_cache_/produits', JSON.stringify(parsed));
            localStorage.setItem('pani_cache_/stock', JSON.stringify(parsed));
          }
        }
      } catch (_) {}
      console.log('[Vente] ✅ Vente enregistrée avec succès en PREMIÈRE dans le stockage local Web');
    }

    // 2. AFFICHER LE TICKET DE SUCCÈS IMMÉDIATEMENT (L'utilisateur n'attend jamais)
    const clientSelectionne = clients.find((c) => c.id === clientIdNum);
    const venteValidee = {
      reference: offlineRef,
      dateVente: new Date().toISOString(),
      montantTotal: totalMontant,
      montantPaye: payeNum,
      resteAPayer,
      modePaiement,
      notes,
      client: clientSelectionne || (clientIdNum ? { id: clientIdNum, nom: 'Client' } : null),
      details: cart.map((c) => ({
        ...c,
        montant: c.quantite * c.prixUnitaire,
      })),
      isOffline: true,
    };

    setVenteReussie(venteValidee);
    setCart([]);
    setMontantPaye('');
    setSelectedClientId('');
    setNotes('');
    setLoading(false);

    // Notifier immédiatement le dashboard et l'application
    window.dispatchEvent(new Event('pani:data-changed'));

    // 3. SYNCHRONISATION EN ARRIÈRE-PLAN (Background Sync non-bloquant)
    setTimeout(async () => {
      try {
        await pushLocalChanges();
      } catch (syncErr) {
        console.warn('[Vente] Synchronisation reportée (serveur/tunnel hors-ligne):', syncErr);
      }
    }, 150);
  };

  const handlePrint = () => {
    window.print();
  };

  const produitPrincipal = produits[0] || { nom: 'Pani', tarifs: [] };

  return (
    <div className="space-y-4 sm:space-y-5 pb-32 lg:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Guichet Vente Rapide</h1>
          <p className="text-xs text-slate-500">Sélectionnez les tarifs ou saisissez un montant</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="brand" dot>Vente Directe</Badge>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Colonne Gauche: Boutons Tarifs Rapides (500F, 1000F, 1500F, 2000F...) */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-3.5 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900">
                Tarifs Pani — Clic Rapide
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">1 clic = +1 unité</span>
            </div>

            {/* Boutons Rapides du Cahier des Charges - Couleurs Distinctes & Lisibles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              {/* Bouton 500 F - Émeraude */}
              <button
                onClick={() => addTarifToCart({ id: 1, designation: 'Petit prix', prix: 500 }, produitPrincipal)}
                className="p-3 rounded-lg border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100/90 active:scale-95 transition-all text-left shadow-xs group"
              >
                <div className="text-[10px] font-serif uppercase tracking-widest text-emerald-700 font-bold">Petit prix</div>
                <div className="text-xl font-bold font-serif text-emerald-950 mt-0.5">500 F</div>
                <div className="text-[10px] text-emerald-600 mt-0.5 flex items-center gap-1 font-serif font-semibold">
                  <Plus className="h-2.5 w-2.5" /> 1 unité
                </div>
              </button>

              {/* Bouton 1 000 F - Bleu Saphir */}
              <button
                onClick={() => addTarifToCart({ id: 2, designation: 'Intermédiaire 1', prix: 1000 }, produitPrincipal)}
                className="p-3 rounded-lg border border-sky-300 bg-sky-50/70 hover:bg-sky-100/90 active:scale-95 transition-all text-left shadow-xs group"
              >
                <div className="text-[10px] font-serif uppercase tracking-widest text-sky-700 font-bold">Interm. 1</div>
                <div className="text-xl font-bold font-serif text-sky-950 mt-0.5">1 000 F</div>
                <div className="text-[10px] text-sky-600 mt-0.5 flex items-center gap-1 font-serif font-semibold">
                  <Plus className="h-2.5 w-2.5" /> 1 unité
                </div>
              </button>

              {/* Bouton 1 500 F - Indigo */}
              <button
                onClick={() => addTarifToCart({ id: 3, designation: 'Intermédiaire 2', prix: 1500 }, produitPrincipal)}
                className="p-3 rounded-lg border border-indigo-300 bg-indigo-50/70 hover:bg-indigo-100/90 active:scale-95 transition-all text-left shadow-xs group"
              >
                <div className="text-[10px] font-serif uppercase tracking-widest text-indigo-700 font-bold">Interm. 2</div>
                <div className="text-xl font-bold font-serif text-indigo-950 mt-0.5">1 500 F</div>
                <div className="text-[10px] text-indigo-600 mt-0.5 flex items-center gap-1 font-serif font-semibold">
                  <Plus className="h-2.5 w-2.5" /> 1 unité
                </div>
              </button>

              {/* Bouton 2 000 F - Pourpre */}
              <button
                onClick={() => addTarifToCart({ id: 4, designation: 'Prix supérieur', prix: 2000 }, produitPrincipal)}
                className="p-3 rounded-lg border border-purple-300 bg-purple-50/70 hover:bg-purple-100/90 active:scale-95 transition-all text-left shadow-xs group"
              >
                <div className="text-[10px] font-serif uppercase tracking-widest text-purple-700 font-bold">Supérieur</div>
                <div className="text-xl font-bold font-serif text-purple-950 mt-0.5">2 000 F</div>
                <div className="text-[10px] text-purple-600 mt-0.5 flex items-center gap-1 font-serif font-semibold">
                  <Plus className="h-2.5 w-2.5" /> 1 unité
                </div>
              </button>

              {/* Autres tarifs dynamiques récupérés de la base */}
              {produitPrincipal.tarifs?.filter((t: any) => ![500, 1000, 1500, 2000].includes(Number(t.prix))).map((tarif: any) => (
                <button
                  key={tarif.id}
                  onClick={() => addTarifToCart(tarif, produitPrincipal)}
                  className="p-3 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 active:scale-95 transition-all text-left group shadow-xs overflow-hidden"
                >
                  <div className="text-[10px] font-serif uppercase tracking-widest text-slate-700 font-bold truncate" title={tarif.designation}>
                    {tarif.designation}
                  </div>
                  <div className="text-xl font-bold font-serif text-slate-900 mt-0.5 truncate">
                    {formatFCFA(tarif.prix)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1 font-serif font-semibold">
                    <Plus className="h-2.5 w-2.5" /> 1 unité
                  </div>
                </button>
              ))}
            </div>

            {/* Saisie Prix Libre / Spécifique (> 2000 F ou autre) - 100% Responsive et Anti-Débordement */}
            <div className="mt-5 pt-4 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Prix Libre ou Spécifique
                </h4>
                <span className="text-[10px] text-slate-500 italic">Saisie manuelle</span>
              </div>

              <div className="flex flex-col gap-2.5">
                {/* Champ Prix unitaire */}
                <div className="relative w-full">
                  <input
                    type="number"
                    placeholder="Montant en F CFA (ex: 2500)"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-serif border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white shadow-2xs"
                  />
                </div>

                {/* Sélecteur de Quantité + Bouton Ajouter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center border border-slate-300 rounded-lg bg-slate-50 overflow-hidden shadow-2xs shrink-0">
                    <button
                      type="button"
                      onClick={() => setCustomQte(Math.max(1, customQte - 1))}
                      className="px-2.5 py-2 text-slate-600 hover:bg-slate-200 active:bg-slate-300 font-bold text-sm"
                      aria-label="Diminuer la quantité"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={customQte}
                      onChange={(e) => setCustomQte(parseInt(e.target.value) || 1)}
                      className="w-12 text-center text-sm font-bold bg-white border-x border-slate-200 py-2 focus:outline-none font-serif"
                      title="Quantité"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomQte(customQte + 1)}
                      className="px-2.5 py-2 text-slate-600 hover:bg-slate-200 active:bg-slate-300 font-bold text-sm"
                      aria-label="Augmenter la quantité"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={addCustomPriceToCart}
                    className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-serif font-bold text-sm shadow-sm transition-all"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span>Ajouter</span>
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Client & Conditions */}
          <Card>
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-brand-600" />
              Client & Mode de Vente
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Client (Optionnel pour vente comptant, obligatoire pour crédit)
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  <option value="">Vente au Comptant (Sans client enregistré)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} {c.prenom || ''} {c.telephone ? `(${c.telephone})` : ''} - {c.typeClient}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notes / Commentaire</label>
                <input
                  type="text"
                  placeholder="Remarque éventuelle sur la vente..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Colonne Droite: Ticket de caisse en cours & Règlement */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="border border-neutral-300 shadow-xs">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-neutral-800" />
                <h3 className="font-bold font-serif text-neutral-900 tracking-wide">Panier de Vente</h3>
              </div>
              <Badge variant="neutral">{totalUnites} unité(s)</Badge>
            </div>

            {/* Liste des articles du panier */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                Le panier est vide.<br />Cliquez sur les tarifs pour ajouter des articles.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto mb-4">
                {cart.map((item, index) => (
                  <div key={index} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">
                        {item.designation}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatFCFA(item.prixUnitaire)} × {item.quantite}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateQuantity(index, -1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-7 text-center font-bold text-xs text-slate-800">
                        {item.quantite}
                      </span>
                      <button
                        onClick={() => updateQuantity(index, 1)}
                        className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="text-right w-20">
                      <div className="text-sm font-bold text-slate-900">
                        {formatFCFA(item.prixUnitaire * item.quantite)}
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(index)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Récapitulatif Financier */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 border border-slate-100">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Total Vente :</span>
                <span className="text-lg font-bold text-slate-900">{formatFCFA(totalMontant)}</span>
              </div>

              {/* Saisie Montant Encaissé */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Montant Reçu / Encaissé (F CFA) :
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={montantPaye}
                    onChange={(e) => setMontantPaye(e.target.value)}
                    placeholder={totalMontant.toString()}
                    className="w-full px-3 py-2 text-base font-bold text-brand-700 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMontantPaye(totalMontant.toString())}
                    className="shrink-0 text-xs"
                  >
                    Exact
                  </Button>
                </div>
              </div>

              {/* Reste à payer / Dette client */}
              {resteAPayer > 0 && (
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-amber-100 text-amber-900 font-bold text-sm">
                  <span>Dette Client (Reste) :</span>
                  <span>{formatFCFA(resteAPayer)}</span>
                </div>
              )}

              {/* Mode de paiement */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Mode de règlement :
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setModePaiement('especes')}
                    className={`py-2 px-3 text-xs font-serif font-medium rounded border flex items-center justify-center gap-2 transition-colors ${
                      modePaiement === 'especes'
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <Banknote className="h-4 w-4" /> Espèces
                  </button>
                  <button
                    type="button"
                    onClick={() => setModePaiement('orange_money')}
                    className={`py-2 px-3 text-xs font-serif font-medium rounded border flex items-center justify-center gap-2 transition-colors ${
                      modePaiement === 'orange_money'
                        ? 'bg-neutral-900 text-white border-neutral-900'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" /> Mobile Money
                  </button>
                </div>
              </div>
            </div>

            {/* Bouton de validation */}
            <div className="mt-5 space-y-2">
              <Button
                variant="primary"
                size="lg"
                onClick={handleValiderVente}
                isLoading={loading}
                disabled={cart.length === 0}
                className="w-full text-base py-3.5 shadow-md"
              >
                Valider & Encaisser {formatFCFA(payeNum)}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Sticky Bottom Bar de validation - Mobile uniquement (< lg) lorsque le panier contient des articles */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-[68px] left-0 right-0 z-20 bg-white/98 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 py-2.5">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div>
              <div className="text-[10px] font-serif uppercase tracking-widest text-slate-500 font-bold">
                Total ({totalUnites} art.)
              </div>
              <div className="text-lg font-bold font-serif text-slate-900 leading-tight">
                {formatFCFA(totalMontant)}
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleValiderVente}
              isLoading={loading}
              className="text-xs font-serif font-bold py-2.5 px-4 shrink-0 shadow-sm"
            >
              Encaisser {formatFCFA(payeNum)}
            </Button>
          </div>
        </div>
      )}

      {/* MODAL DU REÇU / TICKET IMPRIMABLE APRÈS VENTE */}
      <Modal
        isOpen={Boolean(venteReussie)}
        onClose={() => setVenteReussie(null)}
        title="Vente Enregistrée avec Succès"
        maxWidth="md"
      >
        {venteReussie && (
          <div className="space-y-3">
            {/* Success header */}
            <div
              className={`p-3.5 rounded-xl text-center ${
                venteReussie.isOffline
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-emerald-50 border border-emerald-200'
              }`}
            >
              <CheckCircle
                className={`h-8 w-8 mx-auto mb-1.5 ${
                  venteReussie.isOffline ? 'text-amber-500' : 'text-emerald-600'
                }`}
              />
              <h4
                className={`font-black text-sm sm:text-base ${
                  venteReussie.isOffline ? 'text-amber-950' : 'text-emerald-950'
                }`}
              >
                {venteReussie.isOffline ? '📴 Enregistré Hors-ligne' : '✅ Vente Validée !'}
              </h4>
              <p className="text-xs font-mono mt-0.5 text-slate-500">
                Réf: {venteReussie.reference}
              </p>
              {venteReussie.isOffline && (
                <p className="text-[11px] text-amber-700 mt-1 font-semibold">
                  Sera synchronisé automatiquement dès la reconnexion au serveur
                </p>
              )}
            </div>

            {/* Ticket de caisse imprimable */}
            <div
              id="printable-receipt"
              className="border border-slate-200 rounded-xl p-3.5 bg-white font-mono text-xs"
            >
              <div className="text-center mb-2.5">
                <div className="font-black text-sm tracking-wider text-slate-900">PANI GESTION</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest">Reçu de Vente</div>
                <div className="border-t border-dashed border-slate-200 mt-1.5 pt-1.5 text-[10px] text-slate-500 space-y-0.5">
                  <div>{new Date(venteReussie.dateVente || Date.now()).toLocaleString('fr-FR')}</div>
                  <div className="font-bold">#{venteReussie.reference}</div>
                </div>
              </div>

              <div className="space-y-1 mb-2.5 border-t border-dashed border-slate-200 pt-2">
                {venteReussie.details?.map((d: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-700 truncate max-w-[180px]">
                      {d.quantite} × {d.designation || d.tarif?.designation || 'Pani'}
                    </span>
                    <span className="font-bold shrink-0">
                      {formatFCFA(d.montant || d.prixUnitaire * d.quantite)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-slate-200 pt-2 space-y-1">
                <div className="flex justify-between text-xs sm:text-sm font-black text-slate-900">
                  <span>TOTAL :</span>
                  <span>{formatFCFA(venteReussie.montantTotal)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-700 font-bold">
                  <span>PAYÉ :</span>
                  <span>{formatFCFA(venteReussie.montantPaye)}</span>
                </div>
                {Number(venteReussie.resteAPayer) > 0 && (
                  <div className="flex justify-between text-[11px] text-rose-600 font-bold">
                    <span>RESTE DÛ :</span>
                    <span>{formatFCFA(venteReussie.resteAPayer)}</span>
                  </div>
                )}
              </div>

              <div className="text-center text-[10px] text-slate-400 mt-2.5 border-t border-dashed border-slate-200 pt-1.5">
                ★ Merci de votre confiance ! ★
              </div>
            </div>

            {/* Boutons d'action - Confortables et faciles à cliquer */}
            <div className="flex flex-col-reverse sm:grid sm:grid-cols-2 gap-3 pt-3">
              <Button
                variant="outline"
                size="md"
                onClick={handlePrint}
                icon={<Printer className="h-4 w-4" />}
                className="w-full font-serif font-bold text-sm"
              >
                Imprimer
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => setVenteReussie(null)}
                className="w-full font-serif font-bold text-sm shadow-sm"
              >
                ✅ Nouvelle Vente
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};


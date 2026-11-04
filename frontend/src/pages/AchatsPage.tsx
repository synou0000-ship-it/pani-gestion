import React, { useState, useEffect } from 'react';
import { api, saveOfflineAchat, getOfflineAchats } from '../lib/api';
import { isSQLiteAvailable, sqliteCreateLocalAchat, sqliteGetAchats } from '../lib/sqlite';
import { pushLocalChanges } from '../lib/sync';
import { formatFCFA, formatDateTime } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import {
  ShoppingBag,
  PlusCircle,
  Truck,
  PackageCheck,
  Search,
  Trash2,
  XCircle,
  Filter,
} from 'lucide-react';

export const AchatsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [achats, setAchats] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 15;
  const [loading, setLoading] = useState(true);

  // Fournisseurs et produits
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [produits, setProduits] = useState<any[]>([]);

  // Filtres
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [fournisseurFilter, setFournisseurFilter] = useState('');

  // Modal Nouvel Achat
  const [modalOpen, setModalOpen] = useState(false);
  const [fournisseurId, setFournisseurId] = useState('');
  const [statutAchat, setStatutAchat] = useState('receptionne'); // 'receptionne' ou 'commande'
  const [quantite, setQuantite] = useState('100');
  const [prixUnitaire, setPrixUnitaire] = useState('1200');
  const [montantPaye, setMontantPaye] = useState('');
  const [modePaiement, setModePaiement] = useState('especes');
  const [submitting, setSubmitting] = useState(false);
  const [achatError, setAchatError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);

    if (isSQLiteAvailable()) {
      try {
        const sqlAchats = await sqliteGetAchats(30);
        if (sqlAchats && sqlAchats.length > 0) {
          setAchats(sqlAchats);
          setTotal(sqlAchats.length);
        }
      } catch (sqlErr) {
        console.warn('SQLite fetch achats:', sqlErr);
      }
    } else {
      const offlineAchats = getOfflineAchats();
      if (offlineAchats && offlineAchats.length > 0) {
        setAchats(offlineAchats);
        setTotal(offlineAchats.length);
      }
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search.trim()) params.append('search', search.trim());
      if (statutFilter) params.append('statut', statutFilter);
      if (fournisseurFilter) params.append('fournisseurId', fournisseurFilter);

      const [achRes, fourRes, prodRes] = await Promise.all([
        api.get(`/achats?${params.toString()}`),
        api.get('/fournisseurs?limit=100'),
        api.get('/produits'),
      ]);

      if (achRes.data?.data) {
        setAchats(achRes.data.data);
        setTotal(achRes.data.pagination?.total || achRes.data.data.length);
      }
      if (fourRes.data?.data) {
        setFournisseurs(fourRes.data.data);
        if (fourRes.data.data[0] && !fournisseurId) setFournisseurId(fourRes.data.data[0].id.toString());
      }
      if (prodRes.data?.data) setProduits(prodRes.data.data);
    } catch (err) {
      console.warn('Erreur chargement achats serveur:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, statutFilter, fournisseurFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const totalCalcule = (Number(quantite) || 0) * (Number(prixUnitaire) || 0);

  const handleCreateAchat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fournisseurId || !quantite || !prixUnitaire) return;

    setSubmitting(true);
    setAchatError(null);

    const defaultProd = produits[0] || { id: 1 };
    const payloadAchat = {
      fournisseurId: parseInt(fournisseurId),
      montantTotal: totalCalcule,
      montantPaye: montantPaye ? Number(montantPaye) : totalCalcule,
      resteAPayer: totalCalcule - (montantPaye ? Number(montantPaye) : totalCalcule),
      statut: statutAchat,
      details: [
        {
          produitId: defaultProd.id,
          quantite: Number(quantite),
          prixUnitaire: Number(prixUnitaire),
          montant: totalCalcule,
          montantTotal: totalCalcule,
        },
      ],
      modePaiement,
    };

    try {
      const res = await api.post('/achats', payloadAchat);
      if (res.data?.success) {
        setModalOpen(false);
        setQuantite('100');
        setMontantPaye('');
        await fetchData();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      const isOfflineErr = !err.response || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';
      if (isOfflineErr) {
        if (isSQLiteAvailable()) {
          try {
            await sqliteCreateLocalAchat(payloadAchat);
          } catch (_) {}
        } else {
          saveOfflineAchat(payloadAchat);
        }
        setModalOpen(false);
        setQuantite('100');
        setMontantPaye('');
        await fetchData();
        window.dispatchEvent(new Event('pani:data-changed'));
        pushLocalChanges().catch(() => {});
      } else {
        setAchatError(err.response?.data?.message || 'Erreur lors de la création de la commande');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceptionner = async (achatId: number) => {
    if (!window.confirm('Confirmez-vous la réception complète de cette commande ? Le stock sera augmenté automatiquement.')) {
      return;
    }

    try {
      const res = await api.put(`/achats/${achatId}/receptionner`);
      if (res.data?.success) {
        await fetchData();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la réception');
    }
  };

  const handleAnnulerAchat = async (achat: any) => {
    if (!window.confirm(`Confirmez-vous l'annulation de la commande ${achat.reference} ?`)) {
      return;
    }

    try {
      const res = await api.put(`/achats/${achat.id}/annuler`);
      if (res.data?.success) {
        await fetchData();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de l\'annulation');
    }
  };

  const handleDeleteAchat = async (achat: any) => {
    if (!window.confirm(`Confirmez-vous la suppression définitive de l'achat ${achat.reference} ?`)) {
      return;
    }

    try {
      const res = await api.delete(`/achats/${achat.id}`);
      if (res.data?.success) {
        await fetchData();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">Achats & Approvisionnements</h1>
          <p className="text-xs text-slate-500 hidden sm:block">Commandes fournisseurs, réceptions de marchandises et décaissements</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setModalOpen(true)}
          icon={<PlusCircle className="h-4 w-4" />}
          className="shrink-0 font-serif font-bold text-xs sm:text-sm whitespace-nowrap min-h-[40px] px-3.5"
        >
          <span className="hidden sm:inline">Nouvel Achat / Commande</span>
          <span className="sm:hidden">Achat</span>
        </Button>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par référence, fournisseur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 font-serif"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statutFilter}
              onChange={(e) => {
                setStatutFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white font-serif"
            >
              <option value="">Tous les statuts</option>
              <option value="receptionne">Réceptionné</option>
              <option value="commande">En Commande</option>
              <option value="paye">Payé</option>
              <option value="annule">Annulé</option>
            </select>

            <select
              value={fournisseurFilter}
              onChange={(e) => {
                setFournisseurFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white font-serif max-w-xs truncate"
            >
              <option value="">Tous les fournisseurs</option>
              {fournisseurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
            </select>

            <Button variant="primary" size="sm" type="submit" className="font-serif text-xs px-3">
              Filtrer
            </Button>
            {(search || statutFilter || fournisseurFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatutFilter('');
                  setFournisseurFilter('');
                  setPage(1);
                }}
                className="text-xs text-rose-600 hover:underline px-1 font-bold shrink-0"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tableau des Achats */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Réf & Date</th>
                <th className="px-4 py-3.5">Fournisseur</th>
                <th className="px-4 py-3.5">Quantité</th>
                <th className="px-4 py-3.5 text-right">Montant Total</th>
                <th className="px-4 py-3.5 text-right">Payé</th>
                <th className="px-4 py-3.5 text-right">Reste Dû</th>
                <th className="px-4 py-3.5 text-center">Statut</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 font-serif">
                    Chargement des achats...
                  </td>
                </tr>
              ) : achats.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 font-serif">
                    Aucun achat enregistré
                  </td>
                </tr>
              ) : (
                achats.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-mono text-xs font-bold text-slate-900">{a.reference}</div>
                      <div className="text-[11px] text-slate-500">{formatDateTime(a.dateAchat)}</div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800 whitespace-nowrap">
                      {a.fournisseur?.nom}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      {a.details?.reduce((acc: number, d: any) => acc + Number(d.quantite), 0)} unités
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatFCFA(a.montantTotal)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-emerald-700 font-semibold whitespace-nowrap">
                      {formatFCFA(a.montantPaye)}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {Number(a.resteAPayer) > 0 ? (
                        <span className="font-bold text-rose-600">{formatFCFA(a.resteAPayer)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <Badge
                        variant={
                          a.statut === 'paye'
                            ? 'success'
                            : a.statut === 'receptionne'
                            ? 'info'
                            : a.statut === 'annule'
                            ? 'danger'
                            : 'warning'
                        }
                        size="xs"
                      >
                        {a.statut === 'receptionne'
                          ? 'Réceptionné'
                          : a.statut === 'commande'
                          ? 'En Commande'
                          : a.statut === 'annule'
                          ? 'Annulé'
                          : 'Payé'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {a.statut === 'commande' && (
                          <>
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => handleReceptionner(a.id)}
                              icon={<PackageCheck className="h-3 w-3 text-emerald-700" />}
                              className="text-[11px] font-bold text-emerald-800 bg-emerald-50"
                            >
                              Réceptionner
                            </Button>
                            <button
                              type="button"
                              onClick={() => handleAnnulerAchat(a)}
                              title="Annuler la commande"
                              className="p-1 text-slate-400 hover:text-amber-600 rounded"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {(a.statut === 'annule' || a.statut === 'commande') && hasRole('Administrateur') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAchat(a)}
                            title="Supprimer la commande"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={limit}
          onPageChange={(p) => setPage(p)}
        />
      </Card>

      {/* MODAL NOUVEL ACHAT */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setAchatError(null);
        }}
        title="Enregistrer un Achat / Commande Fournisseur"
        maxWidth="md"
      >
        <form onSubmit={handleCreateAchat} className="space-y-4">
          {achatError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {achatError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fournisseur *</label>
            <select
              required
              value={fournisseurId}
              onChange={(e) => setFournisseurId(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600"
            >
              <option value="">Sélectionner un fournisseur</option>
              {fournisseurs.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantité (unités) *</label>
              <input
                type="number"
                required
                min="1"
                placeholder="Ex: 100"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prix Achat Unitaire (F CFA) *</label>
              <input
                type="number"
                required
                min="1"
                placeholder="Ex: 1200"
                value={prixUnitaire}
                onChange={(e) => setPrixUnitaire(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Montant Total Facture :</span>
            <span className="font-bold text-sm text-slate-900">{formatFCFA(totalCalcule)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Montant Réglé Immédiatement</label>
              <input
                type="number"
                min="0"
                max={totalCalcule}
                placeholder={`Total: ${totalCalcule}`}
                value={montantPaye}
                onChange={(e) => setMontantPaye(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
              <span className="text-[10px] text-slate-400">Laisser vide pour payement intégral</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mode de règlement</label>
              <select
                value={modePaiement}
                onChange={(e) => setModePaiement(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600"
              >
                <option value="especes">Espèces (Caisse)</option>
                <option value="virement">Virement bancaire</option>
                <option value="cheque">Chèque</option>
                <option value="orange_money">Orange Money</option>
                <option value="wave">Wave</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">État de la livraison</label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-xs font-semibold transition-all ${statutAchat === 'receptionne' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 shadow-2xs' : 'border-slate-200'}`}>
                <input
                  type="radio"
                  name="statutAchat"
                  value="receptionne"
                  checked={statutAchat === 'receptionne'}
                  onChange={() => setStatutAchat('receptionne')}
                />
                <span>Marchandise Réceptionnée (Stock mis à jour)</span>
              </label>
              <label className={`flex items-center gap-2 p-3 border rounded-xl cursor-pointer text-xs font-semibold transition-all ${statutAchat === 'commande' ? 'border-amber-600 bg-amber-50/50 text-amber-900 shadow-2xs' : 'border-slate-200'}`}>
                <input
                  type="radio"
                  name="statutAchat"
                  value="commande"
                  checked={statutAchat === 'commande'}
                  onChange={() => setStatutAchat('commande')}
                />
                <span>En Commande (Stock non impacté)</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting} className="font-bold shadow-sm">
              Valider la commande
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

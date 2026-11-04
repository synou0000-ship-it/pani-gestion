import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { isSQLiteAvailable, sqliteGetProduits, sqliteCreateLocalAjustement, sqliteCreateLocalTarif } from '../lib/sqlite';
import { formatDateTime } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import {
  Package,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  History,
  Layers,
  CheckCircle,
  Tag,
  Pencil,
  Trash2,
  Filter,
} from 'lucide-react';

export const StockPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [stockList, setStockList] = useState<any[]>([]);
  const [mouvements, setMouvements] = useState<any[]>([]);
  const [mouvementsTotal, setMouvementsTotal] = useState(0);
  const [mouvementsPage, setMouvementsPage] = useState(1);
  const mouvementsLimit = 15;
  const [loading, setLoading] = useState(true);

  // Filtre mouvements
  const [mouvementTypeFilter, setMouvementTypeFilter] = useState('');

  // Modals
  const [modalAjustementOpen, setModalAjustementOpen] = useState(false);
  const [modalNouveauTarifOpen, setModalNouveauTarifOpen] = useState(false);
  const [modalEditTarifOpen, setModalEditTarifOpen] = useState(false);
  const [selectedTarif, setSelectedTarif] = useState<any>(null);

  // Form ajustement
  const [ajustementProdId, setAjustementProdId] = useState<string>('');
  const [ajustementType, setAjustementType] = useState<string>('sortie_perte');
  const [ajustementQte, setAjustementQte] = useState<string>('');
  const [ajustementMotif, setAjustementMotif] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form nouveau tarif
  const [nouveauTarifDesignation, setNouveauTarifDesignation] = useState('');
  const [nouveauTarifPrix, setNouveauTarifPrix] = useState('');
  const [tarifError, setTarifError] = useState<string | null>(null);

  // Form edit tarif
  const [editTarifDesignation, setEditTarifDesignation] = useState('');
  const [editTarifPrix, setEditTarifPrix] = useState('');
  const [editTarifError, setEditTarifError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);

    if (isSQLiteAvailable()) {
      try {
        const sqlProds = await sqliteGetProduits();
        if (sqlProds && sqlProds.length > 0) {
          setStockList(
            sqlProds.map((p) => ({
              produitId: p.server_id || p.id,
              nom: p.nom,
              unite: p.unite,
              stockActuel: p.quantite_stock || 0,
              seuilAlerte: p.seuil_alerte || 10,
              tarifs: p.tarifs || [],
            }))
          );
        }
      } catch (sqlErr) {
        console.warn('SQLite fetch stock:', sqlErr);
      }
    }

    try {
      const mvtParams = new URLSearchParams({
        page: mouvementsPage.toString(),
        limit: mouvementsLimit.toString(),
      });
      if (mouvementTypeFilter) mvtParams.append('typeOperation', mouvementTypeFilter);

      const [stkRes, mvtRes] = await Promise.all([
        api.get('/stock'),
        api.get(`/stock/mouvements?${mvtParams.toString()}`),
      ]);

      if (stkRes.data?.data) {
        setStockList(stkRes.data.data);
        if (stkRes.data.data[0]) setAjustementProdId(stkRes.data.data[0].produitId.toString());
      }
      if (mvtRes.data?.data) {
        setMouvements(mvtRes.data.data);
        setMouvementsTotal(mvtRes.data.pagination?.total || mvtRes.data.data.length);
      }
    } catch (err) {
      console.warn('Erreur chargement stock serveur:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mouvementsPage, mouvementTypeFilter]);

  const handleAjustement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ajustementQte || Number(ajustementQte) <= 0) return;
    if (!ajustementMotif.trim()) return;

    setSubmitting(true);
    const ajustData = {
      produitId: parseInt(ajustementProdId),
      typeOperation: ajustementType,
      quantite: Number(ajustementQte),
      motif: ajustementMotif,
    };

    try {
      const res = await api.post('/stock/ajustements', ajustData);
      if (res.data?.success) {
        setSuccessMsg('Stock ajusté avec succès');
        setAjustementQte('');
        setAjustementMotif('');
        setTimeout(() => {
          setModalAjustementOpen(false);
          setSuccessMsg(null);
        }, 1200);
        await fetchData();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      const isOfflineErr = !err.response || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';
      if (isOfflineErr && isSQLiteAvailable()) {
        try {
          await sqliteCreateLocalAjustement(ajustData);
          setSuccessMsg('Ajustement enregistré en local (synchronisation au retour en ligne)');
          setAjustementQte('');
          setAjustementMotif('');
          setTimeout(() => {
            setModalAjustementOpen(false);
            setSuccessMsg(null);
          }, 1200);
          await fetchData();
          window.dispatchEvent(new Event('pani:data-changed'));
        } catch (_) {
          setErrorMsg('Erreur lors de l\'enregistrement local.');
        }
      } else {
        setErrorMsg(err.response?.data?.message || 'Erreur lors de l\'ajustement du stock');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreerTarif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nouveauTarifDesignation || !nouveauTarifPrix) return;

    const prodId = stockList[0]?.produitId;
    if (!prodId) {
      alert('Aucun produit disponible pour associer ce tarif.');
      return;
    }

    setSubmitting(true);
    setTarifError(null);
    const tarifData = {
      produitId: prodId,
      designation: nouveauTarifDesignation,
      prix: Number(nouveauTarifPrix),
    };

    try {
      await api.post('/produits/tarifs', tarifData);
      setModalNouveauTarifOpen(false);
      setNouveauTarifDesignation('');
      setNouveauTarifPrix('');
      await fetchData();
      window.dispatchEvent(new Event('pani:data-changed'));
    } catch (err: any) {
      const isOfflineErr = !err.response || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';
      if (isOfflineErr && isSQLiteAvailable()) {
        try {
          await sqliteCreateLocalTarif(tarifData);
          setModalNouveauTarifOpen(false);
          setNouveauTarifDesignation('');
          setNouveauTarifPrix('');
          await fetchData();
          window.dispatchEvent(new Event('pani:data-changed'));
        } catch (_) {}
      } else {
        setTarifError(err.response?.data?.message || 'Erreur lors de la création du tarif');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEditTarifModal = (t: any) => {
    setSelectedTarif(t);
    setEditTarifDesignation(t.designation);
    setEditTarifPrix(String(t.prix));
    setEditTarifError(null);
    setModalEditTarifOpen(true);
  };

  const handleUpdateTarif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarif || !editTarifDesignation || !editTarifPrix) return;

    setSubmitting(true);
    setEditTarifError(null);

    try {
      const res = await api.put(`/produits/tarifs/${selectedTarif.id}`, {
        designation: editTarifDesignation,
        prix: Number(editTarifPrix),
      });

      if (res.data?.success) {
        setModalEditTarifOpen(false);
        setSelectedTarif(null);
        await fetchData();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      setEditTarifError(err.response?.data?.message || 'Erreur lors de la modification du tarif');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTarif = async (t: any) => {
    if (!window.confirm(`Confirmez-vous la suppression du tarif "${t.designation}" (${t.prix} F) ?`)) {
      return;
    }

    try {
      const res = await api.delete(`/produits/tarifs/${t.id}`);
      if (res.data?.success) {
        await fetchData();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression du tarif');
    }
  };

  const totalMvtPages = Math.ceil(mouvementsTotal / mouvementsLimit) || 1;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">Stocks & Tarifs Pani</h1>
          <p className="text-xs text-slate-500 hidden sm:block">Niveaux de stock, mouvements et gestion des tarifs</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalNouveauTarifOpen(true)}
            icon={<Tag className="h-4 w-4" />}
            className="font-serif font-bold text-xs sm:text-sm whitespace-nowrap min-h-[40px] px-3"
          >
            + Tarif
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalAjustementOpen(true)}
            icon={<PlusCircle className="h-4 w-4" />}
            className="font-serif font-bold text-xs sm:text-sm whitespace-nowrap min-h-[40px] px-3.5"
          >
            Ajuster Stock
          </Button>
        </div>
      </div>

      {/* Cartes Produits / Stocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {stockList.map((item) => (
          <Card key={item.produitId} className="flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{item.nom}</h3>
                  <span className="text-xs text-slate-400">Unité : {item.unite}</span>
                </div>
                {item.stockActuel <= item.seuilAlerte ? (
                  <Badge variant="danger" size="sm" className="flex items-center gap-1 font-bold">
                    <AlertTriangle className="h-3 w-3" />
                    Stock Faible
                  </Badge>
                ) : (
                  <Badge variant="success" size="sm">Disponible</Badge>
                )}
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{item.stockActuel}</span>
                <span className="text-sm font-semibold text-slate-500">{item.unite}(s) en stock</span>
              </div>
            </div>

            {/* Tarifs attachés avec actions de modification / suppression */}
            <div className="mt-5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">Tarifs de vente configurés :</span>
                <button
                  type="button"
                  onClick={() => setModalNouveauTarifOpen(true)}
                  className="text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  + Ajouter
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {item.tarifs?.map((t: any) => (
                  <div
                    key={t.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200/60 text-slate-800 font-semibold transition-colors"
                  >
                    <span>
                      {t.designation}: <strong className="text-emerald-700">{t.prix} F</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => openEditTarifModal(t)}
                      title="Modifier ce prix"
                      className="p-0.5 text-slate-400 hover:text-emerald-700"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTarif(t)}
                      title="Supprimer ce tarif"
                      className="p-0.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Historique des Mouvements de Stock avec Filtrage et Pagination */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-700" />
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">Journal des Mouvements de Stock</h3>
          </div>

          {/* Filtres par type d'opération */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <select
              value={mouvementTypeFilter}
              onChange={(e) => {
                setMouvementTypeFilter(e.target.value);
                setMouvementsPage(1);
              }}
              className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-serif"
            >
              <option value="">Toutes les opérations</option>
              <option value="sortie_vente">Ventes (Sorties)</option>
              <option value="entree_achat">Achats / Réceptions (Entrées)</option>
              <option value="sortie_perte">Pertes / Avaries</option>
              <option value="ajustement_positif">Ajustements (+)</option>
              <option value="ajustement_negatif">Ajustements (-)</option>
              <option value="inventaire_ecart">Écarts d'inventaire</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Date & Heure</th>
                <th className="px-4 py-3">Produit</th>
                <th className="px-4 py-3">Type Opération</th>
                <th className="px-4 py-3 text-center">Quantité</th>
                <th className="px-4 py-3 text-right">Avant</th>
                <th className="px-4 py-3 text-right">Après</th>
                <th className="px-4 py-3">Motif / Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 font-serif">
                    Chargement des mouvements...
                  </td>
                </tr>
              ) : mouvements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 font-serif">
                    Aucun mouvement trouvé
                  </td>
                </tr>
              ) : (
                mouvements.map((m) => {
                  const isSortie = m.typeOperation.includes('sortie') || m.typeOperation.includes('negatif');
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDateTime(m.dateMouvement)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                        {m.produit?.nom || 'Pani'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            isSortie ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {m.typeOperation}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap font-bold">
                        <span className={isSortie ? 'text-rose-600' : 'text-emerald-600'}>
                          {isSortie ? '-' : '+'}
                          {m.quantite}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-500 whitespace-nowrap font-mono">
                        {m.stockAvant}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-bold text-slate-800 whitespace-nowrap font-mono">
                        {m.stockApres}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-xs truncate">
                        {m.motif || m.vente?.reference || m.achat?.reference || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination des mouvements */}
        <Pagination
          currentPage={mouvementsPage}
          totalPages={totalMvtPages}
          totalItems={mouvementsTotal}
          itemsPerPage={mouvementsLimit}
          onPageChange={(p) => setMouvementsPage(p)}
        />
      </Card>

      {/* MODAL AJUSTEMENT DE STOCK */}
      <Modal
        isOpen={modalAjustementOpen}
        onClose={() => setModalAjustementOpen(false)}
        title="Ajustement Manuel de Stock"
        maxWidth="md"
      >
        <form onSubmit={handleAjustement} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs border border-emerald-200">
              {successMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Type d'ajustement *</label>
            <select
              value={ajustementType}
              onChange={(e) => setAjustementType(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600"
            >
              <option value="sortie_perte">Sortie : Perte / Avarie</option>
              <option value="ajustement_negatif">Sortie : Correction d'erreur (-)</option>
              <option value="entree">Entrée : Réintégration de stock (+)</option>
              <option value="ajustement_positif">Entrée : Correction d'erreur (+)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Quantité (unités) *</label>
            <input
              type="number"
              required
              min="1"
              placeholder="Ex: 5"
              value={ajustementQte}
              onChange={(e) => setAjustementQte(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Motif / Justification obligatoire *</label>
            <textarea
              required
              rows={2}
              placeholder="Ex: Sacs abîmés lors de la manutention, comptage physique..."
              value={ajustementMotif}
              onChange={(e) => setAjustementMotif(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setModalAjustementOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting} className="font-bold shadow-sm">
              Valider l'ajustement
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL NOUVEAU TARIF */}
      <Modal
        isOpen={modalNouveauTarifOpen}
        onClose={() => setModalNouveauTarifOpen(false)}
        title="Créer un Nouveau Tarif"
        maxWidth="sm"
      >
        <form onSubmit={handleCreerTarif} className="space-y-4">
          {tarifError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {tarifError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Désignation du tarif *</label>
            <input
              type="text"
              required
              placeholder="Ex: Tarif Demi-gros, Tarif Spécial..."
              value={nouveauTarifDesignation}
              onChange={(e) => setNouveauTarifDesignation(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Prix Unitaire (F CFA) *</label>
            <input
              type="number"
              required
              min="1"
              placeholder="Ex: 1200"
              value={nouveauTarifPrix}
              onChange={(e) => setNouveauTarifPrix(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setModalNouveauTarifOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting} className="font-bold shadow-sm">
              Créer le Tarif
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL MODIFIER TARIF */}
      <Modal
        isOpen={modalEditTarifOpen}
        onClose={() => setModalEditTarifOpen(false)}
        title={`Modifier le Tarif — ${selectedTarif?.designation}`}
        maxWidth="sm"
      >
        <form onSubmit={handleUpdateTarif} className="space-y-4">
          {editTarifError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {editTarifError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Désignation *</label>
            <input
              type="text"
              required
              value={editTarifDesignation}
              onChange={(e) => setEditTarifDesignation(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Prix Unitaire (F CFA) *</label>
            <input
              type="number"
              required
              min="1"
              value={editTarifPrix}
              onChange={(e) => setEditTarifPrix(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setModalEditTarifOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting} className="font-bold shadow-sm">
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

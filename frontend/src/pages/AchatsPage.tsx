import React, { useState, useEffect } from 'react';
import { api, saveOfflineAchat, getOfflineAchats } from '../lib/api';
import { isSQLiteAvailable, sqliteGetAchats, sqliteCreateLocalAchat, sqliteUpsertAchat } from '../lib/sqlite';
import { pushLocalChanges } from '../lib/sync';
import { formatFCFA, formatDateTime } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  Store,
  PlusCircle,
  PackageCheck,
  Search,
  Eye,
  CheckCircle,
} from 'lucide-react';

export const AchatsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [achats, setAchats] = useState<any[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [produits, setProduits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Nouvel Achat
  const [modalOpen, setModalOpen] = useState(false);
  const [fournisseurId, setFournisseurId] = useState('');
  const [statutAchat, setStatutAchat] = useState('receptionne'); // 'receptionne' ou 'commande'
  const [quantite, setQuantite] = useState('100');
  const [prixUnitaire, setPrixUnitaire] = useState('1200');
  const [montantPaye, setMontantPaye] = useState('');
  const [modePaiement, setModePaiement] = useState('especes');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);

    // 1. Lire d'abord depuis SQLite si disponible (sur mobile)
    if (isSQLiteAvailable()) {
      try {
        const sqlAchats = await sqliteGetAchats(30);
        if (sqlAchats && sqlAchats.length > 0) {
          setAchats(sqlAchats);
        }
      } catch (sqlErr) {
        console.warn('SQLite fetch achats:', sqlErr);
      }
    } else {
      const offlineAchats = getOfflineAchats();
      if (offlineAchats && offlineAchats.length > 0) {
        setAchats(offlineAchats);
      }
    }

    // 2. Synchroniser avec PostgreSQL via l'API si connecté
    try {
      const [achRes, fourRes, prodRes] = await Promise.all([
        api.get('/achats?limit=30'),
        api.get('/fournisseurs'),
        api.get('/produits'),
      ]);
      if (achRes.data?.data) setAchats(achRes.data.data);
      if (fourRes.data?.data) {
        setFournisseurs(fourRes.data.data);
        if (fourRes.data.data[0]) setFournisseurId(fourRes.data.data[0].id.toString());
      }
      if (prodRes.data?.data) setProduits(prodRes.data.data);
    } catch (err) {
      console.warn('Erreur chargement achats serveur (mode hors-ligne):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalCalcule = (Number(quantite) || 0) * (Number(prixUnitaire) || 0);

  const handleCreateAchat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fournisseurId || !quantite || !prixUnitaire) return;

    setSubmitting(true);

    const defaultProd = produits[0] || { id: 1 };
    const payloadAchat = {
      fournisseurId: parseInt(fournisseurId),
      montantTotal: totalCalcule,
      montantPaye: montantPaye ? Number(montantPaye) : totalCalcule,
      resteAPayer: totalCalcule - (montantPaye ? Number(montantPaye) : totalCalcule),
      statut: statutAchat,
      details: [{
        produitId: defaultProd.id,
        quantite: Number(quantite),
        prixUnitaire: Number(prixUnitaire),
        montant: totalCalcule,
      }],
    };

    // 1. ENREGISTREMENT LOCAL EN PREMIER (Local-First — stock augmenté immédiatement en local)
    if (isSQLiteAvailable()) {
      try {
        await sqliteCreateLocalAchat(payloadAchat);
      } catch (sqlErr) {
        console.error('[Achat] Erreur SQLite local:', sqlErr);
      }
    } else {
      saveOfflineAchat(payloadAchat);
    }

    // 2. FERMER ET RAFRAÎCHIR IMMÉDIATEMENT
    setModalOpen(false);
    setQuantite('100'); setPrixUnitaire('1200'); setMontantPaye('');
    fetchData();
    window.dispatchEvent(new Event('pani:data-changed'));
    setSubmitting(false);

    // 3. SYNCHRO ARRIÈRE-PLAN
    setTimeout(async () => {
      try {
        const res = await api.post('/achats', {
          fournisseurId: payloadAchat.fournisseurId,
          statut: statutAchat,
          montantPaye: payloadAchat.montantPaye,
          modePaiement,
          details: [{ produitId: defaultProd.id, quantite: Number(quantite), prixUnitaire: Number(prixUnitaire) }],
        });
        if (res.data?.success && isSQLiteAvailable()) {
          await sqliteUpsertAchat(res.data.data).catch(() => {});
        }
      } catch (_) {}
      pushLocalChanges().catch(() => {});
      fetchData();
    }, 200);
  };

  const handleReceptionner = async (achatId: number) => {
    if (!confirm('Confirmez-vous la réception de cette marchandise ? Le stock sera augmenté automatiquement.')) return;
    try {
      const res = await api.put(`/achats/${achatId}/receptionner`);
      if (res.data?.success) {
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur réception');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Achats & Réceptions</h1>
          <p className="text-xs text-slate-500">
            Enregistrement des approvisionnements et entrées en stock
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setModalOpen(true)}
          icon={<PlusCircle className="h-4 w-4" />}
        >
          Nouvel Achat
        </Button>
      </div>

      {/* Tableau des Achats */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-5 py-3.5">Référence & Date</th>
                <th className="px-5 py-3.5">Fournisseur</th>
                <th className="px-5 py-3.5">Quantité Achetée</th>
                <th className="px-5 py-3.5 text-right">Montant Total</th>
                <th className="px-5 py-3.5 text-right">Payé</th>
                <th className="px-5 py-3.5 text-right">Reste Dû</th>
                <th className="px-5 py-3.5 text-center">Statut</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    Chargement des achats...
                  </td>
                </tr>
              ) : achats.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    Aucun achat enregistré
                  </td>
                </tr>
              ) : (
                achats.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5">
                      <div className="font-mono text-xs font-bold text-slate-900">{a.reference}</div>
                      <div className="text-xs text-slate-500">{formatDateTime(a.dateAchat)}</div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">
                      {a.fournisseur?.nom}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {a.details?.reduce((acc: number, d: any) => acc + Number(d.quantite), 0)} unités
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                      {formatFCFA(a.montantTotal)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-emerald-700 font-semibold">
                      {formatFCFA(a.montantPaye)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {Number(a.resteAPayer) > 0 ? (
                        <span className="font-bold text-rose-600">{formatFCFA(a.resteAPayer)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge
                        variant={
                          a.statut === 'paye'
                            ? 'success'
                            : a.statut === 'receptionne'
                            ? 'info'
                            : 'warning'
                        }
                      >
                        {a.statut === 'receptionne'
                          ? 'Réceptionné'
                          : a.statut === 'commande'
                          ? 'En Commande'
                          : 'Payé'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {a.statut === 'commande' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReceptionner(a.id)}
                          icon={<PackageCheck className="h-3.5 w-3.5 text-brand-600" />}
                          className="text-xs text-brand-700 bg-brand-50"
                        >
                          Réceptionner
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL NOUVEL ACHAT */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Enregistrer un Achat / Approvisionnement"
        maxWidth="md"
      >
        <form onSubmit={handleCreateAchat} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fournisseur *</label>
            <select
              value={fournisseurId}
              onChange={(e) => setFournisseurId(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
            >
              {fournisseurs.map((f) => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quantité (unités) *</label>
              <input
                type="number"
                min="1"
                required
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prix d'achat unitaire *</label>
              <input
                type="number"
                min="1"
                required
                value={prixUnitaire}
                onChange={(e) => setPrixUnitaire(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border flex justify-between text-xs font-bold text-slate-800">
            <span>Montant Total Calculé :</span>
            <span className="text-sm text-brand-700">{formatFCFA(totalCalcule)}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Statut initial de la marchandise</label>
            <select
              value={statutAchat}
              onChange={(e) => setStatutAchat(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
            >
              <option value="receptionne">Marchandise déjà réceptionnée (augmente le stock immédiatement)</option>
              <option value="commande">Simple commande (stock non augmenté tant que non réceptionné)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Montant Payé Comptant</label>
              <input
                type="number"
                placeholder={totalCalcule.toString()}
                value={montantPaye}
                onChange={(e) => setMontantPaye(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mode de règlement</label>
              <select
                value={modePaiement}
                onChange={(e) => setModePaiement(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="especes">Espèces (Caisse)</option>
                <option value="virement">Virement bancaire</option>
                <option value="orange_money">Mobile Money</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              Valider l'achat
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


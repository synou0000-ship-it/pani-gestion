import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  ClipboardList,
  PlusCircle,
  CheckCircle,
  AlertTriangle,
  History,
  ShieldCheck,
} from 'lucide-react';

export const InventairePage: React.FC = () => {
  const { hasRole } = useAuth();
  const [inventaires, setInventaires] = useState<any[]>([]);
  const [produits, setProduits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Nouvel Inventaire
  const [modalOpen, setModalOpen] = useState(false);
  const [comptages, setComptages] = useState<{ [key: number]: { stockPhysique: string; motifEcart: string } }>({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, prodRes] = await Promise.all([
        api.get('/inventaires?limit=20'),
        api.get('/stock'),
      ]);
      if (invRes.data?.data) setInventaires(invRes.data.data);
      if (prodRes.data?.data) {
        setProduits(prodRes.data.data);
        // Initialiser comptages avec le stock théorique actuel
        const initMap: any = {};
        prodRes.data.data.forEach((p: any) => {
          initMap[p.produitId] = {
            stockPhysique: p.stockActuel.toString(),
            motifEcart: 'autre',
          };
        });
        setComptages(initMap);
      }
    } catch (err) {
      console.error('Erreur inventaires:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateInventaire = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const details = produits.map((p) => {
        const item = comptages[p.produitId] || { stockPhysique: p.stockActuel.toString(), motifEcart: 'autre' };
        return {
          produitId: p.produitId,
          stockPhysique: Number(item.stockPhysique) || 0,
          motifEcart: item.motifEcart,
        };
      });

      const res = await api.post('/inventaires', {
        details,
        notes,
      });

      if (res.data?.success) {
        setModalOpen(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur création inventaire');
    } finally {
      setSubmitting(false);
    }
  };

  const handleValiderInventaire = async (id: number) => {
    if (!confirm('Confirmez-vous la validation de cet inventaire ? Le stock théorique sera automatiquement aligné sur le comptage physique.')) return;
    try {
      const res = await api.put(`/inventaires/${id}/valider`);
      if (res.data?.success) {
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur validation');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Inventaire & Manques</h1>
          <p className="text-xs text-slate-500">
            Comptage physique périodique, calcul des écarts et justification des pertes
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setModalOpen(true)}
          icon={<PlusCircle className="h-4 w-4" />}
        >
          Nouvel Inventaire
        </Button>
      </div>

      {/* Liste des Sessions d'Inventaire */}
      <div className="space-y-4">
        {inventaires.map((inv) => (
          <Card key={inv.id} className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brand-50 text-brand-600">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm font-mono">{inv.reference}</div>
                  <div className="text-xs text-slate-500">
                    Effectué le {formatDateTime(inv.dateInventaire)} par {inv.utilisateur?.prenom} {inv.utilisateur?.nom}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={inv.statut === 'valide' ? 'success' : 'warning'}>
                  {inv.statut === 'valide' ? 'Validé & Stock Corrigé' : 'En attente de validation'}
                </Badge>

                {inv.statut === 'en_cours' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleValiderInventaire(inv.id)}
                    icon={<ShieldCheck className="h-4 w-4" />}
                  >
                    Valider Écarts
                  </Button>
                )}
              </div>
            </div>

            {/* Détails des écarts */}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-slate-500 font-semibold bg-slate-50">
                  <tr>
                    <th className="p-2.5">Produit</th>
                    <th className="p-2.5 text-center">Stock Théorique</th>
                    <th className="p-2.5 text-center">Comptage Physique</th>
                    <th className="p-2.5 text-center">Écart Constaté</th>
                    <th className="p-2.5">Motif Déclaré</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inv.details?.map((d: any) => {
                    const ecart = Number(d.ecart);
                    return (
                      <tr key={d.id}>
                        <td className="p-2.5 font-bold text-slate-800">{d.produit?.nom || 'Pani'}</td>
                        <td className="p-2.5 text-center font-medium text-slate-600">{Number(d.stockTheorique)}</td>
                        <td className="p-2.5 text-center font-bold text-slate-900">{Number(d.stockPhysique)}</td>
                        <td className="p-2.5 text-center">
                          {ecart < 0 ? (
                            <span className="px-2 py-0.5 rounded font-black bg-rose-100 text-rose-700">
                              Manque {ecart}
                            </span>
                          ) : ecart > 0 ? (
                            <span className="px-2 py-0.5 rounded font-black bg-emerald-100 text-emerald-700">
                              Surplus +{ecart}
                            </span>
                          ) : (
                            <span className="text-slate-400">Écart 0</span>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-500 capitalize">{d.motifEcart || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>

      {/* MODAL NOUVEL INVENTAIRE */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Session de Comptage Physique d'Inventaire"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateInventaire} className="space-y-4">
          <p className="text-xs text-slate-500">
            Saisissez les quantités physiquement comptées dans votre boutique ou entrepôt. Le système calculera immédiatement les écarts.
          </p>

          <div className="space-y-4 max-h-72 overflow-y-auto">
            {produits.map((p) => {
              const current = comptages[p.produitId] || { stockPhysique: p.stockActuel.toString(), motifEcart: 'autre' };
              const physique = Number(current.stockPhysique) || 0;
              const ecart = physique - p.stockActuel;

              return (
                <div key={p.produitId} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{p.nom}</div>
                      <div className="text-xs text-slate-500">Stock Théorique Actuel : <strong>{p.stockActuel}</strong> {p.unite}s</div>
                    </div>
                    {ecart !== 0 && (
                      <Badge variant={ecart < 0 ? 'danger' : 'success'}>
                        {ecart < 0 ? `Écart : ${ecart}` : `Surplus : +${ecart}`}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Comptage Physique Réel</label>
                      <input
                        type="number"
                        min="0"
                        value={current.stockPhysique}
                        onChange={(e) =>
                          setComptages((prev) => ({
                            ...prev,
                            [p.produitId]: { ...current, stockPhysique: e.target.value },
                          }))
                        }
                        className="w-full p-2 text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Motif de l'écart</label>
                      <select
                        value={current.motifEcart}
                        onChange={(e) =>
                          setComptages((prev) => ({
                            ...prev,
                            [p.produitId]: { ...current, motifEcart: e.target.value },
                          }))
                        }
                        className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
                      >
                        <option value="perte">Perte</option>
                        <option value="casse">Casse / Avarie</option>
                        <option value="erreur_vente">Erreur de vente</option>
                        <option value="sortie_non_enregistree">Sortie non enregistrée</option>
                        <option value="erreur_reception">Erreur de réception</option>
                        <option value="autre">Autre motif</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes globales d'inventaire</label>
            <input
              type="text"
              placeholder="Ex: Inventaire mensuel fin de mois..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              Enregistrer l'inventaire
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


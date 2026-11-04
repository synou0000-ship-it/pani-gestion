import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/formatters';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import {
  ClipboardList,
  PlusCircle,
  AlertOctagon,
  CheckCircle2,
  ShieldCheck,
  Search,
  Trash2,
  Filter,
} from 'lucide-react';

export const InventairePage: React.FC = () => {
  const [inventaires, setInventaires] = useState<any[]>([]);
  const [produits, setProduits] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [loading, setLoading] = useState(true);

  // Filtres
  const [search, setSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');

  // Modal Nouvel Inventaire
  const [modalOpen, setModalOpen] = useState(false);
  const [comptages, setComptages] = useState<{ [key: number]: { stockPhysique: string; motifEcart: string } }>({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search.trim()) params.append('search', search.trim());
      if (statutFilter) params.append('statut', statutFilter);

      const [invRes, prodRes] = await Promise.all([
        api.get(`/inventaires?${params.toString()}`),
        api.get('/stock'),
      ]);

      if (invRes.data?.data) {
        setInventaires(invRes.data.data);
        setTotal(invRes.data.pagination?.total || invRes.data.data.length);
      }
      if (prodRes.data?.data) {
        setProduits(prodRes.data.data);
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
  }, [page, statutFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

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
        setNotes('');
        await fetchData();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur création inventaire');
    } finally {
      setSubmitting(false);
    }
  };

  const handleValiderInventaire = async (id: number) => {
    if (!window.confirm('Confirmez-vous la validation de cet inventaire ? Les écarts ajusteront définitivement le stock.')) {
      return;
    }

    try {
      const res = await api.put(`/inventaires/${id}/valider`);
      if (res.data?.success) {
        await fetchData();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la validation');
    }
  };

  const handleDeleteInventaire = async (inv: any) => {
    if (!window.confirm(`Confirmez-vous la suppression de l'inventaire ${inv.reference} ?`)) {
      return;
    }

    try {
      const res = await api.delete(`/inventaires/${inv.id}`);
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">Inventaires & Contrôle des Stocks</h1>
          <p className="text-xs text-slate-500 hidden sm:block">Comptage physique périodique, détection des pertes et régularisation</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setModalOpen(true)}
          icon={<PlusCircle className="h-4 w-4" />}
          className="shrink-0 font-serif font-bold text-xs sm:text-sm whitespace-nowrap min-h-[40px] px-3.5"
        >
          <span className="hidden sm:inline">Nouvel Inventaire</span>
          <span className="sm:hidden">Inventaire</span>
        </Button>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par référence, note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 font-serif"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statutFilter}
              onChange={(e) => {
                setStatutFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white font-serif"
            >
              <option value="">Tous les statuts</option>
              <option value="en_cours">En attente de validation</option>
              <option value="valide">Validé & Corrigé</option>
            </select>

            <Button variant="primary" size="sm" type="submit" className="font-serif text-xs px-3">
              Filtrer
            </Button>
            {(search || statutFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatutFilter('');
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

      {/* Liste des Sessions d'Inventaire */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-serif">Chargement des inventaires...</div>
      ) : inventaires.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200 font-serif">
          Aucun inventaire enregistré pour ces critères
        </div>
      ) : (
        <div className="space-y-3.5">
          {inventaires.map((inv) => (
            <Card key={inv.id} className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm font-mono">{inv.reference}</div>
                    <div className="text-xs text-slate-500">
                      Effectué le {formatDateTime(inv.dateInventaire)} par {inv.utilisateur?.prenom} {inv.utilisateur?.nom}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={inv.statut === 'valide' ? 'success' : 'warning'} size="xs">
                    {inv.statut === 'valide' ? 'Validé & Stock Corrigé' : 'En attente de validation'}
                  </Badge>

                  {inv.statut === 'en_cours' && (
                    <>
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => handleValiderInventaire(inv.id)}
                        icon={<ShieldCheck className="h-3.5 w-3.5" />}
                        className="shadow-xs font-serif font-bold text-xs"
                      >
                        Valider Écarts
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDeleteInventaire(inv)}
                        title="Supprimer le projet d'inventaire"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
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
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={total}
        itemsPerPage={limit}
        onPageChange={(p) => setPage(p)}
      />

      {/* MODAL NOUVEL INVENTAIRE */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Saisie d'un Nouvel Inventaire Physique"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateInventaire} className="space-y-4">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Saisissez la quantité physique réelle comptée dans la boulangerie pour chaque produit. Les écarts seront
              calculés automatiquement.
            </span>
          </div>

          <div className="space-y-3">
            {produits.map((p) => {
              const current = comptages[p.produitId] || { stockPhysique: p.stockActuel.toString(), motifEcart: 'autre' };
              const diff = (Number(current.stockPhysique) || 0) - p.stockActuel;

              return (
                <div key={p.produitId} className="p-3 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{p.nom}</span>
                      <span className="text-xs text-slate-500 ml-2">Stock Théorique : <strong>{p.stockActuel}</strong> {p.unite}(s)</span>
                    </div>

                    {diff !== 0 && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${diff < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        Écart : {diff > 0 ? `+${diff}` : diff}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Stock Réellement Compté *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={current.stockPhysique}
                        onChange={(e) => {
                          setComptages({
                            ...comptages,
                            [p.produitId]: { ...current, stockPhysique: e.target.value },
                          });
                        }}
                        className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Motif de l'écart (si différent)
                      </label>
                      <select
                        value={current.motifEcart}
                        onChange={(e) => {
                          setComptages({
                            ...comptages,
                            [p.produitId]: { ...current, motifEcart: e.target.value },
                          });
                        }}
                        className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="perte">Perte / Avarie</option>
                        <option value="vol">Manquant / Vol suspecté</option>
                        <option value="erreur_saisie">Erreur de saisie précédente</option>
                        <option value="autre">Autre motif</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarques générales</label>
            <input
              type="text"
              placeholder="Ex: Inventaire mensuel fin de période..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting} className="font-bold shadow-sm">
              Enregistrer l'Inventaire
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, getOfflineVentes } from '../lib/api';
import { isSQLiteAvailable, sqliteGetVentes } from '../lib/sqlite';
import { formatFCFA, formatDateTime } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import {
  ShoppingCart,
  PlusCircle,
  Eye,
  XCircle,
  Printer,
  Search,
  Filter,
  Trash2,
  Calendar,
  RotateCcw,
} from 'lucide-react';

export const VentesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [ventes, setVentes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [referenceSearch, setReferenceSearch] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [selectedVente, setSelectedVente] = useState<any>(null);
  const [annulerModalOpen, setAnnulerModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [venteToDelete, setVenteToDelete] = useState<any>(null);
  const [motifAnnulation, setMotifAnnulation] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchVentes = async () => {
    setLoading(true);
    // 1. Charger d'abord depuis SQLite si disponible
    if (isSQLiteAvailable()) {
      try {
        const sqlVentes = await sqliteGetVentes(50);
        if (sqlVentes && sqlVentes.length > 0) {
          setVentes(sqlVentes);
          setTotal(sqlVentes.length);
        }
      } catch (sqlErr) {
        console.warn('SQLite fetch ventes:', sqlErr);
      }
    } else {
      // Sur PC web : vérifier les ventes hors-ligne créées localement
      const offlineVentes = getOfflineVentes();
      if (offlineVentes && offlineVentes.length > 0) {
        setVentes(offlineVentes);
        setTotal(offlineVentes.length);
      }
    }

    // 2. Synchroniser avec PostgreSQL via l'API si connecté
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
      });
      if (referenceSearch) params.append('reference', referenceSearch);
      if (statutFilter) params.append('statut', statutFilter);
      if (dateDebut) params.append('dateDebut', dateDebut);
      if (dateFin) params.append('dateFin', dateFin);

      const res = await api.get(`/ventes?${params.toString()}`);
      if (res.data?.success) {
        setVentes(res.data.data);
        setTotal(res.data.pagination?.total || 0);
      }
    } catch (err) {
      console.warn('Erreur chargement ventes serveur (mode hors-ligne):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVentes();
  }, [page, statutFilter, dateDebut, dateFin]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchVentes();
  };

  const handleResetFilters = () => {
    setReferenceSearch('');
    setStatutFilter('');
    setDateDebut('');
    setDateFin('');
    setPage(1);
  };

  const handleAnnulerVente = async () => {
    if (!selectedVente || !motifAnnulation.trim()) return;
    setActionLoading(true);
    try {
      const res = await api.put(`/ventes/${selectedVente.id}/annuler`, {
        motif: motifAnnulation,
      });
      if (res.data?.success) {
        setAnnulerModalOpen(false);
        setMotifAnnulation('');
        setSelectedVente(null);
        fetchVentes();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de l\'annulation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteVente = async () => {
    if (!venteToDelete) return;
    setActionLoading(true);
    try {
      const res = await api.delete(`/ventes/${venteToDelete.id}`);
      if (res.data?.success) {
        setDeleteModalOpen(false);
        setVenteToDelete(null);
        fetchVentes();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">Historique des Ventes</h1>
          <p className="text-xs text-slate-500 hidden sm:block">Tickets émis, règlements et gestion des annulations</p>
        </div>
        <Link to="/ventes/nouvelle" className="shrink-0">
          <Button
            variant="primary"
            size="sm"
            icon={<PlusCircle className="h-4 w-4" />}
            className="font-serif font-bold text-xs sm:text-sm shadow-xs whitespace-nowrap min-h-[40px] px-3.5"
          >
            Nouvelle Vente
          </Button>
        </Link>
      </div>

      {/* Barre de Recherche et Filtres */}
      <Card className="p-3">
        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par référence (ex: VTE-...)"
              value={referenceSearch}
              onChange={(e) => setReferenceSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statutFilter}
              onChange={(e) => {
                setStatutFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
            >
              <option value="">Tous les statuts</option>
              <option value="validee">Validées</option>
              <option value="annulee">Annulées</option>
            </select>

            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <span className="text-[11px] text-slate-500 font-medium">Du:</span>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => {
                  setDateDebut(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-transparent border-0 p-0 focus:outline-none focus:ring-0 text-slate-700"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
              <span className="text-[11px] text-slate-500 font-medium">Au:</span>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => {
                  setDateFin(e.target.value);
                  setPage(1);
                }}
                className="text-xs bg-transparent border-0 p-0 focus:outline-none focus:ring-0 text-slate-700"
              />
            </div>

            <Button type="submit" variant="secondary" size="sm">
              Filtrer
            </Button>

            {(referenceSearch || statutFilter || dateDebut || dateFin) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                icon={<RotateCcw className="h-3.5 w-3.5 text-slate-500" />}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Réinit
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* Tableau des Ventes */}
      <Card className="overflow-hidden p-0 border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 sm:px-4 py-2.5">Référence & Date</th>
                <th className="px-3 sm:px-4 py-2.5">Client</th>
                <th className="px-3 sm:px-4 py-2.5">Articles</th>
                <th className="px-3 sm:px-4 py-2.5 text-right">Total</th>
                <th className="px-3 sm:px-4 py-2.5 text-right">Payé</th>
                <th className="px-3 sm:px-4 py-2.5 text-right">Reste</th>
                <th className="px-3 sm:px-4 py-2.5 text-center">Statut</th>
                <th className="px-3 sm:px-4 py-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    Chargement des ventes...
                  </td>
                </tr>
              ) : ventes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    Aucune vente trouvée
                  </td>
                </tr>
              ) : (
                ventes.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 font-mono text-xs">{v.reference}</div>
                      <div className="text-xs text-slate-500">{formatDateTime(v.dateVente)}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      {v.client ? (
                        <div>
                          <div className="font-medium text-slate-800">{v.client.nom} {v.client.prenom || ''}</div>
                          <div className="text-xs text-slate-400">{v.client.telephone || ''}</div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-xs">Comptant</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-xs text-slate-600">
                        {v.details?.length || 0} ligne(s)
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                      {formatFCFA(v.montantTotal)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-emerald-700 font-semibold">
                      {formatFCFA(v.montantPaye)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {Number(v.resteAPayer) > 0 ? (
                        <span className="font-bold text-rose-600">{formatFCFA(v.resteAPayer)}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant={v.statut === 'validee' ? 'success' : 'danger'}>
                        {v.statut === 'validee' ? 'Validée' : 'Annulée'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedVente(v)}
                          title="Détails de la vente"
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {v.statut === 'validee' && (
                          <button
                            onClick={() => {
                              setSelectedVente(v);
                              setAnnulerModalOpen(true);
                            }}
                            title="Annuler cette vente"
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}

                        {hasRole('Administrateur') && (
                          <button
                            onClick={() => {
                              setVenteToDelete(v);
                              setDeleteModalOpen(true);
                            }}
                            title={v.statut === 'validee' ? "Annuler d'abord pour supprimer" : "Supprimer définitivement"}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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

        {/* Pagination Réutilisable */}
        <Pagination
          currentPage={page}
          totalPages={Math.ceil(total / 15) || 1}
          totalItems={total}
          itemsPerPage={15}
          onPageChange={setPage}
        />
      </Card>

      {/* MODAL DÉTAILS DE LA VENTE */}
      <Modal
        isOpen={Boolean(selectedVente) && !annulerModalOpen}
        onClose={() => setSelectedVente(null)}
        title={`Détails Vente ${selectedVente?.reference || ''}`}
        maxWidth="lg"
      >
        {selectedVente && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-500">Date:</span>{' '}
                <span className="font-semibold">{formatDateTime(selectedVente.dateVente)}</span>
              </div>
              <div>
                <span className="text-slate-500">Vendeur:</span>{' '}
                <span className="font-semibold">
                  {selectedVente.utilisateur?.prenom} {selectedVente.utilisateur?.nom}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Client:</span>{' '}
                <span className="font-semibold">
                  {selectedVente.client ? `${selectedVente.client.nom} ${selectedVente.client.prenom || ''}` : 'Vente Comptant'}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Statut:</span>{' '}
                <Badge variant={selectedVente.statut === 'validee' ? 'success' : 'danger'}>
                  {selectedVente.statut}
                </Badge>
              </div>
            </div>

            {/* Lignes de la vente */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-700 mb-2">Articles Vendus</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 font-semibold text-slate-700">
                    <tr>
                      <th className="p-2.5">Désignation</th>
                      <th className="p-2.5 text-center">Quantité</th>
                      <th className="p-2.5 text-right">Prix Unitaire</th>
                      <th className="p-2.5 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedVente.details?.map((d: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-medium">{d.produit?.nom || 'Pani'} ({d.tarif?.designation || 'Tarif'})</td>
                        <td className="p-2.5 text-center font-bold">{d.quantite}</td>
                        <td className="p-2.5 text-right">{formatFCFA(d.prixUnitaire)}</td>
                        <td className="p-2.5 text-right font-bold">{formatFCFA(d.montant)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totaux */}
            <div className="p-3 bg-slate-100 rounded-lg space-y-1.5 text-xs font-semibold">
              <div className="flex justify-between text-slate-700">
                <span>Total Vente:</span>
                <span className="text-sm font-bold text-slate-900">{formatFCFA(selectedVente.montantTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Montant Encaissé:</span>
                <span>{formatFCFA(selectedVente.montantPaye)}</span>
              </div>
              {Number(selectedVente.resteAPayer) > 0 && (
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Dette Client (Reste):</span>
                  <span>{formatFCFA(selectedVente.resteAPayer)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="md"
                onClick={() => window.print()}
                icon={<Printer className="h-4 w-4" />}
                className="font-serif font-bold text-sm"
              >
                Imprimer Ticket
              </Button>
              <Button variant="secondary" size="md" onClick={() => setSelectedVente(null)} className="font-serif font-bold text-sm shadow-sm">
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL ANNULATION DE VENTE */}
      <Modal
        isOpen={annulerModalOpen}
        onClose={() => setAnnulerModalOpen(false)}
        title="Annuler la Vente"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            L'annulation d'une vente est une opération <strong className="text-rose-600">traçable</strong> qui réintégrera automatiquement les marchandises dans le stock.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Motif obligatoire de l'annulation :
            </label>
            <textarea
              rows={3}
              required
              placeholder="Ex: Erreur de saisie caisse, retour marchandise par le client..."
              value={motifAnnulation}
              onChange={(e) => setMotifAnnulation(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" onClick={() => setAnnulerModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleAnnulerVente}
              isLoading={actionLoading}
              disabled={!motifAnnulation.trim()}
              className="font-bold shadow-sm"
            >
              Confirmer l'annulation
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL SUPPRESSION DÉFINITIVE DE VENTE */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setVenteToDelete(null);
        }}
        title="Supprimer la Vente"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700">
            Êtes-vous sûr de vouloir supprimer définitivement la vente <strong className="font-mono text-rose-600">{venteToDelete?.reference}</strong> ?
          </p>
          {venteToDelete?.statut === 'validee' ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
              ⚠️ <strong>Attention :</strong> Cette vente est actuellement <strong>Validée</strong>. Veuillez d'abord l'annuler pour régulariser les stocks et la caisse avant de pouvoir la purger définitivement.
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Cette action est irréversible. L'enregistrement et les lignes associées seront effacés de la base de données.
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setDeleteModalOpen(false);
                setVenteToDelete(null);
              }}
            >
              Annuler
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleDeleteVente}
              isLoading={actionLoading}
              disabled={venteToDelete?.statut === 'validee'}
              className="font-bold shadow-sm"
            >
              Supprimer définitivement
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

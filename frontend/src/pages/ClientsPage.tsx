import React, { useState, useEffect } from 'react';
import { api, saveOfflineClient, getOfflineClients } from '../lib/api';
import { isSQLiteAvailable, sqliteCreateLocalClient, sqliteGetClients } from '../lib/sqlite';
import { pushLocalChanges } from '../lib/sync';
import { formatFCFA, formatDate } from '../lib/formatters';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import {
  Users,
  PlusCircle,
  Search,
  Phone,
  MapPin,
  Banknote,
  FileSpreadsheet,
  AlertCircle,
  Pencil,
  Trash2,
  Filter,
} from 'lucide-react';

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 12;
  const [loading, setLoading] = useState(true);

  // Filtres
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [detteFilter, setDetteFilter] = useState<'all' | 'avecDette' | 'sansDette'>('all');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [paiementModalOpen, setPaiementModalOpen] = useState(false);
  const [releveModalOpen, setReleveModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [releveData, setReleveData] = useState<any>(null);

  // Form Création Client
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [typeClient, setTypeClient] = useState('particulier');
  const [clientError, setClientError] = useState<string | null>(null);

  // Form Édition Client
  const [editNom, setEditNom] = useState('');
  const [editPrenom, setEditPrenom] = useState('');
  const [editTelephone, setEditTelephone] = useState('');
  const [editAdresse, setEditAdresse] = useState('');
  const [editTypeClient, setEditTypeClient] = useState('particulier');
  const [editClientError, setEditClientError] = useState<string | null>(null);

  // Form Paiement
  const [montantPaiement, setMontantPaiement] = useState('');
  const [modePaiement, setModePaiement] = useState('especes');
  const [notesPaiement, setNotesPaiement] = useState('');
  const [paiementError, setPaiementError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async () => {
    setLoading(true);

    if (isSQLiteAvailable()) {
      try {
        const sqlClients = await sqliteGetClients();
        if (sqlClients && sqlClients.length > 0) {
          setClients(sqlClients);
          setTotal(sqlClients.length);
        }
      } catch (sqlErr) {
        console.warn('SQLite fetch clients:', sqlErr);
      }
    } else {
      const offlineClients = getOfflineClients();
      if (offlineClients && offlineClients.length > 0) {
        setClients(offlineClients);
        setTotal(offlineClients.length);
      }
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search.trim()) params.append('search', search.trim());
      if (typeFilter) params.append('typeClient', typeFilter);
      if (detteFilter === 'avecDette') params.append('avecDette', 'true');
      if (detteFilter === 'sansDette') params.append('avecDette', 'false');

      const res = await api.get(`/clients?${params.toString()}`);
      if (res.data?.success) {
        setClients(res.data.data);
        setTotal(res.data.pagination?.total || res.data.data.length);
      }
    } catch (err) {
      console.warn('Erreur chargement clients serveur (mode hors-ligne):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [page, typeFilter, detteFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchClients();
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    setSubmitting(true);
    setClientError(null);
    const clientPayload = { nom, prenom, telephone, adresse, typeClient };

    try {
      const res = await api.post('/clients', clientPayload);
      if (res.data?.success) {
        setCreateModalOpen(false);
        setNom('');
        setPrenom('');
        setTelephone('');
        setAdresse('');
        await fetchClients();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      const isOfflineErr = !err.response || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';
      if (isOfflineErr) {
        if (isSQLiteAvailable()) {
          try {
            await sqliteCreateLocalClient(clientPayload);
          } catch (_) {}
        } else {
          saveOfflineClient(clientPayload);
        }
        setCreateModalOpen(false);
        setNom('');
        setPrenom('');
        setTelephone('');
        setAdresse('');
        await fetchClients();
        window.dispatchEvent(new Event('pani:data-changed'));
        pushLocalChanges().catch(() => {});
      } else {
        setClientError(err.response?.data?.message || 'Erreur lors de la création');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (c: any) => {
    setSelectedClient(c);
    setEditNom(c.nom || '');
    setEditPrenom(c.prenom || '');
    setEditTelephone(c.telephone || '');
    setEditAdresse(c.adresse || '');
    setEditTypeClient(c.typeClient || 'particulier');
    setEditClientError(null);
    setEditModalOpen(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !editNom.trim()) return;

    setSubmitting(true);
    setEditClientError(null);

    try {
      const res = await api.put(`/clients/${selectedClient.id}`, {
        nom: editNom,
        prenom: editPrenom,
        telephone: editTelephone,
        adresse: editAdresse,
        typeClient: editTypeClient,
      });

      if (res.data?.success) {
        setEditModalOpen(false);
        setSelectedClient(null);
        await fetchClients();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      setEditClientError(err.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClient = async (c: any) => {
    if (c.aDette) {
      alert(`Attention : ce client a une dette de ${formatFCFA(c.totalDette)}. Réglez la dette avant de supprimer la fiche.`);
      return;
    }
    if (!window.confirm(`Confirmez-vous la suppression de la fiche client ${c.nom} ${c.prenom || ''} ?`)) {
      return;
    }

    try {
      const res = await api.delete(`/clients/${c.id}`);
      if (res.data?.success) {
        await fetchClients();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleEnregistrerPaiement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !montantPaiement) return;

    const montantNum = Number(montantPaiement);
    if (montantNum <= 0) {
      setPaiementError('Le montant doit être supérieur à zéro');
      return;
    }

    setSubmitting(true);
    setPaiementError(null);

    try {
      const res = await api.post(`/clients/${selectedClient.id}/paiements`, {
        montant: montantNum,
        modePaiement,
        notes: notesPaiement,
      });

      if (res.data?.success) {
        setPaiementModalOpen(false);
        setMontantPaiement('');
        setNotesPaiement('');
        setSelectedClient(null);
        await fetchClients();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      setPaiementError(err.response?.data?.message || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoirReleve = async (client: any) => {
    setSelectedClient(client);
    try {
      const res = await api.get(`/clients/${client.id}/releve`);
      if (res.data?.success) {
        setReleveData(res.data.data);
        setReleveModalOpen(true);
      }
    } catch (err) {
      alert('Erreur lors de la récupération du relevé client');
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const countAvecDette = clients.filter((c) => c.aDette).length;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">Clients & Créances</h1>
          <p className="text-xs text-slate-500 hidden sm:block">Gestion des fiches clients, suivi des dettes et encaissements</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          icon={<PlusCircle className="h-4 w-4" />}
          className="shrink-0 font-serif font-bold text-xs sm:text-sm whitespace-nowrap min-h-[40px] px-3.5"
        >
          <span className="hidden sm:inline">Nouveau Client</span>
          <span className="sm:hidden">Client</span>
        </Button>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, prénom ou téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 font-serif"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white font-serif"
            >
              <option value="">Tous types</option>
              <option value="particulier">Particulier</option>
              <option value="grossiste">Grossiste / Revendeur</option>
              <option value="entreprise">Entreprise</option>
            </select>

            <Button variant="primary" size="sm" type="submit" className="font-serif text-xs px-3">
              Rechercher
            </Button>
            {(search || typeFilter || detteFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setTypeFilter('');
                  setDetteFilter('all');
                  setPage(1);
                }}
                className="text-xs text-rose-600 hover:underline px-1 font-bold shrink-0"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </form>

        {/* Filtres par Situation de Dette */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setDetteFilter('all');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                detteFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Tous ({total})
            </button>
            <button
              onClick={() => {
                setDetteFilter('avecDette');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                detteFilter === 'avecDette'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-slate-50 text-rose-700 border border-rose-200 hover:bg-rose-50'
              }`}
            >
              Avec dettes
            </button>
            <button
              onClick={() => {
                setDetteFilter('sansDette');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                detteFilter === 'sansDette'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              À jour (Sans dette)
            </button>
          </div>

          <div className="text-xs text-amber-800 font-medium">
            {countAvecDette} client(s) ont un solde débiteur sur cette page
          </div>
        </div>
      </div>

      {/* Grille des Clients */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-serif">Chargement des fiches clients...</div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200 font-serif">
          Aucun client trouvé pour ces critères
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {clients.map((c) => (
            <Card key={c.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-base truncate">
                      {c.nom} {c.prenom || ''}
                    </h3>
                    <Badge variant={c.typeClient === 'grossiste' ? 'info' : 'neutral'} size="sm">
                      {c.typeClient}
                    </Badge>
                  </div>
                  {c.aDette ? (
                    <Badge variant="danger" size="sm" className="shrink-0 font-bold">
                      Dette : {formatFCFA(c.totalDette)}
                    </Badge>
                  ) : (
                    <Badge variant="success" size="sm" className="shrink-0">
                      À jour
                    </Badge>
                  )}
                </div>

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  {c.telephone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{c.telephone}</span>
                    </div>
                  )}
                  {c.adresse && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{c.adresse}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions de la carte */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVoirReleve(c)}
                  icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
                  className="flex-1 text-xs"
                >
                  Relevé
                </Button>

                {c.aDette && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedClient(c);
                      setMontantPaiement(c.totalDette.toString());
                      setPaiementModalOpen(true);
                    }}
                    icon={<Banknote className="h-3.5 w-3.5" />}
                    className="flex-1 text-xs shadow-xs"
                  >
                    Régler
                  </Button>
                )}

                <button
                  type="button"
                  onClick={() => openEditModal(c)}
                  title="Modifier la fiche client"
                  className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteClient(c)}
                  title="Supprimer le client"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
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

      {/* MODAL CRÉER CLIENT */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setClientError(null);
        }}
        title="Créer une Fiche Client"
        maxWidth="md"
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          {clientError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {clientError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom de famille *</label>
              <input
                type="text"
                required
                placeholder="Ex: Traoré"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom(s)</label>
              <input
                type="text"
                placeholder="Ex: Moussa"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
              <input
                type="tel"
                placeholder="Ex: 77 123 45 67"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type de Client</label>
              <select
                value={typeClient}
                onChange={(e) => setTypeClient(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600"
              >
                <option value="particulier">Particulier</option>
                <option value="grossiste">Grossiste</option>
                <option value="entreprise">Entreprise</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse ou Localisation</label>
            <input
              type="text"
              placeholder="Ex: Marché Central, Boutique n°4"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setCreateModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting} className="font-bold shadow-sm">
              Enregistrer le Client
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL MODIFIER CLIENT */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditClientError(null);
        }}
        title="Modifier la Fiche Client"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateClient} className="space-y-4">
          {editClientError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {editClientError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom *</label>
              <input
                type="text"
                required
                value={editNom}
                onChange={(e) => setEditNom(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom(s)</label>
              <input
                type="text"
                value={editPrenom}
                onChange={(e) => setEditPrenom(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={editTelephone}
                onChange={(e) => setEditTelephone(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type de Client</label>
              <select
                value={editTypeClient}
                onChange={(e) => setEditTypeClient(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600"
              >
                <option value="particulier">Particulier</option>
                <option value="grossiste">Grossiste</option>
                <option value="entreprise">Entreprise</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse</label>
            <input
              type="text"
              value={editAdresse}
              onChange={(e) => setEditAdresse(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setEditModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting} className="font-bold shadow-sm">
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL PAIEMENT DE DETTE */}
      <Modal
        isOpen={paiementModalOpen}
        onClose={() => {
          setPaiementModalOpen(false);
          setPaiementError(null);
        }}
        title={`Règlement Dette — ${selectedClient?.nom} ${selectedClient?.prenom || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handleEnregistrerPaiement} className="space-y-4">
          {paiementError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {paiementError}
            </div>
          )}

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900 text-xs flex justify-between items-center">
            <span>Dette Totale Actuelle :</span>
            <span className="font-bold text-sm text-rose-600">{formatFCFA(selectedClient?.totalDette || 0)}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Montant Encaissé (F CFA) *</label>
            <input
              type="number"
              required
              min="1"
              value={montantPaiement}
              onChange={(e) => setMontantPaiement(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mode d'encaissement</label>
            <select
              value={modePaiement}
              onChange={(e) => setModePaiement(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600"
            >
              <option value="especes">Espèces (Tiroir-Caisse)</option>
              <option value="orange_money">Orange Money</option>
              <option value="wave">Wave</option>
              <option value="virement">Virement bancaire</option>
              <option value="cheque">Chèque</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Référence du reçu</label>
            <input
              type="text"
              placeholder="Ex: Acompte sur livraison d'hier..."
              value={notesPaiement}
              onChange={(e) => setNotesPaiement(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setPaiementModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting} className="font-bold shadow-sm">
              Valider l'Encaissement
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL RELEVÉ CLIENT */}
      <Modal
        isOpen={releveModalOpen}
        onClose={() => setReleveModalOpen(false)}
        title={`Relevé de Compte — ${releveData?.client?.nom} ${releveData?.client?.prenom || ''}`}
        maxWidth="lg"
      >
        {releveData && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Total Ventes</div>
                <div className="font-bold text-slate-900 text-sm">{formatFCFA(releveData.recapitulatif?.totalVentes)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Total Payé</div>
                <div className="font-bold text-emerald-600 text-sm">{formatFCFA(releveData.recapitulatif?.totalPaye)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Solde Débiteur</div>
                <div className="font-bold text-rose-600 text-sm">{formatFCFA(releveData.recapitulatif?.resteAPayer)}</div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase mb-2">Historique des Ventes</h4>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2">Date & Réf</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-right">Payé</th>
                      <th className="p-2 text-right">Reste</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {releveData.ventes?.map((v: any) => (
                      <tr key={v.id}>
                        <td className="p-2">
                          <div className="font-mono">{v.reference}</div>
                          <div className="text-[10px] text-slate-400">{formatDate(v.dateVente)}</div>
                        </td>
                        <td className="p-2 text-right font-medium">{formatFCFA(v.montantTotal)}</td>
                        <td className="p-2 text-right text-emerald-600">{formatFCFA(v.montantPaye)}</td>
                        <td className="p-2 text-right font-bold text-rose-600">{formatFCFA(v.resteAPayer)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setReleveModalOpen(false)}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

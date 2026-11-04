import React, { useState, useEffect } from 'react';
import { api, saveOfflineFournisseur, getOfflineFournisseurs } from '../lib/api';
import { isSQLiteAvailable, sqliteCreateLocalFournisseur, sqliteUpsertFournisseur, sqliteGetFournisseurs } from '../lib/sqlite';
import { pushLocalChanges } from '../lib/sync';
import { formatFCFA, formatDate } from '../lib/formatters';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import {
  Truck,
  PlusCircle,
  Phone,
  MapPin,
  Banknote,
  FileSpreadsheet,
  WifiOff,
  Search,
  Pencil,
  Trash2,
} from 'lucide-react';

export const FournisseursPage: React.FC = () => {
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 12;
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Filtres
  const [search, setSearch] = useState('');
  const [detteFilter, setDetteFilter] = useState<'all' | 'avecDette' | 'sansDette'>('all');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [paiementModalOpen, setPaiementModalOpen] = useState(false);
  const [releveModalOpen, setReleveModalOpen] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState<any>(null);
  const [releveData, setReleveData] = useState<any>(null);

  // Form Création Fournisseur
  const [nom, setNom] = useState('');
  const [contact, setContact] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [email, setEmail] = useState('');
  const [fournisseurError, setFournisseurError] = useState<string | null>(null);

  // Form Édition Fournisseur
  const [editNom, setEditNom] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editTelephone, setEditTelephone] = useState('');
  const [editAdresse, setEditAdresse] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editFournisseurError, setEditFournisseurError] = useState<string | null>(null);

  // Form Paiement
  const [montantPaiement, setMontantPaiement] = useState('');
  const [modePaiement, setModePaiement] = useState('especes');
  const [notesPaiement, setNotesPaiement] = useState('');
  const [paiementError, setPaiementError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchFournisseurs = async () => {
    setLoading(true);

    if (isSQLiteAvailable()) {
      try {
        const sqlFournisseurs = await sqliteGetFournisseurs();
        if (sqlFournisseurs && sqlFournisseurs.length > 0) {
          setFournisseurs(sqlFournisseurs);
          setTotal(sqlFournisseurs.length);
        }
      } catch (e) {
        console.warn('[Fournisseurs] Lecture locale SQLite:', e);
      }
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search.trim()) params.append('search', search.trim());
      if (detteFilter === 'avecDette') params.append('avecDette', 'true');
      if (detteFilter === 'sansDette') params.append('avecDette', 'false');

      const res = await api.get(`/fournisseurs?${params.toString()}`);
      if (res.data?.success) {
        setFournisseurs(res.data.data);
        setTotal(res.data.pagination?.total || res.data.data.length);
        setIsOffline(false);
      }
    } catch (err) {
      console.warn('Erreur chargement fournisseurs serveur:', err);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFournisseurs();
  }, [page, detteFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchFournisseurs();
  };

  const handleCreateFournisseur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    setSubmitting(true);
    setFournisseurError(null);
    const payload = { nom, contact, telephone, adresse, email };

    try {
      const res = await api.post('/fournisseurs', payload);
      if (res.data?.success) {
        setCreateModalOpen(false);
        setNom('');
        setContact('');
        setTelephone('');
        setAdresse('');
        setEmail('');
        await fetchFournisseurs();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      const isOfflineErr = !err.response || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';
      if (isOfflineErr) {
        if (isSQLiteAvailable()) {
          try {
            await sqliteCreateLocalFournisseur(payload);
          } catch (_) {}
        } else {
          saveOfflineFournisseur(payload);
        }
        setCreateModalOpen(false);
        setNom('');
        setContact('');
        setTelephone('');
        setAdresse('');
        setEmail('');
        await fetchFournisseurs();
        window.dispatchEvent(new Event('pani:data-changed'));
        pushLocalChanges().catch(() => {});
      } else {
        setFournisseurError(err.response?.data?.message || 'Erreur lors de la création du fournisseur');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (f: any) => {
    setSelectedFournisseur(f);
    setEditNom(f.nom || '');
    setEditContact(f.contact || '');
    setEditTelephone(f.telephone || '');
    setEditAdresse(f.adresse || '');
    setEditEmail(f.email || '');
    setEditFournisseurError(null);
    setEditModalOpen(true);
  };

  const handleUpdateFournisseur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFournisseur || !editNom.trim()) return;

    setSubmitting(true);
    setEditFournisseurError(null);

    try {
      const res = await api.put(`/fournisseurs/${selectedFournisseur.id}`, {
        nom: editNom,
        contact: editContact,
        telephone: editTelephone,
        adresse: editAdresse,
        email: editEmail,
      });

      if (res.data?.success) {
        setEditModalOpen(false);
        setSelectedFournisseur(null);
        await fetchFournisseurs();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      setEditFournisseurError(err.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFournisseur = async (f: any) => {
    if (f.aDette || Number(f.totalDette || 0) > 0) {
      alert(`Attention : vous avez une dette en cours de ${formatFCFA(f.totalDette)} envers ce fournisseur. Réglez le solde avant de supprimer la fiche.`);
      return;
    }
    if (!window.confirm(`Confirmez-vous la suppression du fournisseur ${f.nom} ?`)) {
      return;
    }

    try {
      const res = await api.delete(`/fournisseurs/${f.id}`);
      if (res.data?.success) {
        await fetchFournisseurs();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const handleEnregistrerPaiement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFournisseur || !montantPaiement) return;

    const montantNum = Number(montantPaiement);
    if (montantNum <= 0) {
      setPaiementError('Le montant doit être supérieur à zéro');
      return;
    }

    setSubmitting(true);
    setPaiementError(null);

    try {
      const res = await api.post(`/fournisseurs/${selectedFournisseur.id}/paiements`, {
        montant: montantNum,
        modePaiement,
        notes: notesPaiement,
      });

      if (res.data?.success) {
        setPaiementModalOpen(false);
        setMontantPaiement('');
        setNotesPaiement('');
        setSelectedFournisseur(null);
        await fetchFournisseurs();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      setPaiementError(err.response?.data?.message || 'Erreur lors de l\'enregistrement du paiement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoirReleve = async (fournisseur: any) => {
    setSelectedFournisseur(fournisseur);
    try {
      const res = await api.get(`/fournisseurs/${fournisseur.id}/releve`);
      if (res.data?.success) {
        setReleveData(res.data.data);
        setReleveModalOpen(true);
      }
    } catch (err) {
      alert('Erreur lors de la récupération du relevé fournisseur');
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">Fournisseurs & Dettes</h1>
          <p className="text-xs text-slate-500 hidden sm:block">Partenaires d'approvisionnement, livraisons et suivi des règlements</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          icon={<PlusCircle className="h-4 w-4" />}
          className="shrink-0 font-serif font-bold text-xs sm:text-sm whitespace-nowrap min-h-[40px] px-3.5"
        >
          <span className="hidden sm:inline">Nouveau Fournisseur</span>
          <span className="sm:hidden">Fournisseur</span>
        </Button>
      </div>

      {isOffline && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-900 text-xs">
          <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
          <span>Mode local actif — les modifications seront synchronisées dès rétablissement de la connexion.</span>
        </div>
      )}

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, contact ou téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 font-serif"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" type="submit" className="font-serif text-xs px-3">
              Rechercher
            </Button>
            {(search || detteFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
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
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
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
            Avec dettes en cours
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
            À jour (Soldé)
          </button>
        </div>
      </div>

      {/* Grille des Fournisseurs */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 font-serif">Chargement des fiches fournisseurs...</div>
      ) : fournisseurs.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200 font-serif">
          Aucun fournisseur trouvé pour ces critères
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {fournisseurs.map((f) => (
            <Card key={f.id} className="flex flex-col justify-between hover:shadow-md transition-shadow p-3.5 sm:p-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">{f.nom}</h3>
                    {f.contact && <div className="text-xs text-slate-500 truncate">Contact: {f.contact}</div>}
                  </div>
                  {f.aDette || Number(f.totalDette || 0) > 0 ? (
                    <Badge variant="danger" size="xs" className="shrink-0 font-bold">
                      Dette : {formatFCFA(f.totalDette)}
                    </Badge>
                  ) : (
                    <Badge variant="success" size="xs" className="shrink-0">
                      À jour
                    </Badge>
                  )}
                </div>

                <div className="mt-2.5 space-y-1 text-xs text-slate-500">
                  {f.telephone && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{f.telephone}</span>
                    </div>
                  )}
                  {f.adresse && (
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{f.adresse}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions de la carte */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleVoirReleve(f)}
                  icon={<FileSpreadsheet className="h-3 w-3" />}
                  className="flex-1"
                >
                  Relevé
                </Button>

                {(f.aDette || Number(f.totalDette || 0) > 0) && (
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => {
                      setSelectedFournisseur(f);
                      setMontantPaiement(f.totalDette.toString());
                      setPaiementModalOpen(true);
                    }}
                    icon={<Banknote className="h-3 w-3" />}
                    className="flex-1 shadow-xs"
                  >
                    Payer
                  </Button>
                )}

                <button
                  type="button"
                  onClick={() => openEditModal(f)}
                  title="Modifier la fiche fournisseur"
                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteFournisseur(f)}
                  title="Supprimer le fournisseur"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
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

      {/* MODAL CRÉER FOURNISSEUR */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setFournisseurError(null);
        }}
        title="Nouveau Fournisseur"
        maxWidth="md"
      >
        <form onSubmit={handleCreateFournisseur} className="space-y-4">
          {fournisseurError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {fournisseurError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nom du Fournisseur / Société *</label>
            <input
              type="text"
              required
              placeholder="Ex: Minoterie du Mali, Distributeur Farine SARL..."
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom du Contact</label>
              <input
                type="text"
                placeholder="Ex: M. Diallo"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
              <input
                type="tel"
                placeholder="Ex: 76 00 00 00"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse</label>
              <input
                type="text"
                placeholder="Ex: Zone Industrielle"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                placeholder="Ex: contact@fournisseur.ml"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setCreateModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting} className="font-bold shadow-sm">
              Enregistrer le Fournisseur
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL MODIFIER FOURNISSEUR */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditFournisseurError(null);
        }}
        title="Modifier la Fiche Fournisseur"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateFournisseur} className="space-y-4">
          {editFournisseurError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {editFournisseurError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nom du Fournisseur *</label>
            <input
              type="text"
              required
              value={editNom}
              onChange={(e) => setEditNom(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact</label>
              <input
                type="text"
                value={editContact}
                onChange={(e) => setEditContact(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={editTelephone}
                onChange={(e) => setEditTelephone(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse</label>
              <input
                type="text"
                value={editAdresse}
                onChange={(e) => setEditAdresse(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
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

      {/* MODAL PAIEMENT FOURNISSEUR */}
      <Modal
        isOpen={paiementModalOpen}
        onClose={() => {
          setPaiementModalOpen(false);
          setPaiementError(null);
        }}
        title={`Règlement Dette — ${selectedFournisseur?.nom}`}
        maxWidth="md"
      >
        <form onSubmit={handleEnregistrerPaiement} className="space-y-4">
          {paiementError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {paiementError}
            </div>
          )}

          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900 text-xs flex justify-between items-center">
            <span>Dette Fournisseur en cours :</span>
            <span className="font-bold text-sm text-rose-600">{formatFCFA(selectedFournisseur?.totalDette || 0)}</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Montant Payé (F CFA) *</label>
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mode de décaissement</label>
            <select
              value={modePaiement}
              onChange={(e) => setModePaiement(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600"
            >
              <option value="especes">Espèces (Tiroir-Caisse)</option>
              <option value="virement">Virement bancaire</option>
              <option value="cheque">Chèque</option>
              <option value="orange_money">Orange Money</option>
              <option value="wave">Wave</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / N° Reçu de décharge</label>
            <input
              type="text"
              placeholder="Ex: Paiement facture livraison n°..."
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
              Valider le Décaissement
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL RELEVÉ FOURNISSEUR */}
      <Modal
        isOpen={releveModalOpen}
        onClose={() => setReleveModalOpen(false)}
        title={`Relevé de Compte — ${releveData?.fournisseur?.nom}`}
        maxWidth="lg"
      >
        {releveData && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Total Commandes</div>
                <div className="font-bold text-slate-900 text-sm">{formatFCFA(releveData.recapitulatif?.totalAchats)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Total Réglé</div>
                <div className="font-bold text-emerald-600 text-sm">{formatFCFA(releveData.recapitulatif?.totalPaye)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Solde Restant Dû</div>
                <div className="font-bold text-rose-600 text-sm">{formatFCFA(releveData.recapitulatif?.resteAPayer)}</div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase mb-2">Historique des Achats & Livraisons</h4>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="p-2">Date & Réf</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-right">Réglé</th>
                      <th className="p-2 text-right">Dette</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {releveData.achats?.map((a: any) => (
                      <tr key={a.id}>
                        <td className="p-2">
                          <div className="font-mono">{a.reference}</div>
                          <div className="text-[10px] text-slate-400">{formatDate(a.dateAchat)}</div>
                        </td>
                        <td className="p-2 text-right font-medium">{formatFCFA(a.montantTotal)}</td>
                        <td className="p-2 text-right text-emerald-600">{formatFCFA(a.montantPaye)}</td>
                        <td className="p-2 text-right font-bold text-rose-600">{formatFCFA(a.resteAPayer)}</td>
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

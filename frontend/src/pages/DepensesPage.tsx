import React, { useState, useEffect } from 'react';
import { api, saveOfflineDepense, getOfflineDepenses } from '../lib/api';
import { isSQLiteAvailable, sqliteCreateLocalDepense, sqliteUpsertDepense, sqliteGetDepenses } from '../lib/sqlite';
import { pushLocalChanges } from '../lib/sync';
import { formatFCFA, formatDateTime } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import {
  Receipt,
  PlusCircle,
  Paperclip,
  AlertTriangle,
  FileText,
  Upload,
  Search,
  Pencil,
  Trash2,
  Eye,
  Filter,
  X,
} from 'lucide-react';

export const DepensesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [depenses, setDepenses] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 15;
  const [loading, setLoading] = useState(true);

  // Filtres
  const [sansJustifFilter, setSansJustifFilter] = useState(false);
  const [categorieFilter, setCategorieFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  // Modal Création
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [categorie, setCategorie] = useState('transport');
  const [description, setDescription] = useState('');
  const [montant, setMontant] = useState('');
  const [modePaiement, setModePaiement] = useState('especes');
  const [beneficiaire, setBeneficiaire] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal Édition
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDepense, setSelectedDepense] = useState<any>(null);
  const [editCategorie, setEditCategorie] = useState('transport');
  const [editDescription, setEditDescription] = useState('');
  const [editMontant, setEditMontant] = useState('');
  const [editModePaiement, setEditModePaiement] = useState('especes');
  const [editBeneficiaire, setEditBeneficiaire] = useState('');
  const [editFiles, setEditFiles] = useState<FileList | null>(null);

  // Modal Visualisation Justificatif
  const [viewJustifModalOpen, setViewJustifModalOpen] = useState(false);
  const [currentJustif, setCurrentJustif] = useState<any>(null);

  const categories = [
    { value: 'transport', label: 'Transport' },
    { value: 'carburant', label: 'Carburant' },
    { value: 'loyer', label: 'Loyer' },
    { value: 'salaires', label: 'Salaires' },
    { value: 'electricite', label: 'Électricité' },
    { value: 'telephone', label: 'Téléphone / Internet' },
    { value: 'reparation', label: 'Réparation' },
    { value: 'emballage', label: 'Emballage' },
    { value: 'livraison', label: 'Livraison' },
    { value: 'autre', label: 'Autres dépenses' },
  ];

  const fetchDepenses = async () => {
    setLoading(true);

    // 1. Lire d'abord depuis SQLite si disponible (sur mobile)
    if (isSQLiteAvailable()) {
      try {
        const sqlList = await sqliteGetDepenses(50);
        if (sqlList && sqlList.length > 0) {
          setDepenses(sqlList);
          setTotal(sqlList.length);
        }
      } catch (sqlErr) {
        console.warn('SQLite fetch depenses:', sqlErr);
      }
    } else {
      // Sur PC web : vérifier la file d'attente hors-ligne locale
      const offlineList = getOfflineDepenses();
      if (offlineList && offlineList.length > 0) {
        setDepenses(offlineList);
        setTotal(offlineList.length);
      }
    }

    // 2. Synchroniser avec PostgreSQL via l'API si connecté
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (sansJustifFilter) params.append('sansJustificatif', 'true');
      if (categorieFilter) params.append('categorie', categorieFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (dateDebut) params.append('dateDebut', dateDebut);
      if (dateFin) params.append('dateFin', dateFin);

      const res = await api.get(`/depenses?${params.toString()}`);
      if (res.data?.success) {
        setDepenses(res.data.data);
        setTotal(res.data.pagination?.total || res.data.data.length);
      }
    } catch (err) {
      console.warn('Erreur chargement dépenses serveur (mode hors-ligne):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepenses();
  }, [page, sansJustifFilter, categorieFilter, dateDebut, dateFin]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDepenses();
  };

  // Convertit un File en DataURL (Base64) — fonctionne sur mobile et PC
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleCreateDepense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !montant) return;

    setSubmitting(true);
    setErrorMsg(null);

    let justificatifPayload: { dataUrl: string; nomFichier: string; typeFichier: string; tailleFichier: number } | null = null;
    if (files && files.length > 0) {
      try {
        const file = files[0];
        const dataUrl = await fileToDataUrl(file);
        justificatifPayload = {
          dataUrl,
          nomFichier: file.name,
          typeFichier: file.type,
          tailleFichier: file.size,
        };
      } catch (_) {}
    }

    const depenseData: any = {
      categorie,
      description,
      montant: Number(montant),
      modePaiement,
      beneficiaire,
      hasJustificatif: Boolean(justificatifPayload),
      ...(justificatifPayload ? { justificatif: justificatifPayload } : {}),
    };

    try {
      const res = await api.post('/depenses', depenseData);
      if (res.data?.success) {
        setCreateModalOpen(false);
        setDescription('');
        setMontant('');
        setBeneficiaire('');
        setFiles(null);
        await fetchDepenses();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      const isOfflineErr = !err.response || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';
      if (isOfflineErr) {
        const localData = { ...depenseData };
        if (isSQLiteAvailable()) {
          try {
            await sqliteCreateLocalDepense(localData);
          } catch (_) {}
        } else {
          saveOfflineDepense(localData);
        }
        setCreateModalOpen(false);
        setDescription('');
        setMontant('');
        setBeneficiaire('');
        setFiles(null);
        await fetchDepenses();
        window.dispatchEvent(new Event('pani:data-changed'));
        pushLocalChanges().catch(() => {});
      } else {
        setErrorMsg(err.response?.data?.message || 'Erreur lors de l\'enregistrement de la dépense');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (d: any) => {
    setSelectedDepense(d);
    setEditCategorie(d.categorie);
    setEditDescription(d.description);
    setEditMontant(String(d.montant));
    setEditModePaiement(d.modePaiement || 'especes');
    setEditBeneficiaire(d.beneficiaire || '');
    setEditFiles(null);
    setErrorMsg(null);
    setEditModalOpen(true);
  };

  const handleUpdateDepense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepense) return;

    setSubmitting(true);
    setErrorMsg(null);

    let justificatifPayload: any = null;
    if (editFiles && editFiles.length > 0) {
      try {
        const file = editFiles[0];
        const dataUrl = await fileToDataUrl(file);
        justificatifPayload = {
          dataUrl,
          nomFichier: file.name,
          typeFichier: file.type,
          tailleFichier: file.size,
        };
      } catch (_) {}
    }

    const payload: any = {
      categorie: editCategorie,
      description: editDescription,
      montant: Number(editMontant),
      modePaiement: editModePaiement,
      beneficiaire: editBeneficiaire,
    };
    if (justificatifPayload) {
      payload.justificatif = justificatifPayload;
      payload.hasJustificatif = true;
    }

    try {
      const res = await api.put(`/depenses/${selectedDepense.id}`, payload);
      if (res.data?.success) {
        setEditModalOpen(false);
        setSelectedDepense(null);
        await fetchDepenses();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDepense = async (id: number, numero: string) => {
    if (!window.confirm(`Confirmez-vous la suppression de la dépense ${numero} ? Cette action est irréversible.`)) {
      return;
    }

    try {
      const res = await api.delete(`/depenses/${id}`);
      if (res.data?.success) {
        await fetchDepenses();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression de la dépense');
    }
  };

  const openViewJustificatif = (d: any) => {
    const justif = d.justificatifs && d.justificatifs.length > 0 ? d.justificatifs[0] : null;
    if (justif) {
      setCurrentJustif(justif);
      setViewJustifModalOpen(true);
    } else {
      alert('Aucun fichier justificatif disponible.');
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const countSansJustif = depenses.filter((d) => !d.hasJustificatif).length;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">Gestion des Dépenses</h1>
          <p className="text-xs text-slate-500 hidden sm:block">Enregistrement des charges d'exploitation et contrôle des justificatifs</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          icon={<PlusCircle className="h-4 w-4" />}
          className="shrink-0 font-serif font-bold text-xs sm:text-sm whitespace-nowrap min-h-[40px] px-3.5"
        >
          <span className="hidden sm:inline">Nouvelle Dépense</span>
          <span className="sm:hidden">Dépense</span>
        </Button>
      </div>

      {/* Alerte si dépenses sans justificatif */}
      {countSansJustif > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Attention :</strong> {countSansJustif} dépense(s) sans justificatif sur cette page.
            </span>
          </div>
          <button
            onClick={() => {
              setSansJustifFilter(!sansJustifFilter);
              setPage(1);
            }}
            className="text-[11px] font-bold underline hover:text-amber-700 shrink-0"
          >
            {sansJustifFilter ? 'Afficher tout' : 'Filtrer sans justif'}
          </button>
        </div>
      )}

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par description, bénéficiaire, numéro DEP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => {
                setDateDebut(e.target.value);
                setPage(1);
              }}
              className="p-2 text-xs border border-slate-300 rounded-lg font-serif"
              title="Date début"
            />
            <span className="text-xs text-slate-400">à</span>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => {
                setDateFin(e.target.value);
                setPage(1);
              }}
              className="p-2 text-xs border border-slate-300 rounded-lg font-serif"
              title="Date fin"
            />
            <Button variant="primary" size="sm" type="submit" className="font-serif text-xs px-3">
              Filtrer
            </Button>
            {(searchQuery || dateDebut || dateFin || categorieFilter || sansJustifFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDateDebut('');
                  setDateFin('');
                  setCategorieFilter('');
                  setSansJustifFilter(false);
                  setPage(1);
                }}
                className="text-xs text-rose-600 hover:underline px-1 font-bold shrink-0"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </form>

        {/* Filtres par Catégorie */}
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
          <button
            onClick={() => {
              setCategorieFilter('');
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              categorieFilter === ''
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Toutes
          </button>
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setCategorieFilter(cat.value);
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                categorieFilter === cat.value
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau des Dépenses */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3.5">Numéro & Date</th>
                <th className="px-4 py-3.5">Catégorie</th>
                <th className="px-4 py-3.5">Description</th>
                <th className="px-4 py-3.5">Bénéficiaire</th>
                <th className="px-4 py-3.5 text-right">Montant</th>
                <th className="px-4 py-3.5 text-center">Mode</th>
                <th className="px-4 py-3.5 text-center">Justificatif</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 font-serif">
                    Chargement des dépenses...
                  </td>
                </tr>
              ) : depenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400 font-serif">
                    Aucune dépense trouvée
                  </td>
                </tr>
              ) : (
                depenses.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-mono text-xs font-semibold text-slate-900">{d.numero}</div>
                      <div className="text-[11px] text-slate-500">{formatDateTime(d.dateDepense)}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        {d.categorie}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm text-slate-900 font-medium">{d.description}</div>
                      <div className="text-[11px] text-slate-400">
                        Par: {d.utilisateur?.prenom} {d.utilisateur?.nom}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      {d.beneficiaire || '-'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-rose-600 whitespace-nowrap">
                      -{formatFCFA(d.montant)}
                    </td>
                    <td className="px-4 py-3.5 text-center text-xs capitalize text-slate-600 whitespace-nowrap">
                      {d.modePaiement}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      {d.hasJustificatif ? (
                        <button
                          type="button"
                          onClick={() => openViewJustificatif(d)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                          title="Cliquer pour voir le reçu"
                        >
                          <Paperclip className="h-3.5 w-3.5" /> Reçu Joint
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <AlertTriangle className="h-3 w-3" /> Sans Justif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(d)}
                          title="Modifier la dépense"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {hasRole('Administrateur', 'Gestionnaire') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDepense(d.id, d.numero)}
                            title="Supprimer la dépense"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
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

        {/* Pagination intégrée */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={limit}
          onPageChange={(p) => setPage(p)}
        />
      </Card>

      {/* MODAL CRÉER DÉPENSE */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Enregistrer une Nouvelle Dépense"
        maxWidth="md"
      >
        <form onSubmit={handleCreateDepense} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie *</label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
            <input
              type="text"
              required
              placeholder="Ex: Achat carburant livraison moto, facture électricité..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Montant (F CFA) *</label>
              <input
                type="number"
                required
                min="1"
                placeholder="Ex: 5000"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
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
                <option value="cheque">Chèque</option>
                <option value="orange_money">Orange Money</option>
                <option value="wave">Wave</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bénéficiaire</label>
            <input
              type="text"
              placeholder="Ex: Station Total, Propriétaire local..."
              value={beneficiaire}
              onChange={(e) => setBeneficiaire(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Justificatif photo / PDF */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Justificatif (Photo de reçu ou document PDF)
            </label>
            <label
              className={`flex items-center gap-3 w-full p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                files && files.length > 0 ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
              }`}
            >
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setFiles(e.target.files)}
                className="hidden"
              />
              {files && files.length > 0 ? (
                <>
                  <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                    <Paperclip className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-emerald-700 truncate">{files[0].name}</div>
                    <div className="text-[10px] text-emerald-600">
                      {(files[0].size / 1024).toFixed(0)} Ko — ✅ Justificatif prêt à l'envoi
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setFiles(null);
                    }}
                    className="text-slate-400 hover:text-rose-500 shrink-0 text-xs font-bold px-1"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                    <Upload className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-700">Choisir un fichier justificatif</div>
                    <div className="text-[10px] text-slate-500">Reçu photo, facturette, PDF scanné</div>
                  </div>
                </>
              )}
            </label>
            {(!files || files.length === 0) && (
              <p className="mt-1.5 text-[11px] text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Sans justificatif, la dépense sera signalée comme non justifiée.
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="font-serif w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={submitting}
              className="font-serif font-bold w-full sm:w-auto shadow-sm"
            >
              ✅ Enregistrer la dépense
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL MODIFIER DÉPENSE */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Modifier la Dépense"
        maxWidth="md"
      >
        <form onSubmit={handleUpdateDepense} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Catégorie *</label>
            <select
              value={editCategorie}
              onChange={(e) => setEditCategorie(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
            <input
              type="text"
              required
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Montant (F CFA) *</label>
              <input
                type="number"
                required
                min="1"
                value={editMontant}
                onChange={(e) => setEditMontant(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mode de règlement</label>
              <select
                value={editModePaiement}
                onChange={(e) => setEditModePaiement(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Bénéficiaire</label>
            <input
              type="text"
              value={editBeneficiaire}
              onChange={(e) => setEditBeneficiaire(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Nouveau justificatif facultatif */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Remplacer / Ajouter un justificatif
            </label>
            <label className="flex items-center gap-3 w-full p-3 border-2 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-white border-slate-200">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setEditFiles(e.target.files)}
                className="hidden"
              />
              <Upload className="h-4 w-4 text-slate-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-700 truncate">
                  {editFiles && editFiles.length > 0 ? editFiles[0].name : 'Sélectionner un nouveau fichier'}
                </div>
                <div className="text-[10px] text-slate-500">Photo ou document PDF</div>
              </div>
            </label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="font-serif w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={submitting}
              className="font-serif font-bold w-full sm:w-auto shadow-sm"
            >
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL APERÇU JUSTIFICATIF */}
      <Modal
        isOpen={viewJustifModalOpen}
        onClose={() => setViewJustifModalOpen(false)}
        title="Justificatif de dépense"
        maxWidth="lg"
      >
        {currentJustif && (
          <div className="space-y-3">
            <div className="text-xs text-slate-500 font-medium">
              Fichier : <span className="font-bold text-slate-800">{currentJustif.nomFichier}</span>
            </div>
            <div className="max-h-[65vh] overflow-auto flex items-center justify-center bg-slate-100 rounded-xl p-2 border border-slate-200">
              {currentJustif.cheminFichier?.startsWith('data:image') || currentJustif.nomFichier?.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                <img
                  src={currentJustif.cheminFichier}
                  alt={currentJustif.nomFichier}
                  className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-xs"
                />
              ) : (
                <div className="py-12 text-center space-y-2">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600">Document PDF ou pièce jointe</p>
                  <a
                    href={currentJustif.cheminFichier}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block px-4 py-2 bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-emerald-800"
                  >
                    Ouvrir le document
                  </a>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setViewJustifModalOpen(false)}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

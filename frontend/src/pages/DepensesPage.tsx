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
import {
  Receipt,
  PlusCircle,
  Paperclip,
  AlertTriangle,
  FileText,
  Upload,
} from 'lucide-react';

export const DepensesPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [depenses, setDepenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sansJustifFilter, setSansJustifFilter] = useState(false);
  const [categorieFilter, setCategorieFilter] = useState('');

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
        }
      } catch (sqlErr) {
        console.warn('SQLite fetch depenses:', sqlErr);
      }
    } else {
      // Sur PC web : vérifier la file d'attente hors-ligne locale
      const offlineList = getOfflineDepenses();
      if (offlineList && offlineList.length > 0) {
        setDepenses(offlineList);
      }
    }

    // 2. Synchroniser avec PostgreSQL via l'API si connecté
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (sansJustifFilter) params.append('sansJustificatif', 'true');
      if (categorieFilter) params.append('categorie', categorieFilter);

      const res = await api.get(`/depenses?${params.toString()}`);
      if (res.data?.success) {
        setDepenses(res.data.data);
      }
    } catch (err) {
      console.warn('Erreur chargement dépenses serveur (mode hors-ligne):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepenses();
  }, [sansJustifFilter, categorieFilter]);

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

    // Préparer le justificatif en Base64 si un fichier est sélectionné
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
      } catch (_) {
        // Si la lecture échoue, on continue sans justificatif
      }
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

    // 1. TENTER L'API EN PREMIER (envoi JSON avec justificatif Base64 intégré)
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
        // Mode hors-ligne : enregistrement local
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
        // Erreur serveur explicite
        setErrorMsg(err.response?.data?.message || 'Erreur lors de l\'enregistrement de la dépense');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const totalDepenses = depenses.reduce((acc, d) => acc + Number(d.montant), 0);
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
              <strong>Attention :</strong> {countSansJustif} dépense(s) sans justificatif.
            </span>
          </div>
          <button
            onClick={() => setSansJustifFilter(!sansJustifFilter)}
            className="text-[11px] font-bold underline hover:text-amber-700 shrink-0"
          >
            {sansJustifFilter ? 'Afficher tout' : 'Filtrer'}
          </button>
        </div>
      )}

      {/* Filtres par Catégorie */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setCategorieFilter('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            categorieFilter === ''
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Toutes ({depenses.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategorieFilter(cat.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              categorieFilter === cat.value
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Tableau des Dépenses */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-5 py-3.5">Numéro & Date</th>
                <th className="px-5 py-3.5">Catégorie</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Bénéficiaire</th>
                <th className="px-5 py-3.5 text-right">Montant</th>
                <th className="px-5 py-3.5 text-center">Mode</th>
                <th className="px-5 py-3.5 text-center">Justificatif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Chargement des dépenses...
                  </td>
                </tr>
              ) : depenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Aucune dépense trouvée
                  </td>
                </tr>
              ) : (
                depenses.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5">
                      <div className="font-mono text-xs font-semibold text-slate-900">{d.numero}</div>
                      <div className="text-xs text-slate-500">{formatDateTime(d.dateDepense)}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        {d.categorie}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm text-slate-900 font-medium">{d.description}</div>
                      <div className="text-xs text-slate-400">Par: {d.utilisateur?.prenom} {d.utilisateur?.nom}</div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {d.beneficiaire || '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-rose-600">
                      -{formatFCFA(d.montant)}
                    </td>
                    <td className="px-5 py-3.5 text-center text-xs capitalize text-slate-600">
                      {d.modePaiement}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {d.hasJustificatif ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          <Paperclip className="h-3 w-3" /> Reçu Joint
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <AlertTriangle className="h-3 w-3" /> Sans Justif
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
                min="1"
                required
                placeholder="Ex: 5000"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                className="w-full p-2.5 text-sm font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
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
                <option value="orange_money">Mobile Money</option>
                <option value="virement">Virement bancaire</option>
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
            <label className={`flex items-center gap-3 w-full p-3 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${files && files.length > 0 ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'}`}>
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
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFiles(null); }}
                    className="text-slate-400 hover:text-rose-500 shrink-0 text-xs font-bold px-1"
                  >✕</button>
                </>
              ) : (
                <>
                  <div className="p-2 bg-slate-100 rounded-lg shrink-0">
                    <Upload className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600">Choisir un fichier</div>
                    <div className="text-[10px] text-slate-400">Photo, scan ou PDF du reçu</div>
                  </div>
                </>
              )}
            </label>
            {(!files || files.length === 0) && (
              <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
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
    </div>
  );
};


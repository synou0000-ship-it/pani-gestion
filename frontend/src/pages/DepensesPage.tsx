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

  const handleCreateDepense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !montant) return;

    setSubmitting(true);
    setErrorMsg(null);

    const depenseData = {
      categorie,
      description,
      montant: Number(montant),
      modePaiement,
      beneficiaire,
    };

    // 1. TENTER L'API EN PREMIER (envoi JSON direct, plus fiable)
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
        if (isSQLiteAvailable()) {
          try {
            await sqliteCreateLocalDepense(depenseData);
          } catch (_) {}
        } else {
          saveOfflineDepense(depenseData);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Gestion des Dépenses</h1>
          <p className="text-xs text-slate-500">Enregistrement des charges d'exploitation et contrôle des justificatifs</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          icon={<PlusCircle className="h-4 w-4" />}
        >
          Nouvelle Dépense
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Justificatif (Photo de reçu ou document PDF)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFiles(e.target.files)}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Recommandé pour éviter le signalement de dépense sans justificatif.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setCreateModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              Enregistrer la dépense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


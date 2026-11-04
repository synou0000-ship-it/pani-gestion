import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { formatFCFA, formatDateTime } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { Card, StatCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import {
  Landmark,
  Lock,
  Unlock,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  History,
  CheckCircle,
  Search,
  Filter,
} from 'lucide-react';

export const CaissePage: React.FC = () => {
  const { hasRole } = useAuth();
  const [caisseActuelle, setCaisseActuelle] = useState<any>(null);
  const [mouvements, setMouvements] = useState<any[]>([]);
  const [mouvementsTotal, setMouvementsTotal] = useState(0);
  const [mouvementsPage, setMouvementsPage] = useState(1);
  const mouvementsLimit = 15;

  const [historique, setHistorique] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtres mouvements
  const [mvtTypeFilter, setMvtTypeFilter] = useState('');
  const [searchMvt, setSearchMvt] = useState('');

  // Modals
  const [ouvrirModalOpen, setOuvrirModalOpen] = useState(false);
  const [cloturerModalOpen, setCloturerModalOpen] = useState(false);
  const [soldeInitialInput, setSoldeInitialInput] = useState('');
  const [soldeReelInput, setSoldeReelInput] = useState('');
  const [notesCloture, setNotesCloture] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [actuelleRes, histRes] = await Promise.all([
        api.get('/caisse/actuelle'),
        api.get('/caisse/historique?limit=20'),
      ]);

      if (actuelleRes.data?.data) {
        const caisse = actuelleRes.data.data;
        setCaisseActuelle(caisse);

        const mvtParams = new URLSearchParams({
          caisseId: caisse.id.toString(),
          page: mouvementsPage.toString(),
          limit: mouvementsLimit.toString(),
        });
        if (mvtTypeFilter) mvtParams.append('typeOperation', mvtTypeFilter);

        const mvtRes = await api.get(`/caisse/mouvements?${mvtParams.toString()}`);
        if (mvtRes.data?.data) {
          setMouvements(mvtRes.data.data);
          setMouvementsTotal(mvtRes.data.pagination?.total || mvtRes.data.data.length);
        }
      } else {
        setCaisseActuelle(null);
        setMouvements([]);
        setMouvementsTotal(0);
      }

      if (histRes.data?.data) {
        setHistorique(histRes.data.data);
      }
    } catch (err) {
      console.error('Erreur caisse:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [mouvementsPage, mvtTypeFilter]);

  const handleOuvrirCaisse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/caisse/ouvrir', {
        soldeInitial: Number(soldeInitialInput) || 0,
      });
      if (res.data?.success) {
        setOuvrirModalOpen(false);
        setSoldeInitialInput('');
        await fetchData();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Erreur lors de l\'ouverture de caisse');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloturerCaisse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soldeReelInput) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/caisse/cloturer', {
        soldeReel: Number(soldeReelInput),
        notes: notesCloture,
      });
      if (res.data?.success) {
        setCloturerModalOpen(false);
        setSoldeReelInput('');
        setNotesCloture('');
        await fetchData();
        window.dispatchEvent(new Event('pani:data-changed'));
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Erreur lors de la clôture');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrage local supplémentaire si recherche textuelle
  const filteredMouvements = searchMvt.trim()
    ? mouvements.filter(
        (m) =>
          (m.description || '').toLowerCase().includes(searchMvt.toLowerCase()) ||
          (m.typeOperation || '').toLowerCase().includes(searchMvt.toLowerCase())
      )
    : mouvements;

  const totalMvtPages = Math.ceil(mouvementsTotal / mouvementsLimit) || 1;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">Caisse & Sessions</h1>
          <p className="text-xs text-slate-500 hidden sm:block">Contrôle du tiroir-caisse, fond initial, encaissements et clôture</p>
        </div>

        {caisseActuelle ? (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setCloturerModalOpen(true)}
            icon={<Lock className="h-4 w-4" />}
            className="shrink-0 font-serif font-bold text-xs sm:text-sm whitespace-nowrap min-h-[40px] px-3.5"
          >
            Clôturer la Caisse
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setOuvrirModalOpen(true)}
            icon={<Unlock className="h-4 w-4" />}
            className="shrink-0 font-serif font-bold text-xs sm:text-sm whitespace-nowrap min-h-[40px] px-3.5"
          >
            Ouvrir la Caisse
          </Button>
        )}
      </div>

      {/* État de la caisse actuelle */}
      {caisseActuelle ? (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                <Landmark className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-base font-mono">{caisseActuelle.reference}</span>
                  <Badge variant="success" size="xs">Caisse Ouverte</Badge>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Ouverte par <span className="font-bold text-slate-800">{caisseActuelle.utilisateur?.prenom} {caisseActuelle.utilisateur?.nom}</span> le{' '}
                  {formatDateTime(caisseActuelle.dateOuverture)}
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-200">
              <div className="text-xs text-emerald-800 font-medium">Solde Théorique en Caisse</div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950">
                {formatFCFA(caisseActuelle.soldeTheorique)}
              </div>
            </div>
          </div>

          {/* Cartes métriques */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3">
              <div className="text-[11px] text-slate-500">Fond Initial</div>
              <div className="text-base sm:text-lg font-bold text-slate-900">{formatFCFA(caisseActuelle.soldeInitial)}</div>
            </Card>
            <Card className="p-3">
              <div className="text-[11px] text-slate-500">Encaissements</div>
              <div className="text-base sm:text-lg font-bold text-emerald-600">+{formatFCFA(caisseActuelle.totalEncaissements || 0)}</div>
            </Card>
            <Card className="p-3">
              <div className="text-[11px] text-slate-500">Décaissements</div>
              <div className="text-base sm:text-lg font-bold text-rose-600">-{formatFCFA(caisseActuelle.totalDecaissements || 0)}</div>
            </Card>
            <Card className="p-3">
              <div className="text-[11px] text-slate-500">Mouvements</div>
              <div className="text-base sm:text-lg font-bold text-slate-900">{mouvementsTotal} opération(s)</div>
            </Card>
          </div>

          {/* Mouvements de la session courante avec Filtrage et Pagination */}
          <Card className="overflow-hidden p-0">
            <div className="p-3 sm:p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-700" />
                <h3 className="font-bold text-sm text-slate-900">Mouvements de Caisse de la Session</h3>
              </div>

              {/* Filtres mouvements */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrer mot-clé..."
                    value={searchMvt}
                    onChange={(e) => setSearchMvt(e.target.value)}
                    className="pl-7 pr-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white w-36 sm:w-44 focus:ring-2 focus:ring-emerald-600 font-serif"
                  />
                </div>

                <select
                  value={mvtTypeFilter}
                  onChange={(e) => {
                    setMvtTypeFilter(e.target.value);
                    setMouvementsPage(1);
                  }}
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white font-serif"
                >
                  <option value="">Toutes opérations</option>
                  <option value="encaissement_vente">Ventes directes (+)</option>
                  <option value="paiement_client_dette">Règlement dette client (+)</option>
                  <option value="autre_entree">Autre entrée (+)</option>
                  <option value="depense_directe">Dépenses (-)</option>
                  <option value="paiement_fournisseur">Paiement fournisseur (-)</option>
                  <option value="autre_sortie">Autre sortie (-)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">Heure</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Montant</th>
                    <th className="px-4 py-3 text-right">Solde Après</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMouvements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400 text-xs font-serif">
                        Aucun mouvement enregistré pour cette sélection
                      </td>
                    </tr>
                  ) : (
                    filteredMouvements.map((m) => {
                      const isEntree = ['encaissement_vente', 'paiement_client_dette', 'autre_entree'].includes(m.typeOperation);
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {formatDateTime(m.dateMouvement)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isEntree ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {m.typeOperation}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-800 font-medium">
                            {m.description || m.typeOperation}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-xs whitespace-nowrap">
                            {isEntree ? (
                              <span className="text-emerald-600">+{formatFCFA(m.montant)}</span>
                            ) : (
                              <span className="text-rose-600">-{formatFCFA(m.montant)}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-xs text-slate-900 font-semibold whitespace-nowrap font-mono">
                            {formatFCFA(m.soldeApres)}
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
        </div>
      ) : (
        <Card className="text-center py-12 border-dashed border-2 border-slate-300">
          <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Landmark className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Aucune Caisse Ouverte</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Pour commencer les encaissements en espèces et suivre les flux d'argent, veuillez ouvrir une caisse en saisissant le fond de caisse initial.
          </p>
          <Button variant="primary" size="lg" onClick={() => setOuvrirModalOpen(true)}>
            Ouvrir la Caisse Maintenant
          </Button>
        </Card>
      )}

      {/* Historique des Caisses Clôturées */}
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <History className="h-4 w-4 text-emerald-700" />
          <h3 className="font-bold text-sm text-slate-900">Historique des Sessions de Caisse</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Ouverture</th>
                <th className="px-4 py-3">Clôture</th>
                <th className="px-4 py-3 text-right">Solde Initial</th>
                <th className="px-4 py-3 text-right">Solde Théorique</th>
                <th className="px-4 py-3 text-right">Compté Réel</th>
                <th className="px-4 py-3 text-center">Écart / Manque</th>
                <th className="px-4 py-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {historique.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-slate-400 font-serif">
                    Aucune session précédente enregistrée
                  </td>
                </tr>
              ) : (
                historique.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold whitespace-nowrap">{c.reference}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(c.dateOuverture)}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{c.dateCloture ? formatDateTime(c.dateCloture) : '-'}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{formatFCFA(c.soldeInitial)}</td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatFCFA(c.soldeTheorique)}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {c.soldeReel ? formatFCFA(c.soldeReel) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {c.ecart !== null && c.ecart !== undefined ? (
                        Number(c.ecart) < 0 ? (
                          <span className="px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-700">
                            Manque {formatFCFA(Math.abs(Number(c.ecart)))}
                          </span>
                        ) : Number(c.ecart) > 0 ? (
                          <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700">
                            Surplus +{formatFCFA(c.ecart)}
                          </span>
                        ) : (
                          <span className="text-slate-400">Écart 0</span>
                        )
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <Badge variant={c.statut === 'ouverte' ? 'success' : 'neutral'} size="xs">
                        {c.statut}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL OUVERTURE CAISSE */}
      <Modal
        isOpen={ouvrirModalOpen}
        onClose={() => setOuvrirModalOpen(false)}
        title="Ouverture de Session de Caisse"
        maxWidth="sm"
      >
        <form onSubmit={handleOuvrirCaisse} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fond de Caisse Initial (F CFA) *
            </label>
            <input
              type="number"
              required
              min="0"
              placeholder="Ex: 25000 (Monnaie de départ)"
              value={soldeInitialInput}
              onChange={(e) => setSoldeInitialInput(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-bold"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Montant d'espèces présent dans le tiroir au démarrage de la journée (monnaie).
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setOuvrirModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting} className="font-bold shadow-sm">
              Confirmer l'Ouverture
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL CLÔTURE CAISSE */}
      <Modal
        isOpen={cloturerModalOpen}
        onClose={() => setCloturerModalOpen(false)}
        title="Clôture de Caisse & Comptage Réel"
        maxWidth="sm"
      >
        <form onSubmit={handleCloturerCaisse} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {errorMsg}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Solde Théorique attendu :</span>
              <span className="font-bold text-slate-900">{formatFCFA(caisseActuelle?.soldeTheorique || 0)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Montant Réel Compté dans le Tiroir (F CFA) *
            </label>
            <input
              type="number"
              required
              min="0"
              placeholder="Ex: 50000"
              value={soldeReelInput}
              onChange={(e) => setSoldeReelInput(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 font-bold"
            />
          </div>

          {soldeReelInput && (
            <div className="p-3 rounded-lg border text-xs flex justify-between items-center font-bold">
              <span>Écart calculé :</span>
              {Number(soldeReelInput) - Number(caisseActuelle?.soldeTheorique || 0) === 0 ? (
                <span className="text-emerald-700">Parfait (Écart 0 F)</span>
              ) : Number(soldeReelInput) - Number(caisseActuelle?.soldeTheorique || 0) < 0 ? (
                <span className="text-rose-700">
                  Manque de {formatFCFA(Math.abs(Number(soldeReelInput) - Number(caisseActuelle?.soldeTheorique || 0)))}
                </span>
              ) : (
                <span className="text-emerald-700">
                  Surplus de +{formatFCFA(Number(soldeReelInput) - Number(caisseActuelle?.soldeTheorique || 0))}
                </span>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Justification d'écart</label>
            <textarea
              rows={2}
              placeholder="Ex: Justification de l'écart ou observation..."
              value={notesCloture}
              onChange={(e) => setNotesCloture(e.target.value)}
              className="w-full p-2 text-xs border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setCloturerModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="danger" size="md" type="submit" isLoading={submitting} className="font-bold shadow-sm">
              Confirmer la Clôture
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { formatFCFA, formatDateTime } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { Card, StatCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  Landmark,
  Lock,
  Unlock,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  History,
  CheckCircle,
} from 'lucide-react';

export const CaissePage: React.FC = () => {
  const { hasRole } = useAuth();
  const [caisseActuelle, setCaisseActuelle] = useState<any>(null);
  const [mouvements, setMouvements] = useState<any[]>([]);
  const [historique, setHistorique] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        api.get('/caisse/historique?limit=10'),
      ]);

      if (actuelleRes.data?.data) {
        setCaisseActuelle(actuelleRes.data.data);
        // Mouvements de la session
        const mvtRes = await api.get(`/caisse/mouvements?caisseId=${actuelleRes.data.data.id}&limit=20`);
        if (mvtRes.data?.data) setMouvements(mvtRes.data.data);
      } else {
        setCaisseActuelle(null);
        setMouvements([]);
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
  }, []);

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
        fetchData();
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
        fetchData();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Erreur lors de la clôture de caisse');
    } finally {
      setSubmitting(false);
    }
  };

  const soldeTheorique = Number(caisseActuelle?.soldeTheorique || 0);
  const soldeReelPreview = Number(soldeReelInput || 0);
  const ecartPreview = soldeReelPreview - soldeTheorique;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Gestion de la Caisse</h1>
          <p className="text-xs text-slate-500">Ouverture, clôture, comptage physique et contrôle des écarts</p>
        </div>

        <div>
          {caisseActuelle ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setCloturerModalOpen(true)}
              icon={<Lock className="h-4 w-4" />}
            >
              Clôturer la Caisse
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setOuvrirModalOpen(true)}
              icon={<Unlock className="h-4 w-4" />}
            >
              Ouvrir une Caisse
            </Button>
          )}
        </div>
      </div>

      {/* État de la caisse active */}
      {caisseActuelle ? (
        <div className="space-y-6">
          <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-0 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="success">SESSION OUVERTE</Badge>
                  <span className="text-xs text-slate-400 font-mono">{caisseActuelle.reference}</span>
                </div>
                <div className="text-xs text-slate-400">Solde Théorique en Caisse</div>
                <div className="text-4xl font-black text-brand-400 mt-1">
                  {formatFCFA(caisseActuelle.soldeTheorique)}
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  Ouverte par : <span className="text-slate-200 font-semibold">{caisseActuelle.utilisateur?.prenom} {caisseActuelle.utilisateur?.nom}</span> le {formatDateTime(caisseActuelle.dateOuverture)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-700/60">
                <div>
                  <div className="text-[11px] text-slate-400">Solde Initial</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {formatFCFA(caisseActuelle.soldeInitial)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-emerald-400">Total Encaissements</div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">
                    +{formatFCFA(caisseActuelle.totalEncaissements)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-rose-400">Total Décaissements</div>
                  <div className="text-lg font-bold text-rose-400 mt-0.5">
                    -{formatFCFA(caisseActuelle.totalDecaissements)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Mouvements</div>
                  <div className="text-lg font-bold text-white mt-0.5">
                    {mouvements.length}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Mouvements de la session courante */}
          <Card className="overflow-hidden p-0">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Mouvements de Caisse de la Session</h3>
              <span className="text-xs text-slate-500">Flux d'argent en temps réel</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="px-5 py-3">Heure</th>
                    <th className="px-5 py-3">Description</th>
                    <th className="px-5 py-3 text-right">Montant</th>
                    <th className="px-5 py-3 text-right">Solde Après</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mouvements.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                        Aucun mouvement enregistré pour cette session
                      </td>
                    </tr>
                  ) : (
                    mouvements.map((m) => {
                      const isEntree = ['encaissement_vente', 'paiement_client_dette', 'autre_entree'].includes(m.typeOperation);
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/60">
                          <td className="px-5 py-3 text-xs text-slate-500">
                            {formatDateTime(m.dateMouvement)}
                          </td>
                          <td className="px-5 py-3">
                            <div className="text-xs font-medium text-slate-800">{m.description || m.typeOperation}</div>
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-xs">
                            {isEntree ? (
                              <span className="text-emerald-600">+{formatFCFA(m.montant)}</span>
                            ) : (
                              <span className="text-rose-600">-{formatFCFA(m.montant)}</span>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right text-xs text-slate-900 font-semibold">
                            {formatFCFA(m.soldeApres)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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
          <History className="h-4 w-4 text-brand-600" />
          <h3 className="font-bold text-sm text-slate-900">Historique des Sessions de Caisse</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-5 py-3">Référence</th>
                <th className="px-5 py-3">Ouverture</th>
                <th className="px-5 py-3">Clôture</th>
                <th className="px-5 py-3 text-right">Solde Initial</th>
                <th className="px-5 py-3 text-right">Solde Théorique</th>
                <th className="px-5 py-3 text-right">Compté Réel</th>
                <th className="px-5 py-3 text-center">Écart / Manque</th>
                <th className="px-5 py-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {historique.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-mono font-semibold">{c.reference}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDateTime(c.dateOuverture)}</td>
                  <td className="px-5 py-3 text-slate-500">{formatDateTime(c.dateCloture)}</td>
                  <td className="px-5 py-3 text-right">{formatFCFA(c.soldeInitial)}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatFCFA(c.soldeTheorique)}</td>
                  <td className="px-5 py-3 text-right font-bold text-slate-900">
                    {c.soldeReel ? formatFCFA(c.soldeReel) : '-'}
                  </td>
                  <td className="px-5 py-3 text-center">
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
                  <td className="px-5 py-3 text-center">
                    <Badge variant={c.statut === 'ouverte' ? 'success' : 'neutral'}>
                      {c.statut}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL OUVERTURE CAISSE */}
      <Modal
        isOpen={ouvrirModalOpen}
        onClose={() => setOuvrirModalOpen(false)}
        title="Ouvrir une Nouvelle Session de Caisse"
        maxWidth="md"
      >
        <form onSubmit={handleOuvrirCaisse} className="space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Fond de caisse initial (F CFA) :
            </label>
            <input
              type="number"
              min="0"
              placeholder="Ex: 50000"
              value={soldeInitialInput}
              onChange={(e) => setSoldeInitialInput(e.target.value)}
              className="w-full p-2.5 text-base font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Montant en espèces physiquement présent dans le tiroir au démarrage.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setOuvrirModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              Confirmer l'ouverture
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL CLOTURE CAISSE AVEC COMPTAGE RÉEL */}
      <Modal
        isOpen={cloturerModalOpen}
        onClose={() => setCloturerModalOpen(false)}
        title="Clôture de Caisse & Comptage Physique"
        maxWidth="md"
      >
        <form onSubmit={handleCloturerCaisse} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between text-slate-600">
              <span>Solde Théorique attendu :</span>
              <span className="font-bold text-slate-900">{formatFCFA(soldeTheorique)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Montant réellement compté en caisse (F CFA) * :
            </label>
            <input
              type="number"
              required
              placeholder="Ex: 155000"
              value={soldeReelInput}
              onChange={(e) => setSoldeReelInput(e.target.value)}
              className="w-full p-3 text-lg font-black text-slate-900 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {soldeReelInput && (
            <div
              className={`p-3 rounded-lg border text-xs font-bold ${
                ecartPreview < 0
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : ecartPreview > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {ecartPreview < 0 ? (
                <div>⚠️ MANQUE DE CAISSE CONSTATÉ : {formatFCFA(Math.abs(ecartPreview))}</div>
              ) : ecartPreview > 0 ? (
                <div>SURPLUS DE CAISSE : +{formatFCFA(ecartPreview)}</div>
              ) : (
                <div>✓ CAISSE EXACTE (Aucun écart)</div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observations de clôture
            </label>
            <textarea
              rows={2}
              placeholder="Explication éventuelle en cas d'écart..."
              value={notesCloture}
              onChange={(e) => setNotesCloture(e.target.value)}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setCloturerModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="danger" size="sm" type="submit" isLoading={submitting}>
              Valider la clôture
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


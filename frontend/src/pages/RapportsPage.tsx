import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { formatFCFA, formatDateTime } from '../lib/formatters';
import { Card, StatCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  ShieldAlert,
  TrendingUp,
  Receipt,
  Package,
  Landmark,
  FileSpreadsheet,
} from 'lucide-react';

export const RapportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'journalier' | 'mensuel' | 'manques'>('journalier');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedMois, setSelectedMois] = useState<number>(new Date().getMonth() + 1);
  const [selectedAnnee, setSelectedAnnee] = useState<number>(new Date().getFullYear());

  const [rapportJournalier, setRapportJournalier] = useState<any>(null);
  const [rapportMensuel, setRapportMensuel] = useState<any>(null);
  const [rapportManques, setRapportManques] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchRapportJournalier = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rapports/journalier?date=${selectedDate}`);
      if (res.data?.success) setRapportJournalier(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRapportMensuel = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rapports/mensuel?mois=${selectedMois}&annee=${selectedAnnee}`);
      if (res.data?.success) setRapportMensuel(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRapportManques = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rapports/manques');
      if (res.data?.success) setRapportManques(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'journalier') fetchRapportJournalier();
    if (activeTab === 'mensuel') fetchRapportMensuel();
    if (activeTab === 'manques') fetchRapportManques();
  }, [activeTab, selectedDate, selectedMois, selectedAnnee]);

  const handleExportExcel = (type: string) => {
    window.open(`/api/rapports/export/excel?type=${type}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Rapports & Statistiques</h1>
          <p className="text-xs text-slate-500">
            Rapport journalier, synthèse mensuelle, détection des manques et exports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportExcel(activeTab)}
            icon={<FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
          >
            Export Excel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrint}
            icon={<Printer className="h-4 w-4" />}
          >
            Imprimer / PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('journalier')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'journalier'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Rapport Journalier
          </button>

          <button
            onClick={() => setActiveTab('mensuel')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'mensuel'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Rapport Mensuel (Marge & Bénéfice)
          </button>

          <button
            onClick={() => setActiveTab('manques')}
            className={`py-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'manques'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            Rapport des Manques & Anomalies
          </button>
        </nav>
      </div>

      {/* CONTENU ONGLET 1: RAPPORT JOURNALIER */}
      {activeTab === 'journalier' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Choisir la date :</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {rapportJournalier && (
            <div className="space-y-6">
              {/* KPIs Journaliers */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <div className="text-xs text-slate-500 font-semibold">Chiffre d'Affaires</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {formatFCFA(rapportJournalier.chiffreAffaires)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {rapportJournalier.nombreVentes} vente(s) ({rapportJournalier.quantiteVendue} unités)
                  </div>
                </Card>

                <Card>
                  <div className="text-xs text-slate-500 font-semibold">Encaissements Totaux</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">
                    +{formatFCFA(rapportJournalier.totalEncaissements)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Espèces reçues
                  </div>
                </Card>

                <Card>
                  <div className="text-xs text-slate-500 font-semibold">Dépenses Enregistrées</div>
                  <div className="text-2xl font-bold text-rose-600 mt-1">
                    -{formatFCFA(rapportJournalier.totalDepenses)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {rapportJournalier.nombreDepenses} dépense(s)
                  </div>
                </Card>

                <Card>
                  <div className="text-xs text-slate-500 font-semibold">Solde Caisse Jour</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {rapportJournalier.caisse ? formatFCFA(rapportJournalier.caisse.soldeTheorique) : 'Fermée'}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {rapportJournalier.caisse?.ecart ? `Écart: ${formatFCFA(rapportJournalier.caisse.ecart)}` : 'Aucun écart'}
                  </div>
                </Card>
              </div>

              {/* Stock Restant en fin de journée */}
              <Card>
                <h3 className="font-bold text-sm text-slate-900 mb-3">Stock Restant Disponible</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {rapportJournalier.stockRestant?.map((s: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border text-center">
                      <div className="text-xs text-slate-500">{s.nom}</div>
                      <div className="text-xl font-bold text-slate-900 mt-1">{s.stock} {s.unite}s</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* CONTENU ONGLET 2: RAPPORT MENSUEL */}
      {activeTab === 'mensuel' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700">Période :</span>
            <select
              value={selectedMois}
              onChange={(e) => setSelectedMois(parseInt(e.target.value))}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m}>Mois {m}</option>
              ))}
            </select>
            <select
              value={selectedAnnee}
              onChange={(e) => setSelectedAnnee(parseInt(e.target.value))}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
            >
              {[2024, 2025, 2026].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {rapportMensuel && (
            <div className="space-y-6">
              {/* Grand Calcul Financier Marge et Bénéfice */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Card className="border-t-4 border-t-emerald-500">
                  <div className="text-xs font-bold uppercase text-slate-500">1. Chiffre d'Affaires</div>
                  <div className="text-3xl font-black text-slate-900 mt-2">
                    {formatFCFA(rapportMensuel.chiffreAffaires)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {rapportMensuel.nombreVentes} ventes validées
                  </div>
                </Card>

                <Card className="border-t-4 border-t-sky-500">
                  <div className="text-xs font-bold uppercase text-slate-500">2. Marge Brute Commerciale</div>
                  <div className="text-3xl font-black text-sky-700 mt-2">
                    {formatFCFA(rapportMensuel.margeBrute)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    CA − Coût d'achat ({formatFCFA(rapportMensuel.totalAchats)})
                  </div>
                </Card>

                <Card className="border-t-4 border-t-brand-600 bg-brand-50/40">
                  <div className="text-xs font-bold uppercase text-brand-800">3. Résultat Net Estimé</div>
                  <div className={`text-3xl font-black mt-2 ${rapportMensuel.resultatEstime >= 0 ? 'text-brand-700' : 'text-rose-600'}`}>
                    {formatFCFA(rapportMensuel.resultatEstime)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Marge Brute − Dépenses ({formatFCFA(rapportMensuel.totalDepenses)})
                  </div>
                </Card>
              </div>

              {/* Dettes et Pertes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <div className="text-xs text-slate-500 font-semibold">Dettes Clients non réglées</div>
                  <div className="text-xl font-bold text-amber-600 mt-1">
                    {formatFCFA(rapportMensuel.dettesClients)}
                  </div>
                </Card>
                <Card>
                  <div className="text-xs text-slate-500 font-semibold">Dettes Fournisseurs en cours</div>
                  <div className="text-xl font-bold text-slate-700 mt-1">
                    {formatFCFA(rapportMensuel.dettesFournisseurs)}
                  </div>
                </Card>
                <Card>
                  <div className="text-xs text-slate-500 font-semibold">Pertes / Casses déclarées</div>
                  <div className="text-xl font-bold text-rose-600 mt-1">
                    {rapportMensuel.pertesDeclarees} unités
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONTENU ONGLET 3: RAPPORT DES MANQUES */}
      {activeTab === 'manques' && (
        <div className="space-y-6">
          {rapportManques && (
            <div className="space-y-6">
              {/* Synthèse des alertes */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <div className="text-xs font-bold uppercase text-rose-600">Total Manque Caisse</div>
                  <div className="text-2xl font-black text-rose-900 mt-1">
                    {formatFCFA(rapportManques.synthese.totalManqueCaisse)}
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <div className="text-xs font-bold uppercase text-amber-600">Écarts Stock Total</div>
                  <div className="text-2xl font-black text-amber-900 mt-1">
                    {rapportManques.synthese.totalEcartsStock} unités
                  </div>
                </div>

                <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-center">
                  <div className="text-xs font-bold uppercase text-orange-600">Dépenses Sans Justificatif</div>
                  <div className="text-2xl font-black text-orange-900 mt-1">
                    {rapportManques.synthese.nombreDepensesSansJustificatif}
                  </div>
                  <div className="text-xs text-orange-700 mt-0.5">
                    ({formatFCFA(rapportManques.synthese.totalDepensesSansJustificatif)})
                  </div>
                </div>

                <div className="p-4 bg-slate-100 border border-slate-300 rounded-xl text-center">
                  <div className="text-xs font-bold uppercase text-slate-600">Ventes Annulées</div>
                  <div className="text-2xl font-black text-slate-900 mt-1">
                    {rapportManques.synthese.nombreVentesAnnulees}
                  </div>
                </div>
              </div>

              {/* Table Dépenses sans justificatif */}
              <Card className="overflow-hidden p-0">
                <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-amber-950">Dépenses sans justificatif joint</h3>
                  <span className="text-xs text-amber-800">À régulariser d'urgence</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold">
                      <tr>
                        <th className="p-3">Numéro</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Catégorie</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Montant</th>
                        <th className="p-3">Utilisateur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rapportManques.depensesSansJustificatif?.map((d: any) => (
                        <tr key={d.id} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold">{d.numero}</td>
                          <td className="p-3 text-slate-500">{formatDateTime(d.dateDepense)}</td>
                          <td className="p-3 capitalize">{d.categorie}</td>
                          <td className="p-3 font-medium text-slate-800">{d.description}</td>
                          <td className="p-3 text-right font-bold text-rose-600">{formatFCFA(d.montant)}</td>
                          <td className="p-3 text-slate-500">{d.utilisateur?.prenom} {d.utilisateur?.nom}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


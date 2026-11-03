import React, { useState, useEffect } from 'react';
import { api, saveOfflineClient, getOfflineClients } from '../lib/api';
import { isSQLiteAvailable, sqliteGetClients, sqliteCreateLocalClient, sqliteUpsertClient } from '../lib/sqlite';
import { pushLocalChanges } from '../lib/sync';
import { formatFCFA, formatDateTime } from '../lib/formatters';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  Users,
  PlusCircle,
  Search,
  Banknote,
  FileSpreadsheet,
  AlertCircle,
  Phone,
  MapPin,
} from 'lucide-react';

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [paiementModalOpen, setPaiementModalOpen] = useState(false);
  const [releveModalOpen, setReleveModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [releveData, setReleveData] = useState<any>(null);

  // Form Client
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [typeClient, setTypeClient] = useState('particulier');
  const [clientError, setClientError] = useState<string | null>(null);

  // Form Paiement
  const [montantPaiement, setMontantPaiement] = useState('');
  const [modePaiement, setModePaiement] = useState('especes');
  const [notesPaiement, setNotesPaiement] = useState('');
  const [paiementError, setPaiementError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    // 1. Lire d'abord depuis SQLite si disponible
    if (isSQLiteAvailable()) {
      try {
        const sqlClients = await sqliteGetClients();
        if (sqlClients && sqlClients.length > 0) {
          setClients(sqlClients);
        }
      } catch (sqlErr) {
        console.warn('SQLite fetch clients:', sqlErr);
      }
    } else {
      // Sur PC web : vérifier le cache ou la file d'attente hors-ligne
      const offlineClients = getOfflineClients();
      if (offlineClients && offlineClients.length > 0) {
        setClients(offlineClients);
      }
    }

    // 2. Si connecté, synchroniser avec l'API
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (search) params.append('search', search);
      if (typeFilter) params.append('typeClient', typeFilter);

      const res = await api.get(`/clients?${params.toString()}`);
      if (res.data?.success) {
        setClients(res.data.data);
      }
    } catch (err) {
      console.warn('Erreur chargement clients serveur (mode hors-ligne):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [typeFilter]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    setSubmitting(true);
    setClientError(null);
    const clientPayload = { nom, prenom, telephone, adresse, typeClient };

    // 1. TENTER L'API EN PREMIER
    try {
      const res = await api.post('/clients', clientPayload);
      if (res.data?.success) {
        if (isSQLiteAvailable()) {
          try { await sqliteUpsertClient(res.data.data); } catch (_) {}
        }
        setCreateModalOpen(false);
        setNom(''); setPrenom(''); setTelephone(''); setAdresse('');
        await fetchClients();
      }
    } catch (err: any) {
      const isOfflineErr = !err.response || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';
      if (isOfflineErr) {
        // Mode hors-ligne : enregistrement local
        if (isSQLiteAvailable()) {
          try { await sqliteCreateLocalClient(clientPayload); } catch (_) {}
        } else {
          saveOfflineClient(clientPayload);
        }
        setCreateModalOpen(false);
        setNom(''); setPrenom(''); setTelephone(''); setAdresse('');
        await fetchClients();
        pushLocalChanges().catch(() => {});
      } else {
        setClientError(err.response?.data?.message || 'Erreur lors de la création du client');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaiementDette = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !montantPaiement || Number(montantPaiement) <= 0) return;

    setSubmitting(true);
    setPaiementError(null);
    try {
      const res = await api.post(`/clients/${selectedClient.id}/paiements`, {
        montant: Number(montantPaiement),
        modePaiement,
        notes: notesPaiement,
      });
      if (res.data?.success) {
        setPaiementModalOpen(false);
        setMontantPaiement('');
        setNotesPaiement('');
        fetchClients();
      }
    } catch (err: any) {
      setPaiementError(err.response?.data?.message || 'Erreur enregistrement paiement');
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
      console.error('Erreur relevé:', err);
    }
  };

  const totalDettesClients = clients.reduce((acc, c) => acc + (c.totalDette || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Clients & Dettes</h1>
          <p className="text-xs text-slate-500">
            Fichier clients, suivi des ventes à crédit et encaissements des dettes
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          icon={<PlusCircle className="h-4 w-4" />}
        >
          Nouveau Client
        </Button>
      </div>

      {/* Total Dettes Clients Global */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 text-white rounded-lg">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Total Dettes Clients en Cours
            </div>
            <div className="text-2xl font-black text-amber-950 mt-0.5">
              {formatFCFA(totalDettesClients)}
            </div>
          </div>
        </div>
        <div className="text-xs text-amber-800 text-right">
          {clients.filter((c) => c.aDette).length} client(s) ont un solde débiteur
        </div>
      </div>

      {/* Recherche et filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyUp={(e) => e.key === 'Enter' && fetchClients()}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
        >
          <option value="">Tous les types</option>
          <option value="particulier">Particuliers</option>
          <option value="grossiste">Grossistes</option>
          <option value="revendeur">Revendeurs</option>
        </select>
      </div>

      {/* Grille / Liste des Clients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((c) => (
          <Card key={c.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {c.nom} {c.prenom || ''}
                  </h3>
                  <Badge variant={c.typeClient === 'grossiste' ? 'info' : 'neutral'} size="sm">
                    {c.typeClient}
                  </Badge>
                </div>
                {c.aDette ? (
                  <Badge variant="danger" size="sm">
                    Dette : {formatFCFA(c.totalDette)}
                  </Badge>
                ) : (
                  <Badge variant="success" size="sm">À jour</Badge>
                )}
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-500">
                {c.telephone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{c.telephone}</span>
                  </div>
                )}
                {c.adresse && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    <span>{c.adresse}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
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
                  className="flex-1 text-xs"
                >
                  Régler Dette
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* MODAL CRÉER CLIENT */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => { setCreateModalOpen(false); setClientError(null); }}
        title="Ajouter une Fiche Client"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom *</label>
              <input
                type="text"
                required
                placeholder="Ex: Traoré"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom</label>
              <input
                type="text"
                placeholder="Ex: Mamadou"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
              <input
                type="tel"
                placeholder="Ex: +223 70 00 00 00"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type de client</label>
              <select
                value={typeClient}
                onChange={(e) => setTypeClient(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
              >
                <option value="particulier">Particulier</option>
                <option value="grossiste">Grossiste</option>
                <option value="revendeur">Revendeur</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse / Localisation</label>
            <input
              type="text"
              placeholder="Ex: Grand Marché, Bamako"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setCreateModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting} className="font-bold shadow-sm">
              Enregistrer le client
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL PAIEMENT DE DETTE */}
      <Modal
        isOpen={paiementModalOpen}
        onClose={() => { setPaiementModalOpen(false); setPaiementError(null); }}
        title={`Règlement Dette: ${selectedClient?.nom || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handlePaiementDette} className="space-y-4">
          {paiementError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {paiementError}
            </div>
          )}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs flex justify-between items-center">
            <span className="text-amber-800 font-semibold">Dette totale actuelle :</span>
            <span className="font-bold text-amber-950 text-sm">{formatFCFA(selectedClient?.totalDette)}</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Montant versé (F CFA) *</label>
            <input
              type="number"
              min="1"
              required
              value={montantPaiement}
              onChange={(e) => setMontantPaiement(e.target.value)}
              className="w-full p-2.5 text-base font-bold text-brand-700 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mode de versement</label>
            <select
              value={modePaiement}
              onChange={(e) => setModePaiement(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
            >
              <option value="especes">Espèces (Encaissement automatique en Caisse)</option>
              <option value="orange_money">Mobile Money</option>
              <option value="virement">Virement bancaire</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setPaiementModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting} className="font-bold shadow-sm">
              Encaisser le versement
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL RELEVÉ CLIENT */}
      <Modal
        isOpen={releveModalOpen}
        onClose={() => setReleveModalOpen(false)}
        title={`Relevé Client: ${releveData?.client?.nom || ''}`}
        maxWidth="lg"
      >
        {releveData && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border text-center font-bold">
              <div>
                <span className="text-slate-500 font-normal block">Total Ventes</span>
                <span className="text-slate-900">{formatFCFA(releveData.recapitulatif.totalVentes)}</span>
              </div>
              <div>
                <span className="text-slate-500 font-normal block">Total Payé</span>
                <span className="text-emerald-700">{formatFCFA(releveData.recapitulatif.totalPaye)}</span>
              </div>
              <div>
                <span className="text-slate-500 font-normal block">Reste à Payer</span>
                <span className="text-rose-600">{formatFCFA(releveData.recapitulatif.resteAPayer)}</span>
              </div>
            </div>

            <div>
              <h4 className="font-bold uppercase text-slate-700 mb-1.5">Historique des Ventes</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 font-semibold">
                    <tr>
                      <th className="p-2">Date & Réf</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-right">Payé</th>
                      <th className="p-2 text-right">Reste</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {releveData.ventes.map((v: any) => (
                      <tr key={v.id}>
                        <td className="p-2 font-mono">{formatDateTime(v.dateVente)}<br/>{v.reference}</td>
                        <td className="p-2 text-right font-bold">{formatFCFA(v.montantTotal)}</td>
                        <td className="p-2 text-right text-emerald-600">{formatFCFA(v.montantPaye)}</td>
                        <td className="p-2 text-right text-rose-600 font-bold">{formatFCFA(v.resteAPayer)}</td>
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


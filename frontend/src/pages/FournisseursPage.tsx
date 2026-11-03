import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { isSQLiteAvailable, sqliteGetFournisseurs, sqliteUpsertFournisseur } from '../lib/sqlite';
import { formatFCFA, formatDateTime } from '../lib/formatters';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  Truck,
  PlusCircle,
  Banknote,
  FileSpreadsheet,
  Phone,
  MapPin,
  AlertCircle,
  WifiOff,
} from 'lucide-react';

export const FournisseursPage: React.FC = () => {
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [paiementModalOpen, setPaiementModalOpen] = useState(false);
  const [releveModalOpen, setReleveModalOpen] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState<any>(null);
  const [releveData, setReleveData] = useState<any>(null);

  // Form Fournisseur
  const [nom, setNom] = useState('');
  const [contact, setContact] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [email, setEmail] = useState('');
  const [fournisseurError, setFournisseurError] = useState<string | null>(null);

  // Form Paiement
  const [montantPaiement, setMontantPaiement] = useState('');
  const [modePaiement, setModePaiement] = useState('especes');
  const [notesPaiement, setNotesPaiement] = useState('');
  const [paiementError, setPaiementError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchFournisseurs = async () => {
    setLoading(true);

    // 1. Essayer SQLite d'abord (mobile)
    if (isSQLiteAvailable()) {
      try {
        const sqlFournisseurs = await sqliteGetFournisseurs();
        if (sqlFournisseurs && sqlFournisseurs.length > 0) {
          setFournisseurs(sqlFournisseurs);
        }
      } catch (e) {
        console.warn('[Fournisseurs] Lecture locale SQLite:', e);
      }
    }

    // 2. Tenter l'API serveur
    try {
      const res = await api.get('/fournisseurs?limit=100');
      if (res.data?.success) {
        setFournisseurs(res.data.data);
        setIsOffline(false);
        try {
          localStorage.setItem('pani_offline_fournisseurs', JSON.stringify(res.data.data));
        } catch (_) {}

        // Répliquer dans SQLite
        if (isSQLiteAvailable()) {
          for (const f of res.data.data) {
            try {
              await sqliteUpsertFournisseur(f);
            } catch (_) {}
          }
        }
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn('[Fournisseurs] Serveur inaccessible, repli hors-ligne...');
      setIsOffline(true);
    }

    // 3. Fallback localStorage si non résolu par SQLite
    if (!isSQLiteAvailable()) {
      try {
        const cached = localStorage.getItem('pani_offline_fournisseurs');
        if (cached) {
          setFournisseurs(JSON.parse(cached));
        }
      } catch (_) {}
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchFournisseurs();
  }, []);

  const handleCreateFournisseur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    setSubmitting(true);
    setFournisseurError(null);
    try {
      const res = await api.post('/fournisseurs', {
        nom,
        contact,
        telephone,
        adresse,
        email,
      });
      if (res.data?.success) {
        setCreateModalOpen(false);
        setNom('');
        setContact('');
        setTelephone('');
        setAdresse('');
        setEmail('');
        fetchFournisseurs();
      }
    } catch (err: any) {
      const isOfflineErr = !err.response || err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';
      if (isOfflineErr) {
        // Enregistrement hors-ligne dans localStorage
        try {
          const cached = JSON.parse(localStorage.getItem('pani_offline_fournisseurs_pending') || '[]');
          cached.push({ nom, contact, telephone, adresse, email, localId: Date.now() });
          localStorage.setItem('pani_offline_fournisseurs_pending', JSON.stringify(cached));
        } catch (_) {}
        setCreateModalOpen(false);
        setNom(''); setContact(''); setTelephone(''); setAdresse(''); setEmail('');
        fetchFournisseurs();
      } else {
        setFournisseurError(err.response?.data?.message || 'Erreur lors de la création du fournisseur');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaiementFournisseur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFournisseur || !montantPaiement || Number(montantPaiement) <= 0) return;

    setSubmitting(true);
    setPaiementError(null);
    try {
      const res = await api.post(`/fournisseurs/${selectedFournisseur.id}/paiements`, {
        montant: Number(montantPaiement),
        modePaiement,
        notes: notesPaiement,
      });
      if (res.data?.success) {
        setPaiementModalOpen(false);
        setMontantPaiement('');
        setNotesPaiement('');
        fetchFournisseurs();
      }
    } catch (err: any) {
      setPaiementError(err.response?.data?.message || 'Erreur lors du paiement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoirReleve = async (f: any) => {
    setSelectedFournisseur(f);
    try {
      const res = await api.get(`/fournisseurs/${f.id}/releve`);
      if (res.data?.success) {
        setReleveData(res.data.data);
        setReleveModalOpen(true);
      }
    } catch (err) {
      console.error('Erreur relevé fournisseur:', err);
    }
  };

  const totalDettesFournisseurs = fournisseurs.reduce((acc, f) => acc + (f.totalDette || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header Compact */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Fournisseurs & Dettes</h1>
          <p className="text-xs text-slate-500">Gestion des approvisionnements en Pani et créances</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setCreateModalOpen(true)}
          icon={<PlusCircle className="h-4 w-4" />}
        >
          <span className="hidden sm:inline">Nouveau Fournisseur</span>
          <span className="sm:hidden">Ajouter</span>
        </Button>
      </div>

      {/* Bannière Hors-Ligne */}
      {isOffline && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-800 text-xs sm:text-sm font-medium">
            <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Mode hors-ligne — Données locales sauvegardées</span>
          </div>
          <button
            onClick={() => fetchFournisseurs()}
            className="text-xs text-amber-700 hover:text-amber-900 font-semibold underline shrink-0"
          >
            Actualiser
          </button>
        </div>
      )}

      {/* Dette Globale Fournisseurs - Vitrine Sobre */}
      <div className="bg-white border border-neutral-200/90 rounded-lg p-3.5 sm:p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 bg-neutral-100 text-neutral-800 rounded border border-neutral-200">
            <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <div className="text-[10px] sm:text-xs font-serif uppercase tracking-widest text-neutral-500">
              Total Dettes Dues aux Fournisseurs
            </div>
            <div className="text-xl sm:text-2xl font-bold font-serif text-neutral-900 mt-0.5">
              {formatFCFA(totalDettesFournisseurs)}
            </div>
          </div>
        </div>
      </div>

      {/* Liste Fournisseurs */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200/80 bg-white p-4 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 w-28 bg-slate-200 rounded" />
                <div className="h-5 w-16 bg-slate-200 rounded-full" />
              </div>
              <div className="h-3 w-36 bg-slate-100 rounded mb-4" />
              <div className="h-8 bg-slate-100 rounded-lg" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {fournisseurs.map((f) => (
            <Card key={f.id} className="flex flex-col justify-between hover:shadow-card-hover transition-all p-3.5 sm:p-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">{f.nom}</h3>
                    {f.contact && <div className="text-xs text-slate-500 truncate">Contact: {f.contact}</div>}
                  </div>
                  {f.aDette || Number(f.totalDette || 0) > 0 ? (
                    <Badge variant="danger" size="xs">Dette : {formatFCFA(f.totalDette)}</Badge>
                  ) : (
                    <Badge variant="success" size="xs">À jour</Badge>
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

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
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
                    className="flex-1"
                  >
                    Payer
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL CRÉER FOURNISSEUR */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => { setCreateModalOpen(false); setFournisseurError(null); }}
        title="Ajouter un Fournisseur"
        maxWidth="md"
      >
        <form onSubmit={handleCreateFournisseur} className="space-y-4">
          {fournisseurError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {fournisseurError}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nom Entreprise / Fournisseur *</label>
            <input
              type="text"
              required
              placeholder="Ex: Société Distribution Pani Mali"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom du Contact</label>
              <input
                type="text"
                placeholder="Ex: M. Ousmane Diarra"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
              <input
                type="tel"
                placeholder="Ex: +223 20 22 00 00"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse</label>
            <input
              type="text"
              placeholder="Ex: Zone Industrielle Sotuba"
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
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL PAIEMENT FOURNISSEUR */}
      <Modal
        isOpen={paiementModalOpen}
        onClose={() => { setPaiementModalOpen(false); setPaiementError(null); }}
        title={`Règlement Dette Fournisseur: ${selectedFournisseur?.nom || ''}`}
        maxWidth="md"
      >
        <form onSubmit={handlePaiementFournisseur} className="space-y-4">
          {paiementError && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {paiementError}
            </div>
          )}
          <div className="p-3 bg-slate-100 rounded-lg text-xs flex justify-between items-center">
            <span className="text-slate-600 font-semibold">Dette totale due :</span>
            <span className="font-bold text-slate-900 text-sm">{formatFCFA(selectedFournisseur?.totalDette)}</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Montant à décaisser (F CFA) *</label>
            <input
              type="number"
              min="1"
              required
              value={montantPaiement}
              onChange={(e) => setMontantPaiement(e.target.value)}
              className="w-full p-2.5 text-base font-bold text-rose-600 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mode de décaissement</label>
            <select
              value={modePaiement}
              onChange={(e) => setModePaiement(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
            >
              <option value="especes">Espèces (Décaissement automatique de Caisse)</option>
              <option value="virement">Virement bancaire / Chèque</option>
              <option value="orange_money">Mobile Money</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setPaiementModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="danger" size="md" type="submit" isLoading={submitting} className="font-bold shadow-sm">
              Valider le paiement
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL RELEVÉ FOURNISSEUR */}
      <Modal
        isOpen={releveModalOpen}
        onClose={() => setReleveModalOpen(false)}
        title={`Relevé Fournisseur: ${releveData?.fournisseur?.nom || ''}`}
        maxWidth="lg"
      >
        {releveData && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border text-center font-bold">
              <div>
                <span className="text-slate-500 font-normal block">Total Achats</span>
                <span className="text-slate-900">{formatFCFA(releveData.recapitulatif.totalAchats)}</span>
              </div>
              <div>
                <span className="text-slate-500 font-normal block">Total Payé</span>
                <span className="text-emerald-700">{formatFCFA(releveData.recapitulatif.totalPaye)}</span>
              </div>
              <div>
                <span className="text-slate-500 font-normal block">Reste Dû</span>
                <span className="text-rose-600">{formatFCFA(releveData.recapitulatif.resteAPayer)}</span>
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


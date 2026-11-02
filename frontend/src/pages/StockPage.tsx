import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { pushLocalChanges } from '../lib/sync';
import { isSQLiteAvailable, sqliteGetProduits, sqliteCreateLocalAjustement, sqliteCreateLocalTarif } from '../lib/sqlite';
import { formatDateTime } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  Package,
  ArrowDownRight,
  ArrowUpRight,
  AlertTriangle,
  History,
  SlidersHorizontal,
  Plus,
} from 'lucide-react';

export const StockPage: React.FC = () => {
  const { hasRole } = useAuth();
  const [stockList, setStockList] = useState<any[]>([]);
  const [mouvements, setMouvements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAjustementOpen, setModalAjustementOpen] = useState(false);
  const [modalNouveauTarifOpen, setModalNouveauTarifOpen] = useState(false);

  // Form ajustement
  const [ajustementProdId, setAjustementProdId] = useState<string>('');
  const [ajustementType, setAjustementType] = useState<string>('sortie_perte');
  const [ajustementQte, setAjustementQte] = useState<string>('');
  const [ajustementMotif, setAjustementMotif] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Form nouveau tarif
  const [nouveauTarifDesignation, setNouveauTarifDesignation] = useState('');
  const [nouveauTarifPrix, setNouveauTarifPrix] = useState('');

  const fetchData = async () => {
    setLoading(true);
    // 1. Lire d'abord depuis SQLite si disponible
    if (isSQLiteAvailable()) {
      try {
        const sqlProds = await sqliteGetProduits();
        if (sqlProds && sqlProds.length > 0) {
          setStockList(sqlProds.map(p => ({
            produitId: p.server_id || p.id,
            nom: p.nom,
            unite: p.unite,
            stockActuel: p.quantite_stock || 0,
            seuilAlerte: p.seuil_alerte || 10,
            tarifs: p.tarifs || [],
          })));
        }
      } catch (sqlErr) {
        console.warn('SQLite fetch stock:', sqlErr);
      }
    }

    // 2. Synchroniser depuis PostgreSQL via l'API
    try {
      const [stkRes, mvtRes] = await Promise.all([
        api.get('/stock'),
        api.get('/stock/mouvements?limit=25'),
      ]);
      if (stkRes.data?.data) {
        setStockList(stkRes.data.data);
        if (stkRes.data.data[0]) setAjustementProdId(stkRes.data.data[0].produitId.toString());
      }
      if (mvtRes.data?.data) setMouvements(mvtRes.data.data);
    } catch (err) {
      console.warn('Erreur chargement stock serveur (mode hors-ligne):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAjustement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ajustementQte || Number(ajustementQte) <= 0) return;

    setSubmitting(true);

    const ajustData = {
      produitId: parseInt(ajustementProdId),
      typeOperation: ajustementType,
      quantite: Number(ajustementQte),
      motif: ajustementMotif,
    };

    // 1. ENREGISTREMENT LOCAL EN PREMIER
    if (isSQLiteAvailable()) {
      try {
        await sqliteCreateLocalAjustement(ajustData);
      } catch (_) {}
    }

    // 2. FERMER ET RAFRAÎCHIR
    setModalAjustementOpen(false);
    setAjustementQte('');
    setAjustementMotif('');
    fetchData();
    setSubmitting(false);

    // 3. SYNCHRO ARRIÈRE-PLAN
    setTimeout(async () => {
      try {
        await api.post('/stock/ajustement', ajustData);
      } catch (_) {}
      pushLocalChanges().catch(() => {});
    }, 200);
  };

  const handleCreerTarif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nouveauTarifDesignation || !nouveauTarifPrix) return;

    setSubmitting(true);

    const defaultProd = stockList[0];
    const tarifData = {
      produitId: defaultProd?.produitId || 1,
      designation: nouveauTarifDesignation,
      prix: Number(nouveauTarifPrix),
    };

    // 1. ENREGISTREMENT LOCAL EN PREMIER
    if (isSQLiteAvailable()) {
      try {
        await sqliteCreateLocalTarif(tarifData);
      } catch (_) {}
    }

    // 2. FERMER ET RAFRAÎCHIR
    setModalNouveauTarifOpen(false);
    setNouveauTarifDesignation('');
    setNouveauTarifPrix('');
    fetchData();
    setSubmitting(false);

    // 3. SYNCHRO ARRIÈRE-PLAN
    setTimeout(async () => {
      try {
        await api.post('/produits/tarifs', tarifData);
      } catch (_) {}
      pushLocalChanges().catch(() => {});
    }, 200);
  };

  const getOperationBadge = (type: string) => {
    switch (type) {
      case 'entree':
        return <Badge variant="success">Entrée / Réception</Badge>;
      case 'sortie_vente':
        return <Badge variant="info">Sortie Vente</Badge>;
      case 'sortie_perte':
        return <Badge variant="danger">Perte déclarée</Badge>;
      case 'sortie_casse':
        return <Badge variant="danger">Casse déclarée</Badge>;
      case 'correction_inventaire':
        return <Badge variant="warning">Correction Inventaire</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Gestion des Stocks</h1>
          <p className="text-xs text-slate-500">Niveaux de stock, mouvements et gestion des tarifs</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalNouveauTarifOpen(true)}
            icon={<Plus className="h-3.5 w-3.5" />}
          >
            Nouveau Tarif
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalAjustementOpen(true)}
            icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          >
            Ajuster Stock
          </Button>
        </div>
      </div>

      {/* Stock Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {stockList.map((item) => (
          <Card key={item.produitId} className="border border-neutral-200 hover:border-neutral-300 p-4 shadow-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-serif uppercase tracking-widest text-neutral-400">Produit</span>
                <h3 className="text-xl font-bold font-serif text-neutral-900 mt-0.5">{item.nom}</h3>
                <p className="text-xs text-neutral-500 font-serif italic">{item.description}</p>
              </div>
              <div className="p-2.5 bg-neutral-100 text-neutral-800 rounded-md border border-neutral-200">
                <Package className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline justify-between">
              <div>
                <div className="text-xs text-slate-500">Stock Théorique Disponible</div>
                <div className={`text-3xl font-black mt-1 ${item.estFaible ? 'text-rose-600' : 'text-slate-900'}`}>
                  {item.stockActuel} <span className="text-sm font-medium text-slate-500">{item.unite}s</span>
                </div>
              </div>
              {item.estFaible && (
                <Badge variant="danger">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Stock Faible
                  </span>
                </Badge>
              )}
            </div>

            {/* Tarifs attachés */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-600 mb-2 block">
                Tarifs de vente configurés :
              </span>
              <div className="flex flex-wrap gap-1.5">
                {item.tarifs?.map((t: any) => (
                  <span
                    key={t.id}
                    className="inline-block px-2.5 py-1 text-xs rounded-md bg-slate-100 text-slate-800 font-semibold"
                  >
                    {t.designation}: {t.prix} F
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Historique des Mouvements de Stock */}
      <Card className="overflow-hidden p-0">
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold text-slate-900">Journal des Mouvements de Stock</h3>
          </div>
          <span className="text-xs text-slate-500">Chaque entrée/sortie est tracée</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Date & Heure</th>
                <th className="px-5 py-3.5">Produit</th>
                <th className="px-5 py-3.5">Type Opération</th>
                <th className="px-5 py-3.5 text-center">Quantité</th>
                <th className="px-5 py-3.5 text-right">Avant</th>
                <th className="px-5 py-3.5 text-right">Après</th>
                <th className="px-5 py-3.5">Motif / Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Chargement des mouvements...
                  </td>
                </tr>
              ) : mouvements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Aucun mouvement enregistré
                  </td>
                </tr>
              ) : (
                mouvements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">
                      {formatDateTime(m.dateMouvement)}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {m.produit?.nom || 'Pani'}
                    </td>
                    <td className="px-5 py-3.5">
                      {getOperationBadge(m.typeOperation)}
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold">
                      {['entree', 'retour_client'].includes(m.typeOperation) ? (
                        <span className="text-emerald-600 flex items-center justify-center gap-1">
                          <ArrowUpRight className="h-4 w-4" /> +{Number(m.quantite)}
                        </span>
                      ) : (
                        <span className="text-rose-600 flex items-center justify-center gap-1">
                          <ArrowDownRight className="h-4 w-4" /> -{Number(m.quantite)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-500 text-xs">
                      {Number(m.stockAvant)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                      {Number(m.stockApres)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      {m.motif || m.vente?.reference || m.achat?.reference || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL AJUSTEMENT DE STOCK */}
      <Modal
        isOpen={modalAjustementOpen}
        onClose={() => setModalAjustementOpen(false)}
        title="Ajustement Manuel du Stock"
        maxWidth="md"
      >
        <form onSubmit={handleAjustement} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Produit</label>
            <select
              value={ajustementProdId}
              onChange={(e) => setAjustementProdId(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
            >
              {stockList.map((p) => (
                <option key={p.produitId} value={p.produitId}>
                  {p.nom} (Dispo: {p.stockActuel})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Type d'ajustement</label>
            <select
              value={ajustementType}
              onChange={(e) => setAjustementType(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
            >
              <option value="sortie_perte">Sortie pour Perte</option>
              <option value="sortie_casse">Sortie pour Casse / Avarie</option>
              <option value="entree">Entrée manuelle de marchandise</option>
              <option value="correction_inventaire">Correction manuelle</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Quantité (unités)</label>
            <input
              type="number"
              min="1"
              required
              placeholder="Ex: 10"
              value={ajustementQte}
              onChange={(e) => setAjustementQte(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motif / Justification obligatoire
            </label>
            <textarea
              rows={2}
              required
              placeholder="Ex: Sac endommagé lors du transport, perte constatée..."
              value={ajustementMotif}
              onChange={(e) => setAjustementMotif(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalAjustementOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              Enregistrer l'ajustement
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL NOUVEAU PRIX/TARIF */}
      <Modal
        isOpen={modalNouveauTarifOpen}
        onClose={() => setModalNouveauTarifOpen(false)}
        title="Ajouter un Nouveau Prix pour Pani"
        maxWidth="md"
      >
        <form onSubmit={handleCreerTarif} className="space-y-4">
          <p className="text-xs text-slate-500">
            Selon les spécifications, de nouveaux prix peuvent être ajoutés dynamiquement sans modifier le code.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Désignation du tarif</label>
            <input
              type="text"
              required
              placeholder="Ex: Tarif Demi-gros, Tarif Spécial Ramadan..."
              value={nouveauTarifDesignation}
              onChange={(e) => setNouveauTarifDesignation(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Prix de vente (F CFA)</label>
            <input
              type="number"
              min="10"
              required
              placeholder="Ex: 1800"
              value={nouveauTarifPrix}
              onChange={(e) => setNouveauTarifPrix(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalNouveauTarifOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              Créer le Tarif
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


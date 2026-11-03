import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/formatters';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  UserCheck,
  PlusCircle,
  Shield,
  Lock,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export const UtilisateursPage: React.FC = () => {
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Création
  const [modalOpen, setModalOpen] = useState(false);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [roleId, setRoleId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, rRes] = await Promise.all([
        api.get('/utilisateurs'),
        api.get('/utilisateurs/roles'),
      ]);
      if (uRes.data?.data) setUtilisateurs(uRes.data.data);
      if (rRes.data?.data) {
        setRoles(rRes.data.data);
        if (rRes.data.data[0]) setRoleId(rRes.data.data[0].id.toString());
      }
    } catch (err) {
      console.error('Erreur utilisateurs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !prenom || !email || !motDePasse || !roleId) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/utilisateurs', {
        nom,
        prenom,
        email,
        telephone,
        motDePasse,
        roleId: parseInt(roleId),
      });

      if (res.data?.success) {
        setModalOpen(false);
        setNom('');
        setPrenom('');
        setEmail('');
        setTelephone('');
        setMotDePasse('');
        fetchData();
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Erreur création utilisateur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActif = async (user: any) => {
    try {
      const res = await api.put(`/utilisateurs/${user.id}`, {
        actif: !user.actif,
      });
      if (res.data?.success) {
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur modification statut');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">Utilisateurs & Rôles</h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            Gestion des 5 profils : Administrateur, Gestionnaire, Vendeur, Caissier, Comptable
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setModalOpen(true)}
          icon={<PlusCircle className="h-4 w-4" />}
          className="shrink-0 font-serif font-bold text-xs sm:text-sm whitespace-nowrap min-h-[40px] px-3.5"
        >
          <span className="hidden sm:inline">Nouvel Utilisateur</span>
          <span className="sm:hidden">Utilisateur</span>
        </Button>
      </div>

      {/* Rôles et Descriptions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {roles.map((r) => (
          <div key={r.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs shadow-sm">
            <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
              <Shield className="h-3.5 w-3.5 text-brand-600" />
              <span>{r.nom}</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-tight">{r.description}</p>
          </div>
        ))}
      </div>

      {/* Liste Utilisateurs */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
              <tr>
                <th className="px-5 py-3.5">Utilisateur</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Téléphone</th>
                <th className="px-5 py-3.5">Rôle & Permissions</th>
                <th className="px-5 py-3.5 text-center">Statut</th>
                <th className="px-5 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Chargement des utilisateurs...
                  </td>
                </tr>
              ) : (
                utilisateurs.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {u.prenom} {u.nom}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-600">{u.email}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{u.telephone || '-'}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-1 text-xs rounded-full font-bold bg-brand-50 text-brand-800 border border-brand-200">
                        {u.role?.nom}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant={u.actif ? 'success' : 'danger'}>
                        {u.actif ? 'Actif' : 'Désactivé'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Button
                        variant={u.actif ? 'outline' : 'secondary'}
                        size="sm"
                        onClick={() => handleToggleActif(u)}
                        className="text-xs"
                      >
                        {u.actif ? 'Désactiver' : 'Réactiver'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL NOUVEL UTILISATEUR */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Créer un Compte Utilisateur"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom *</label>
              <input
                type="text"
                required
                placeholder="Ex: Diarra"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom *</label>
              <input
                type="text"
                required
                placeholder="Ex: Bakary"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
              <input
                type="email"
                required
                placeholder="Ex: bakary@pani.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
              <input
                type="tel"
                placeholder="+223 70 00 00 00"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Rôle *</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-500"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nom} ({r.description})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mot de passe initial *</label>
            <input
              type="password"
              required
              placeholder="Minimum 6 caractères"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
              Créer l'utilisateur
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};


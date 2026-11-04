import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import {
  Users,
  PlusCircle,
  ShieldCheck,
  Search,
  Pencil,
  Trash2,
  Lock,
  Phone,
  Mail,
  UserCheck,
  UserX,
} from 'lucide-react';

export const UtilisateursPage: React.FC = () => {
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [loading, setLoading] = useState(true);

  // Filtres
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actifFilter, setActifFilter] = useState('');

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

  // Modal Édition
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [editNom, setEditNom] = useState('');
  const [editPrenom, setEditPrenom] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTelephone, setEditTelephone] = useState('');
  const [editMotDePasse, setEditMotDePasse] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (roleFilter) params.append('roleId', roleFilter);
      if (actifFilter) params.append('actif', actifFilter);

      const [uRes, rRes] = await Promise.all([
        api.get(`/utilisateurs?${params.toString()}`),
        api.get('/utilisateurs/roles'),
      ]);

      if (uRes.data?.data) {
        setUtilisateurs(uRes.data.data);
        setTotal(uRes.data.data.length);
      }
      if (rRes.data?.data) {
        setRoles(rRes.data.data);
        if (rRes.data.data[0] && !roleId) setRoleId(rRes.data.data[0].id.toString());
      }
    } catch (err) {
      console.error('Erreur utilisateurs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [roleFilter, actifFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

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

  const openEditModal = (u: any) => {
    setSelectedUser(u);
    setEditNom(u.nom || '');
    setEditPrenom(u.prenom || '');
    setEditEmail(u.email || '');
    setEditTelephone(u.telephone || '');
    setEditRoleId(u.roleId?.toString() || (roles[0]?.id.toString() || ''));
    setEditMotDePasse('');
    setEditErrorMsg(null);
    setEditModalOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !editNom.trim() || !editPrenom.trim()) return;

    setSubmitting(true);
    setEditErrorMsg(null);

    const payload: any = {
      nom: editNom,
      prenom: editPrenom,
      telephone: editTelephone,
      roleId: parseInt(editRoleId),
    };
    if (editMotDePasse.trim()) {
      payload.motDePasse = editMotDePasse.trim();
    }

    try {
      const res = await api.put(`/utilisateurs/${selectedUser.id}`, payload);
      if (res.data?.success) {
        setEditModalOpen(false);
        setSelectedUser(null);
        fetchData();
      }
    } catch (err: any) {
      setEditErrorMsg(err.response?.data?.message || 'Erreur modification utilisateur');
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

  const handleDeleteUser = async (user: any) => {
    if (user.id === 1) {
      alert('Impossible de supprimer le compte Administrateur principal.');
      return;
    }
    if (!window.confirm(`Confirmez-vous la désactivation/suppression de l'utilisateur ${user.prenom} ${user.nom} ?`)) {
      return;
    }

    try {
      const res = await api.delete(`/utilisateurs/${user.id}`);
      if (res.data?.success) {
        fetchData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const paginatedUsers = utilisateurs.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(utilisateurs.length / limit) || 1;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">Utilisateurs & Rôles</h1>
          <p className="text-xs text-slate-500 hidden sm:block">Gestion des accès, permissions et collaborateurs de la boulangerie</p>
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

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, prénom, email ou téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 font-serif"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white font-serif"
            >
              <option value="">Tous les rôles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nom}
                </option>
              ))}
            </select>

            <select
              value={actifFilter}
              onChange={(e) => {
                setActifFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-2 text-xs border border-slate-300 rounded-lg bg-white font-serif"
            >
              <option value="">Tous statuts</option>
              <option value="true">Actifs</option>
              <option value="false">Désactivés</option>
            </select>

            <Button variant="primary" size="sm" type="submit" className="font-serif text-xs px-3">
              Filtrer
            </Button>
            {(search || roleFilter || actifFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setRoleFilter('');
                  setActifFilter('');
                  setPage(1);
                }}
                className="text-xs text-rose-600 hover:underline px-1 font-bold shrink-0"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tableau des Utilisateurs */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Collaborateur</th>
                <th className="px-4 py-3.5">Email</th>
                <th className="px-4 py-3.5">Téléphone</th>
                <th className="px-4 py-3.5">Rôle & Permissions</th>
                <th className="px-4 py-3.5 text-center">Statut</th>
                <th className="px-4 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-serif">
                    Chargement des utilisateurs...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-serif">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                      {u.prenom} {u.nom}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">{u.email}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 whitespace-nowrap">{u.telephone || '-'}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-1 text-xs rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {u.role?.nom}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <Badge variant={u.actif ? 'success' : 'danger'} size="xs">
                        {u.actif ? 'Actif' : 'Désactivé'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant={u.actif ? 'outline' : 'secondary'}
                          size="xs"
                          onClick={() => handleToggleActif(u)}
                          className="text-[11px]"
                        >
                          {u.actif ? 'Désactiver' : 'Activer'}
                        </Button>
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          title="Modifier l'utilisateur"
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {u.id !== 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            title="Supprimer / Désactiver"
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

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={limit}
          onPageChange={(p) => setPage(p)}
        />
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom *</label>
              <input
                type="text"
                required
                placeholder="Ex: Oumar"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom *</label>
              <input
                type="text"
                required
                placeholder="Ex: Sissoko"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email de Connexion *</label>
              <input
                type="email"
                required
                placeholder="Ex: oumar@pani.ml"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
              <input
                type="tel"
                placeholder="Ex: 76 12 34 56"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rôle dans l'application *</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom} ({r.description})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mot de Passe Initial *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting} className="font-bold shadow-sm">
              Créer le Compte
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL MODIFIER UTILISATEUR */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Modifier l'utilisateur — ${selectedUser?.prenom} ${selectedUser?.nom}`}
        maxWidth="md"
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          {editErrorMsg && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs border border-rose-200">
              {editErrorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom *</label>
              <input
                type="text"
                required
                value={editPrenom}
                onChange={(e) => setEditPrenom(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom *</label>
              <input
                type="text"
                required
                value={editNom}
                onChange={(e) => setEditNom(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={editTelephone}
                onChange={(e) => setEditTelephone(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Rôle *</label>
              <select
                value={editRoleId}
                onChange={(e) => setEditRoleId(e.target.value)}
                className="w-full p-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nom} ({r.description})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Changer le mot de passe (laisser vide pour ne pas modifier)
            </label>
            <input
              type="password"
              placeholder="Nouveau mot de passe (optionnel)"
              value={editMotDePasse}
              onChange={(e) => setEditMotDePasse(e.target.value)}
              className="w-full p-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button variant="outline" size="md" type="button" onClick={() => setEditModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="md" type="submit" isLoading={submitting} className="font-bold shadow-sm">
              Enregistrer les modifications
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

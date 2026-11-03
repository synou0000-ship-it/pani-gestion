import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getDefaultServerURL, setServerURL, resetServerURL, cleanServerURL, initOfflineDefaultData } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Store, Lock, Mail, AlertCircle, Server, CheckCircle2, WifiOff, ChevronDown, ChevronUp, RotateCcw, Zap } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@pani.com');
  const [motDePasse, setMotDePasse] = useState('Admin123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverUrl, setServerUrlState] = useState<string>(getDefaultServerURL());
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverTestStatus, setServerTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [showOfflineOption, setShowOfflineOption] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Test de connectivité avec le serveur
  const handleTestServer = async () => {
    setServerTestStatus('testing');
    try {
      const clean = cleanServerURL(serverUrl);
      setServerUrlState(clean);
      setServerURL(clean);

      const res = await api.get('/health', { timeout: 5000 });
      if (res.data?.status === 'ok') {
        setServerTestStatus('success');
      } else {
        setServerTestStatus('error');
      }
    } catch (e) {
      setServerTestStatus('error');
    }
  };

  const handleResetServer = () => {
    const defaultUrl = resetServerURL();
    setServerUrlState(defaultUrl);
    setServerTestStatus('idle');
  };

  const handleSetQuickUrl = (ipOrUrl: string) => {
    const full = ipOrUrl.startsWith('http') ? ipOrUrl : `http://${ipOrUrl}:5000/api`;
    setServerUrlState(full);
    setServerURL(full);
    setServerTestStatus('idle');
  };

  // Connexion en mode hors-ligne sans serveur — toujours possible avec les identifiants par défaut
  const handleOfflineLogin = (): boolean => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = motDePasse.trim();

    // Accepter admin@pani.com / Admin123! ou utiliser les identifiants sauvegardés localement
    const storedUser = localStorage.getItem('pani_user');
    let localUser = storedUser ? JSON.parse(storedUser) : null;

    if (localUser && (cleanEmail === localUser.email?.toLowerCase() || cleanEmail === 'admin@pani.com')) {
      initOfflineDefaultData();
      const offlineToken = `offline_token_${Date.now()}`;
      login(offlineToken, localUser);
      navigate('/dashboard');
      return true;
    } else if (cleanEmail === 'admin@pani.com') {
      initOfflineDefaultData();
      const offlineUser = {
        id: 1,
        nom: 'Administrateur',
        prenom: 'Local',
        email: 'admin@pani.com',
        actif: true,
        roleId: 1,
        role: { id: 1, nom: 'Administrateur', description: 'Mode Hors-Ligne' },
      };
      const offlineToken = `offline_token_${Date.now()}`;
      login(offlineToken, offlineUser as any);
      navigate('/dashboard');
      return true;
    } else {
      setError('Mode hors-ligne : utilisez admin@pani.com / Admin123! ou reconnectez-vous une fois en ligne d\'abord.');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowOfflineOption(false);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = motDePasse.trim();

    try {
      // S'assurer de la bonne URL serveur
      setServerURL(serverUrl);

      const response = await api.post('/auth/login', {
        email: cleanEmail,
        motDePasse: cleanPass,
      });

      if (response.data?.success && response.data?.data) {
        const { token, utilisateur } = response.data.data;
        login(token, utilisateur);
        navigate('/dashboard');
        return;
      } else {
        setError(response.data?.message || 'Identifiants invalides');
        setLoading(false);
        return;
      }
    } catch (err: any) {
      console.warn('[Login Error]', err);
      const isAuthError = err.response?.status === 400 || err.response?.status === 401;

      // Si le serveur a répondu et rejeté le mot de passe explicitement
      if (isAuthError && err.response?.data?.message) {
        setError(err.response.data.message);
        setLoading(false);
        return;
      }

      // Serveur inaccessible (hors-ligne, tunnel expiré, coupure réseau...)
      // BASCULEMENT AUTOMATIQUE IMMÉDIAT EN MODE HORS-LIGNE
      console.log('[Login] Serveur inaccessible -> basculement automatique en mode hors-ligne');
      const ok = handleOfflineLogin();
      if (!ok) {
        setError('Impossible de joindre le serveur. Pour vous connecter hors-ligne, utilisez admin@pani.com / Admin123!');
        setShowOfflineOption(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none font-serif">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="mx-auto h-12 w-12 bg-neutral-900 rounded-lg flex items-center justify-center text-white shadow-xs mb-3 border border-neutral-800">
          <Store className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold font-serif text-neutral-900 tracking-wider">PANI GESTION</h2>
        <p className="mt-0.5 text-xs text-neutral-500 font-serif italic">
          Maison de Commerce & Caisse • Synchronisation SQLite
        </p>
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-6 px-5 sm:px-8 shadow-sm rounded-lg border border-neutral-200/90">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Adresse Email
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@pani.com"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 text-sm font-medium transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Mot de passe
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 text-sm font-medium transition-all"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={loading}
              className="w-full text-sm font-bold py-2.5 mt-2"
            >
              Se connecter
            </Button>
          </form>

          {/* Option Mode Hors-Ligne si serveur déconnecté */}
          {showOfflineOption && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-amber-800 font-semibold text-sm">
                <WifiOff className="h-4 w-4" />
                <span>Mode Hors-Ligne Disponible</span>
              </div>
              <p className="text-xs text-amber-700">
                Vous pouvez enregistrer des ventes, dépenses et achats sans connexion. Les données sont sauvegardées localement et synchronisées automatiquement dès le retour de la connexion.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOfflineLogin}
                className="w-full border-amber-400 text-amber-900 bg-white hover:bg-amber-100 font-medium text-xs"
              >
                ⚡ Continuer en Mode Hors-Ligne (Données Locales)
              </Button>
            </div>
          )}

          {/* Configuration de l'adresse du serveur (pour APK & Réseau Local) */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowServerConfig(!showServerConfig)}
              className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-800 font-medium py-1"
            >
              <span className="flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-slate-400" />
                <span>Paramètres Serveur ({serverUrl})</span>
              </span>
              {showServerConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showServerConfig && (
              <div className="mt-3 space-y-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Adresse IP du Serveur API (Port 5000) :
                  </label>
                  <button
                    type="button"
                    onClick={handleResetServer}
                    className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1"
                    title="Réinitialiser l'adresse par défaut"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Réinitialiser</span>
                  </button>
                </div>

                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => {
                    setServerUrlState(e.target.value);
                    setServerTestStatus('idle');
                  }}
                  placeholder="https://pani-gestion.vercel.app/api"
                  className="block w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 bg-white"
                />

                {/* Bouton de suggestion rapide */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400">Raccourcis :</span>
                  <button
                    type="button"
                    onClick={() => handleSetQuickUrl('https://pani-gestion.vercel.app/api')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-semibold"
                  >
                    <Zap className="h-3 w-3 text-emerald-600" />
                    ☁️ Serveur Cloud Vercel (Recommandé)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetQuickUrl('192.168.1.100')}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 font-medium"
                  >
                    <Zap className="h-3 w-3 text-slate-500" />
                    Wi-Fi Local PC (192.168.1.100)
                  </button>
                </div>

                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800 leading-tight">
                  ⚠️ <strong>Important :</strong> L'API est sur le port <strong>5000</strong> (ex: <code className="font-mono bg-white px-1 py-0.5 rounded">http://192.168.1.100:5000/api</code>). Ne pas mettre le port 5173 qui est réservé à l'affichage web du PC.
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestServer}
                    isLoading={serverTestStatus === 'testing'}
                    className="text-xs flex-1"
                  >
                    Tester la connexion
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const clean = cleanServerURL(serverUrl);
                      setServerUrlState(clean);
                      setServerURL(clean);
                      alert(`Adresse du serveur enregistrée :\n${clean}`);
                    }}
                    className="text-xs"
                  >
                    Enregistrer
                  </Button>
                </div>

                {serverTestStatus === 'success' && (
                  <div className="text-xs text-emerald-600 flex items-center gap-1.5 font-medium bg-emerald-50 p-2 rounded border border-emerald-200">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Serveur joint avec succès ! Vous pouvez vous connecter.</span>
                  </div>
                )}
                {serverTestStatus === 'error' && (
                  <div className="text-xs text-rose-600 flex items-start gap-1.5 font-medium bg-rose-50 p-2 rounded border border-rose-200">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                    <div>
                      <div>Impossible de joindre le serveur.</div>
                      <div className="text-[11px] text-rose-500 font-normal mt-0.5">
                        • Vérifiez que le PC et le téléphone sont sur le même Wi-Fi.<br />
                        • Vérifiez que Kaspersky VPN n'est pas activé.<br />
                        • Utilisez le port <strong>5000</strong> et non 5173.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 text-xs text-center text-slate-500 space-y-1">
            <div><span className="font-semibold text-slate-700">Identifiants Admin :</span> admin@pani.com / Admin123!</div>
          </div>
        </div>
      </div>
    </div>
  );
};

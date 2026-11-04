import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  PlusCircle,
  Package,
  Landmark,
  Receipt,
  Users,
  Truck,
  ClipboardList,
  BarChart3,
  UserCheck,
  X,
  Store,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { hasRole } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { to: '/ventes/nouvelle', label: 'Guichet Vente', icon: PlusCircle, badge: 'POS' },
    { to: '/ventes', label: 'Historique Ventes', icon: ShoppingCart },
    { to: '/stock', label: 'Stocks & Tarifs', icon: Package },
    { to: '/caisse', label: 'Caisse & Sessions', icon: Landmark },
    { to: '/depenses', label: 'Dépenses & Justifs', icon: Receipt },
    { to: '/clients', label: 'Clients & Dettes', icon: Users },
    { to: '/fournisseurs', label: 'Fournisseurs', icon: Truck },
    { to: '/achats', label: 'Achats & Commandes', icon: Store },
    { to: '/inventaire', label: 'Inventaires & Écarts', icon: ClipboardList },
    { to: '/rapports', label: 'Rapports Journaliers', icon: BarChart3 },
  ];

  if (hasRole('Administrateur')) {
    navItems.push({ to: '/utilisateurs', label: 'Utilisateurs & Rôles', icon: UserCheck });
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden transition-opacity duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar Vitrine Panel */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white text-slate-800 flex flex-col border-r border-slate-200/90 shadow-sm transition-transform duration-200 ease-out lg:translate-x-0 lg:static lg:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/80 bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-700 flex items-center justify-center text-white font-serif font-bold text-lg shadow-sm">
              P
            </div>
            <div>
              <div className="text-base font-bold font-serif text-slate-900 tracking-wider">
                PANI GESTION
              </div>
              <div className="text-[11px] text-emerald-800 font-serif font-bold uppercase tracking-widest">
                Commerce & Caisse
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3.5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3.5 py-2.5 rounded-lg text-[15px] font-serif transition-all duration-150 ${
                    isActive
                      ? 'bg-emerald-700 text-white font-bold shadow-sm shadow-emerald-700/25'
                      : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/90 font-medium'
                  }`
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="h-5 w-5 shrink-0 opacity-90 group-hover:opacity-100" />
                  <span className="truncate tracking-wide">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer info avec protection barre de navigation Android */}
        <div
          className="p-3.5 bg-slate-50/60 border-t border-slate-200/80 text-[13px] font-serif text-slate-700 flex items-center justify-between shrink-0"
          style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom, 14px))' }}
        >
          <span>Devise : <strong className="text-slate-900 font-serif">FCFA</strong></span>
          <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">v1.0 Pro</span>
        </div>
      </aside>
    </>
  );
};

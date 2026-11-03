import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import {
  LayoutDashboard,
  PlusCircle,
  ShoppingCart,
  Package,
  Menu,
} from 'lucide-react';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#fafafa] overflow-hidden select-none font-serif text-neutral-800">
      {/* Sidebar Navigation (Desktop & Mobile Drawer) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Content Container (with generous bottom padding on mobile for the bottom nav bar) */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 pb-28 lg:pb-6">
          <Outlet />
        </main>

        {/* Mobile Tactile Bottom Bar - Ergonomique, grand écran tactile, boutons faciles à cliquer */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/98 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1 pb-2 safe-bottom">
          <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
            {/* 1. Tableau de bord */}
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all active:scale-95 min-w-[54px] ${
                  isActive
                    ? 'text-emerald-700 font-bold bg-emerald-50/80 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              <span className="text-[11px] font-serif mt-0.5 tracking-tight">Tableau</span>
            </NavLink>

            {/* 2. Historique Ventes */}
            <NavLink
              to="/ventes"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all active:scale-95 min-w-[54px] ${
                  isActive
                    ? 'text-emerald-700 font-bold bg-emerald-50/80 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <ShoppingCart className="h-5 w-5 shrink-0" />
              <span className="text-[11px] font-serif mt-0.5 tracking-tight">Ventes</span>
            </NavLink>

            {/* 3. Bouton Central Héroïque : Guichet Nouvelle Vente (Grand Bouton Tactile) */}
            <NavLink
              to="/ventes/nouvelle"
              className="flex flex-col items-center justify-center flex-1 px-1 -mt-4 active:scale-90 transition-transform group"
              title="Nouvelle Vente"
            >
              <div className="h-12 w-12 rounded-full bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-700/35 border-3 border-white group-hover:bg-emerald-800 transition-colors">
                <PlusCircle className="h-6 w-6 stroke-[2.2]" />
              </div>
              <span className="text-[10px] font-serif font-bold text-emerald-800 mt-0.5 tracking-tight">
                Vente
              </span>
            </NavLink>

            {/* 4. Stocks & Tarifs */}
            <NavLink
              to="/stock"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all active:scale-95 min-w-[54px] ${
                  isActive
                    ? 'text-emerald-700 font-bold bg-emerald-50/80 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`
              }
            >
              <Package className="h-5 w-5 shrink-0" />
              <span className="text-[11px] font-serif mt-0.5 tracking-tight">Stocks</span>
            </NavLink>

            {/* 5. Menu Complet - Large cible tactile, impossible à manquer */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 active:scale-95 transition-all min-w-[54px] border border-slate-200/60 bg-slate-50/50"
              aria-label="Ouvrir le menu complet"
            >
              <Menu className="h-5 w-5 shrink-0 text-slate-700 stroke-[2.2]" />
              <span className="text-[11px] font-serif font-bold text-slate-800 mt-0.5 tracking-tight">
                Menu
              </span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

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

        {/* Content Container (with bottom padding on mobile for the bottom nav bar) */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 lg:p-6 pb-20 lg:pb-6">
          <Outlet />
        </main>

        {/* Mobile Tactile Bottom Bar - Vitrine Minimaliste */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-t border-neutral-200 shadow-[0_-2px_8px_rgba(0,0,0,0.03)] z-30 flex items-center justify-around px-2 safe-bottom">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 rounded text-[10px] font-serif transition-colors ${
                isActive ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-700'
              }`
            }
          >
            <LayoutDashboard className="h-4 w-4 mb-0.5" />
            <span>Tableau</span>
          </NavLink>

          <NavLink
            to="/ventes/nouvelle"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 rounded text-[10px] font-serif transition-colors ${
                isActive ? 'text-neutral-900 font-bold' : 'text-neutral-500 hover:text-neutral-900'
              }`
            }
          >
            <div className="h-7 w-7 rounded-full bg-neutral-900 text-white flex items-center justify-center -mt-2.5 shadow-sm border border-neutral-200">
              <PlusCircle className="h-4 w-4" />
            </div>
            <span className="mt-0.5 text-neutral-900 font-medium">Vente</span>
          </NavLink>

          <NavLink
            to="/ventes"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 rounded text-[10px] font-serif transition-colors ${
                isActive ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-700'
              }`
            }
          >
            <ShoppingCart className="h-4 w-4 mb-0.5" />
            <span>Ventes</span>
          </NavLink>

          <NavLink
            to="/stock"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 py-1 rounded text-[10px] font-serif transition-colors ${
                isActive ? 'text-neutral-900 font-bold' : 'text-neutral-400 hover:text-neutral-700'
              }`
            }
          >
            <Package className="h-4 w-4 mb-0.5" />
            <span>Stocks</span>
          </NavLink>

          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1 rounded text-[10px] font-serif text-neutral-400 hover:text-neutral-900 transition-colors"
            aria-label="Plus d'options"
          >
            <Menu className="h-4 w-4 mb-0.5" />
            <span>Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

import React from 'react';
import { ViewMode, AuthUser } from '../types';
import {
  LayoutDashboard,
  Send,
  Package,
  Truck,
  Users,
  History,
  Layers,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  pendingCount?: number;
  availableVehicles?: number;
  availableDrivers?: number;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  pendingCount = 0,
  availableVehicles = 0,
  availableDrivers = 0,
  currentUser,
  onLogout,
}) => {
  const navItems = [
    {
      id: 'overview' as ViewMode,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'dispatch' as ViewMode,
      label: 'Dispatch Center',
      icon: Send,
      badge: pendingCount > 0 ? `${pendingCount} Pending` : null,
      badgeColor: 'bg-teal-600 text-white animate-pulse',
      isPrimary: true,
    },
    {
      id: 'deliveries' as ViewMode,
      label: 'Deliveries',
      icon: Package,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'vehicles' as ViewMode,
      label: 'Vehicles',
      icon: Truck,
      badge: availableVehicles > 0 ? `${availableVehicles} Avail` : null,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'drivers' as ViewMode,
      label: 'Drivers',
      icon: Users,
      badge: availableDrivers > 0 ? `${availableDrivers} Avail` : null,
      badgeColor: 'bg-slate-100 text-slate-700',
    },
    {
      id: 'history' as ViewMode,
      label: 'Assignment History',
      icon: History,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-slate-300 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-inner">
            <Layers className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              Fleet<span className="text-teal-400">Wise</span>
            </h1>
            <span className="text-[10px] text-teal-300/80 tracking-wider uppercase font-medium">Enterprise Logistics</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 font-medium leading-relaxed italic border-l-2 border-teal-500/40 pl-2">
          “Every delivery. The right vehicle. Zero conflicts.”
        </p>
      </div>

      {/* Primary Navigation Menu */}
      <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
          Operations Hub
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? item.isPrimary
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-950/40'
                    : 'bg-slate-800 text-white shadow-sm'
                  : item.isPrimary
                  ? 'text-teal-300 hover:bg-slate-800/80 hover:text-white'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive
                      ? 'text-white'
                      : item.isPrimary
                      ? 'text-teal-400'
                      : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Session Profile */}
      {currentUser && (
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-teal-600/30 border border-teal-500/40 text-teal-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                {currentUser.name.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate flex items-center gap-1">
                <span className="truncate">{currentUser.name}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate flex items-center gap-1">
                <span>@{currentUser.user_id}</span>
                {currentUser.auth_provider === 'google' && (
                  <span className="text-[9px] bg-red-950/80 text-red-300 border border-red-800/40 px-1 rounded">
                    Google
                  </span>
                )}
              </div>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
};

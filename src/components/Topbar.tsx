import React, { useState, useEffect } from 'react';
import { Clock, Plus, LogOut } from 'lucide-react';
import { AuthUser } from '../types';

interface TopbarProps {
  onRefresh?: () => void;
  onOpenCreateDelivery: () => void;
  isDbConnected?: boolean;
  onNotification?: (msg: string, type: 'success' | 'error') => void;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenCreateDelivery,
  currentUser,
  onLogout,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between shrink-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      {/* Left: Time */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>{currentTime || 'Synchronizing...'}</span>
      </div>

      {/* Right: Actions & User Info */}
      <div className="flex items-center gap-3">
        {/* Quick New Delivery */}
        <button
          onClick={onOpenCreateDelivery}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-xs hover:shadow"
        >
          <Plus className="w-4 h-4" />
          <span>New Delivery</span>
        </button>

        {/* Current User Session Profile */}
        {currentUser && (
          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="text-left hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 leading-tight">{currentUser.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">@{currentUser.user_id}</div>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign out"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors ml-1"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

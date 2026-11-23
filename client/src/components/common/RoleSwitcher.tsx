import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ChevronDown, LogOut } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { currentUser, logout } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block text-left z-40">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-xs text-slate-200 transition-colors shadow-sm"
        title="Account menu"
      >
        <span className="w-2 h-2 rounded-full bg-[#00BFA6] animate-pulse"></span>
        <span className="font-semibold text-white">
          {currentUser ? `${currentUser.name} (${currentUser.role})` : 'Guest Mode'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-200 py-2 z-40 text-xs">
            <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Signed-in account</span>
              <span className="text-[#00BFA6]">{currentUser?.role || 'Guest'}</span>
            </div>
            <div className="p-2">
              {currentUser ? (
                <button
                  onClick={() => {
                    logout();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-slate-800 text-slate-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              ) : (
                <div className="px-3 py-2 text-slate-400">Sign in to manage your account.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};


import React from 'react';
import { User } from '../types';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onRefresh, isLoading }) => {
  return (
    <header className="sticky top-0 z-50 w-full glass-morphism border-b border-white/5 py-4 px-6 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-lg shadow-indigo-900/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            BidMaster <span className="text-indigo-500">Pro</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:gap-8 text-sm">
          <div className="flex flex-col border-l border-white/10 pl-5">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">Identified As</span>
            <span className="font-bold text-slate-100">{user.name}</span>
          </div>
          
          <div className="flex flex-col border-l border-white/10 pl-5">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">Liquidity</span>
            <span className="font-black text-indigo-400 text-lg tracking-tight">${user.walletBalance.toLocaleString()}</span>
          </div>

          <div className="flex flex-col border-l border-white/10 pl-5">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-0.5">Power Score</span>
            <span className="font-black text-amber-500 text-lg">{user.powerScore}</span>
          </div>

          <div className="flex items-center gap-3 border-l border-white/10 pl-5">
            <button 
              onClick={onRefresh}
              className={`p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-white/5 ${isLoading ? 'animate-spin' : ''}`}
              title="Sync Data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button 
              onClick={onLogout}
              className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl font-bold transition-all border border-rose-500/10"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

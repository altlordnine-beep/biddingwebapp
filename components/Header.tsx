
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
    <header className="sticky top-0 z-50 w-full glass-morphism border-b border-slate-200 py-3 px-6 shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 text-white p-2 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            BidMaster Pro
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:gap-6 text-sm">
          <div className="flex flex-col border-l border-slate-200 pl-4">
            <span className="text-slate-500 text-xs font-medium uppercase">User</span>
            <span className="font-semibold">{user.name} (ID: {user.id})</span>
          </div>
          
          <div className="flex flex-col border-l border-slate-200 pl-4">
            <span className="text-slate-500 text-xs font-medium uppercase">Wallet Balance</span>
            <span className="font-bold text-indigo-600">${user.walletBalance.toLocaleString()}</span>
          </div>

          <div className="flex flex-col border-l border-slate-200 pl-4">
            <span className="text-slate-500 text-xs font-medium uppercase">Power Score</span>
            <span className="font-bold text-amber-500">{user.powerScore}</span>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <button 
              onClick={onRefresh}
              className={`p-2 rounded-full hover:bg-slate-100 transition-colors ${isLoading ? 'animate-spin' : ''}`}
              title="Refresh Data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button 
              onClick={onLogout}
              className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition-colors"
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

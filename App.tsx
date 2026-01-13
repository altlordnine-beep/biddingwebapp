
import React, { useState, useEffect, useCallback } from 'react';
import { User, BiddingItem, BidRecord, LogRecord, Winner, ItemStatus, UserRole } from './types';
import { sheetsService } from './services/sheetsService';
import Header from './components/Header';
import BiddingItemCard from './components/BiddingItemCard';
import BidModal from './components/BidModal';
import AdminPanel from './components/AdminPanel';
import { BID_TIME_EXTENSION_MINUTES } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<BiddingItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<BiddingItem | null>(null);
  const [view, setView] = useState<'home' | 'admin'>('home');
  const [loginForm, setLoginForm] = useState({ id: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await sheetsService.fetchData();
      setItems(data.items || []);
      setUsers(data.users || []);
      setBids(data.bids || []);
      setLogs(data.logs || []);
      setWinners(data.winners || []);
      
      if (user) {
        const freshUser = data.users.find(u => u.id === user.id);
        if (freshUser) {
          setUser(freshUser);
        }
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
    // Check for existing session
    const savedUser = localStorage.getItem('bidmaster_session_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('bidmaster_session_user');
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = users.find(u => u.id.toLowerCase() === loginForm.id.toLowerCase() && u.password === loginForm.password);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('bidmaster_session_user', JSON.stringify(foundUser));
      setView('home');
      setLoginError('');
      setLoginForm({ id: '', password: '' });
      
      sheetsService.addLog({
        userId: foundUser.id,
        userName: foundUser.name,
        action: 'LOGIN',
        description: `User ${foundUser.id} session established via secure gateway.`
      });
    } else {
      setLoginError('Invalid Identification ID or Access Key.');
    }
  };

  const handleLogout = () => {
    if (user) {
      sheetsService.addLog({
        userId: user.id,
        userName: user.name,
        action: 'LOGOUT',
        description: 'Secure session terminated.'
      });
    }
    setUser(null);
    localStorage.removeItem('bidmaster_session_user');
    setView('home');
    setSelectedItem(null);
  };

  const handlePlaceBid = async (itemId: string, amount: number): Promise<string | null> => {
    if (!user) return "Security Exception: Session invalid.";

    const item = items.find(i => i.id === itemId);
    if (!item) return "Data Error: Asset not found in registry.";

    const hasExistingBidder = item.highestBidUserId && item.highestBidUserId !== '';
    const previousBidderId = item.highestBidUserId;
    const previousAmount = item.highestBidAmount;
    
    const isTie = amount === item.highestBidAmount && hasExistingBidder;
    
    const newEndTime = new Date(new Date(item.endTime).getTime() + BID_TIME_EXTENSION_MINUTES * 60 * 1000).toISOString();
    
    const updatedItems = items.map(i => i.id === itemId ? {
      ...i,
      highestBidAmount: amount,
      highestBidUserName: user.name,
      highestBidUserId: user.id,
      endTime: newEndTime,
      isTie: isTie
    } : i);

    let updatedUsers = users.map(u => {
      if (u.id === user.id) {
        return { ...u, walletBalance: u.walletBalance - amount };
      }
      if (hasExistingBidder && u.id === previousBidderId && !isTie) {
        return { ...u, walletBalance: u.walletBalance + previousAmount };
      }
      return u;
    });

    const newBid: BidRecord = {
      id: Math.random().toString(36).substr(2, 9),
      itemId,
      userId: user.id,
      userName: user.name,
      bidAmount: amount,
      timestamp: new Date().toISOString(),
      type: 'PLACE'
    };

    const newBids = [newBid, ...bids];

    const newState = {
      currentUser: user,
      items: updatedItems,
      users: updatedUsers,
      bids: newBids,
      logs: logs,
      winners: winners
    };

    await sheetsService.updateState(newState);
    
    sheetsService.addLog({
      userId: user.id,
      userName: user.name,
      action: isTie ? 'MATCH_BID' : 'PLACE_BID',
      description: `${isTie ? 'Matched' : 'Authorized'} $${amount} offer on ${item.name}.`
    });

    setItems(updatedItems);
    setUsers(updatedUsers);
    setBids(newBids);
    
    const updatedMe = updatedUsers.find(u => u.id === user.id);
    if (updatedMe) {
        setUser(updatedMe);
        localStorage.setItem('bidmaster_session_user', JSON.stringify(updatedMe));
    }

    return null;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-900/10 blur-[160px] rounded-full"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-violet-900/10 blur-[160px] rounded-full"></div>

        <div className="glass-morphism p-8 md:p-12 rounded-[48px] w-full max-w-md border border-white/5 shadow-2xl relative z-10 animate-fade-in">
          <div className="text-center mb-10">
            <div className="inline-flex bg-indigo-600/15 p-5 rounded-3xl text-indigo-400 mb-6 border border-indigo-500/20 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Secure Gateway</h1>
            <p className="text-slate-400 text-sm font-medium">Identify to access BidMaster Pro Registry</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Personnel ID</label>
              <input 
                type="text" 
                required
                placeholder="Ex: U001"
                className="w-full bg-slate-800/40 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm placeholder-slate-600 focus:ring-1 focus:ring-indigo-500/50 focus:bg-slate-800 outline-none transition-all font-semibold"
                value={loginForm.id}
                onChange={e => setLoginForm({...loginForm, id: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Secure Key</label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                className="w-full bg-slate-800/40 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm placeholder-slate-600 focus:ring-1 focus:ring-indigo-500/50 focus:bg-slate-800 outline-none transition-all"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              />
            </div>
            {loginError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/15 text-rose-400 text-xs font-bold text-center rounded-2xl animate-shake">
                {loginError}
              </div>
            )}
            <button 
              type="submit" 
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-900/30 hover:bg-indigo-500 transition-all active:scale-[0.97] text-xs uppercase tracking-widest glow-indigo"
            >
              Verify Session
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-3">System Defaults</p>
            <div className="flex flex-col gap-1 text-[10px] font-bold text-slate-500">
              <span>Admin: <span className="text-indigo-400">U001 / password</span></span>
              <span>User: <span className="text-indigo-400">U002 / user123</span></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen bg-slate-950 pb-20 selection:bg-indigo-500 selection:text-white">
      <Header 
        user={user} 
        onLogout={handleLogout} 
        onRefresh={refreshData}
        isLoading={isLoading}
      />

      <main className="max-w-6xl mx-auto px-6 pt-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {view === 'home' ? 'Active Markets' : 'Control Center'}
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-1">
              {view === 'home' 
                ? 'Authorized bidding channels for registered assets.' 
                : 'Administrative protocols and ledger oversight.'}
            </p>
          </div>

          <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 shadow-inner backdrop-blur-md w-fit animate-fade-in">
            <button 
              onClick={() => setView('home')}
              className={`px-8 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${view === 'home' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Auctions
            </button>
            {isAdmin && (
              <button 
                onClick={() => setView('admin')}
                className={`px-8 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${view === 'admin' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Management
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="w-12 h-12 border-[4px] border-indigo-600/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] animate-pulse">Synchronizing Global Ledger...</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {view === 'home' ? (
              <div className="grid grid-cols-1 gap-8">
                {items.length > 0 ? items.map(item => (
                  <BiddingItemCard 
                    key={item.id} 
                    item={item} 
                    bids={bids}
                    onClick={setSelectedItem} 
                  />
                )) : (
                  <div className="text-center py-32 bg-slate-900/30 rounded-[48px] border border-dashed border-white/10">
                    <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">No active asset channels detected.</p>
                  </div>
                )}
              </div>
            ) : (
              isAdmin && (
                <AdminPanel 
                  users={users} 
                  items={items} 
                  winners={winners} 
                  logs={logs}
                  onUpdateItems={async (newItems) => {
                    setItems(newItems);
                    await sheetsService.updateState({ ...sheetsService as any, items: newItems, users, bids, logs, winners, currentUser: user });
                  }}
                  onUpdateUsers={async (newUsers) => {
                    setUsers(newUsers);
                    await sheetsService.updateState({ ...sheetsService as any, users: newUsers, items, bids, logs, winners, currentUser: user });
                  }}
                />
              )
            )}
          </div>
        )}
      </main>

      {selectedItem && (
        <BidModal 
          item={selectedItem}
          user={user}
          bids={bids}
          onClose={() => setSelectedItem(null)}
          onPlaceBid={handlePlaceBid}
        />
      )}

      <button 
        onClick={refreshData}
        className="fixed bottom-8 right-8 w-14 h-14 bg-white text-slate-950 rounded-2xl shadow-2xl flex items-center justify-center hover:bg-indigo-50 transition-all active:scale-90 z-40 md:hidden"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
};

export default App;

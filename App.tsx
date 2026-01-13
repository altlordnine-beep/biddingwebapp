
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, BiddingItem, BidRecord, LogRecord, Winner, ItemStatus, UserRole } from './types';
import { sheetsService } from './services/sheetsService';
import Header from './components/Header';
import BiddingItemCard from './components/BiddingItemCard';
import BidModal from './components/BidModal';
import AdminPanel from './components/AdminPanel';
import { BID_TIME_EXTENSION_MINUTES, AUTO_REFRESH_INTERVAL_MS, INITIAL_USERS } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<BiddingItem[]>([]);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS); // Default to initial to avoid login block
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BiddingItem | null>(null);
  const [view, setView] = useState<'home' | 'admin'>('home');
  const [loginForm, setLoginForm] = useState({ id: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const stateRef = useRef({ items, users, bids, logs, winners });

  useEffect(() => {
    stateRef.current = { items, users, bids, logs, winners };
  }, [items, users, bids, logs, winners]);

  const refreshData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsSyncing(true);

    try {
      const data = await sheetsService.fetchData();
      if (data) {
        setItems(data.items || []);
        setUsers(data.users || INITIAL_USERS);
        setBids(data.bids || []);
        setLogs(data.logs || []);
        setWinners(data.winners || []);
        
        if (user) {
          const freshUser = data.users?.find(u => u.id === user.id);
          if (freshUser) {
            setUser(freshUser);
            localStorage.setItem('bidmaster_session_user', JSON.stringify(freshUser));
          }
        }
      }
    } catch (err) {
      console.error("Failed to sync with Bidding Database:", err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [user]);

  useEffect(() => {
    // Initial fetch
    refreshData().catch(() => setIsLoading(false));
    
    // Recovery of local session
    const savedUser = localStorage.getItem('bidmaster_session_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('bidmaster_session_user');
      }
    }

    // Polling interval for real-time sync with Google Sheets
    const interval = setInterval(() => {
      refreshData(true);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const loginId = loginForm.id.trim().toUpperCase();
    const foundUser = users.find(u => u.id.toUpperCase() === loginId && u.password === loginForm.password);
    
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
        description: `Personnel ${foundUser.id} authorized for terminal access.`
      });
    } else {
      setLoginError('Authentication Failed: Identity or Access Key mismatch.');
    }
  };

  const handleLogout = () => {
    if (user) {
      sheetsService.addLog({
        userId: user.id,
        userName: user.name,
        action: 'LOGOUT',
        description: 'Session terminated by user.'
      });
    }
    setUser(null);
    localStorage.removeItem('bidmaster_session_user');
    setView('home');
    setSelectedItem(null);
  };

  const handlePlaceBid = async (itemId: string, amount: number): Promise<string | null> => {
    if (!user) return "Unauthorized: Please log in again.";

    const item = items.find(i => i.id === itemId);
    if (!item) return "Registry Error: Asset ID not found.";

    const hasExistingBidder = !!item.highestBidUserId;
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
      if (u.id === user.id) return { ...u, walletBalance: u.walletBalance - amount };
      if (hasExistingBidder && u.id === previousBidderId && !isTie) return { ...u, walletBalance: u.walletBalance + previousAmount };
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

    const newState = {
      currentUser: user,
      items: updatedItems,
      users: updatedUsers,
      bids: [newBid, ...bids],
      logs: logs,
      winners: winners
    };

    // Optimistic UI updates
    setItems(updatedItems);
    setUsers(updatedUsers);
    setBids(prev => [newBid, ...prev]);

    const success = await sheetsService.updateState(newState);
    if (!success) return "Database Error: Failed to commit bid to Bidding Database.";
    
    sheetsService.addLog({
      userId: user.id,
      userName: user.name,
      action: isTie ? 'MATCH_BID' : 'PLACE_BID',
      description: `Committed $${amount} bid for ${item.name}.`
    });

    return null;
  };

  if (!user && !isLoading) {
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
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2 uppercase tracking-widest">Login Terminal</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Connect to Bidding Database</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Identity ID</label>
              <input 
                type="text" 
                required
                placeholder="U001"
                className="w-full bg-slate-800/40 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm placeholder-slate-700 focus:ring-1 focus:ring-indigo-500/50 focus:bg-slate-800 outline-none transition-all font-semibold"
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
                className="w-full bg-slate-800/40 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm placeholder-slate-700 focus:ring-1 focus:ring-indigo-500/50 focus:bg-slate-800 outline-none transition-all"
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
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-900/30 hover:bg-indigo-500 transition-all active:scale-[0.97] text-xs uppercase tracking-[0.2em] glow-indigo"
            >
              Initialize Access
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-3">System Access Codes</p>
            <div className="flex flex-col gap-1 text-[9px] font-bold text-slate-500">
              <span>ADMIN: U001 / password</span>
              <span>USER: U002 / user123</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20 selection:bg-indigo-500 selection:text-white">
      {isLoading ? (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 border-[4px] border-indigo-600/20 border-t-indigo-500 rounded-full animate-spin mb-8"></div>
          <h2 className="text-white font-bold text-sm uppercase tracking-widest animate-pulse">Syncing Database</h2>
          <p className="text-slate-600 text-[10px] mt-2 uppercase tracking-widest">Establishing secure link...</p>
        </div>
      ) : (
        <>
          <Header 
            user={user!} 
            onLogout={handleLogout} 
            onRefresh={() => refreshData()}
            isLoading={isSyncing}
          />

          <main className="max-w-6xl mx-auto px-6 pt-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {view === 'home' ? 'Active Markets' : 'Control Hub'}
                </h2>
                <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-widest text-[10px]">
                  Real-time synchronization active
                </p>
              </div>

              <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 shadow-inner backdrop-blur-md w-fit animate-fade-in relative">
                <button 
                  onClick={() => setView('home')}
                  className={`px-8 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${view === 'home' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Assets
                </button>
                {user?.role === UserRole.ADMIN && (
                  <button 
                    onClick={() => setView('admin')}
                    className={`px-8 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${view === 'admin' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Settings
                  </button>
                )}
              </div>
            </div>

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
                      <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Registry is currently empty.</p>
                    </div>
                  )}
                </div>
              ) : (
                user?.role === UserRole.ADMIN && (
                  <AdminPanel 
                    users={users} 
                    items={items} 
                    winners={winners} 
                    logs={logs}
                    onUpdateItems={async (newItems) => {
                      setItems(newItems);
                      await sheetsService.updateState({ ...stateRef.current, items: newItems, currentUser: user });
                    }}
                    onUpdateUsers={async (newUsers) => {
                      setUsers(newUsers);
                      await sheetsService.updateState({ ...stateRef.current, users: newUsers, currentUser: user });
                    }}
                  />
                )
              )}
            </div>
          </main>

          {selectedItem && (
            <BidModal 
              item={selectedItem}
              user={user!}
              bids={bids}
              onClose={() => setSelectedItem(null)}
              onPlaceBid={handlePlaceBid}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, BiddingItem, BidRecord, LogRecord, Winner, ItemStatus, UserRole } from './types';
import { sheetsService } from './services/sheetsService';
import Header from './components/Header';
import BiddingItemCard from './components/BiddingItemCard';
import BidModal from './components/BidModal';
import AdminPanel from './components/AdminPanel';
import { BID_TIME_EXTENSION_MINUTES, AUTO_REFRESH_INTERVAL_MS } from './constants';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<BiddingItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BiddingItem | null>(null);
  const [view, setView] = useState<'home' | 'admin'>('home');
  const [loginForm, setLoginForm] = useState({ id: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Use ref to keep track of current items/users for the sync closure
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
        setUsers(data.users || []);
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
      console.error("Failed to fetch data from Bidding Database:", err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [user]);

  // Initial load and auto-polling for real-time sync
  useEffect(() => {
    refreshData();
    
    const interval = setInterval(() => {
      refreshData(true);
    }, AUTO_REFRESH_INTERVAL_MS);

    const savedUser = localStorage.getItem('bidmaster_session_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('bidmaster_session_user');
      }
    }

    return () => clearInterval(interval);
  }, [refreshData]);

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
        description: `Secure terminal access granted to ${foundUser.id}.`
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
        description: 'Session terminated securely.'
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
    if (!item) return "Data Error: Asset not found.";

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

    // Optimistic update
    setItems(updatedItems);
    setUsers(updatedUsers);
    setBids(newBids);

    const success = await sheetsService.updateState(newState);
    if (!success) return "Connection Error: Failed to sync with Bidding Database.";
    
    sheetsService.addLog({
      userId: user.id,
      userName: user.name,
      action: isTie ? 'MATCH_BID' : 'PLACE_BID',
      description: `Authorized $${amount} offer on ${item.name}.`
    });

    const updatedMe = updatedUsers.find(u => u.id === user.id);
    if (updatedMe) {
        setUser(updatedMe);
        localStorage.setItem('bidmaster_session_user', JSON.stringify(updatedMe));
    }

    return null;
  };

  const isAdmin = user?.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen bg-slate-950 pb-20 selection:bg-indigo-500 selection:text-white">
      <Header 
        user={user!} 
        onLogout={handleLogout} 
        onRefresh={() => refreshData()}
        isLoading={isLoading || isSyncing}
      />

      <main className="max-w-6xl mx-auto px-6 pt-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {view === 'home' ? 'Marketplace' : 'Management Hub'}
            </h2>
            <p className="text-slate-500 text-sm font-medium mt-1">
              {view === 'home' 
                ? 'Authorized bidding channels connected to Bidding Database.' 
                : 'Administrative overrides and database synchronization control.'}
            </p>
          </div>

          <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 shadow-inner backdrop-blur-md w-fit animate-fade-in relative">
            {isSyncing && (
              <div className="absolute -top-6 right-2 text-[8px] font-bold text-indigo-400 uppercase tracking-widest animate-pulse">
                Syncing Database...
              </div>
            )}
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
                Settings
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="w-12 h-12 border-[4px] border-indigo-600/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] animate-pulse">Connecting to Bidding Database Registry...</p>
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
                    <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">No active asset channels detected in database.</p>
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
        )}
      </main>

      {selectedItem && user && (
        <BidModal 
          item={selectedItem}
          user={user}
          bids={bids}
          onClose={() => setSelectedItem(null)}
          onPlaceBid={handlePlaceBid}
        />
      )}

      <button 
        onClick={() => refreshData()}
        className="fixed bottom-8 right-8 w-14 h-14 bg-white text-slate-950 rounded-2xl shadow-2xl flex items-center justify-center hover:bg-indigo-50 transition-all active:scale-90 z-40 md:hidden"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isLoading || isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
};

export default App;


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
      setItems(data.items);
      setUsers(data.users);
      setBids(data.bids);
      setLogs(data.logs);
      setWinners(data.winners);
      
      if (user) {
        const freshUser = data.users.find(u => u.id === user.id);
        if (freshUser) {
          setUser(freshUser);
          if (freshUser.role !== UserRole.ADMIN && view === 'admin') {
            setView('home');
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, view]);

  useEffect(() => {
    refreshData();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const foundUser = users.find(u => u.id === loginForm.id && u.password === loginForm.password);
    if (foundUser) {
      setUser(foundUser);
      setView('home');
      setLoginError('');
      setLoginForm({ id: '', password: '' });
      setSelectedItem(null);
      
      sheetsService.addLog({
        userId: foundUser.id,
        userName: foundUser.name,
        action: 'LOGIN',
        description: `User ${foundUser.id} session started.`
      });
    } else {
      setLoginError('Incorrect credentials. Please try again.');
    }
  };

  const handleLogout = () => {
    if (user) {
      sheetsService.addLog({
        userId: user.id,
        userName: user.name,
        action: 'LOGOUT',
        description: 'User session ended.'
      });
    }
    setUser(null);
    setView('home');
    setSelectedItem(null);
  };

  const handlePlaceBid = async (itemId: string, amount: number): Promise<string | null> => {
    if (!user) return "Session expired.";

    const item = items.find(i => i.id === itemId);
    if (!item) return "Item not found.";

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
      description: `${isTie ? 'Matched' : 'Placed'} $${amount} bid on ${item.name}.`
    });

    if (hasExistingBidder && previousBidderId && !isTie) {
      sheetsService.addLog({
        userId: previousBidderId,
        userName: item.highestBidUserName,
        action: 'REFUND',
        description: `Refunded $${previousAmount} for outbid on ${item.name}.`
      });
    }

    setItems(updatedItems);
    setUsers(updatedUsers);
    setBids(newBids);
    
    const updatedMe = updatedUsers.find(u => u.id === user.id);
    if (updatedMe) setUser(updatedMe);

    return null;
  };

  const updateAdminItems = async (newItems: BiddingItem[]) => {
    if (user?.role !== UserRole.ADMIN) return;
    setItems(newItems);
    await sheetsService.updateState({
      currentUser: user,
      items: newItems,
      users,
      bids,
      logs,
      winners
    });
  };

  const updateAdminUsers = async (newUsers: User[]) => {
    if (user?.role !== UserRole.ADMIN) return;
    setUsers(newUsers);
    await sheetsService.updateState({
      currentUser: user,
      items,
      users: newUsers,
      bids,
      logs,
      winners
    });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6 relative overflow-hidden">
        {/* Background Decorative Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-900/20 blur-[120px] rounded-full"></div>

        <div className="glass-morphism p-10 rounded-[40px] w-full max-w-md border border-white/5 shadow-2xl relative z-10 animate-fade-in">
          <div className="text-center mb-10">
            <div className="inline-flex bg-indigo-600/20 p-4 rounded-3xl text-indigo-400 mb-6 border border-indigo-500/20 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">BidMaster <span className="text-indigo-500">Pro</span></h1>
            <p className="text-slate-400 font-medium">Elevate your bidding experience</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Identity ID</label>
              <input 
                type="text" 
                required
                placeholder="U001"
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-4 px-6 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:bg-slate-800 outline-none transition-all font-semibold"
                value={loginForm.id}
                onChange={e => setLoginForm({...loginForm, id: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Access Key</label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-2xl py-4 px-6 text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:bg-slate-800 outline-none transition-all"
                value={loginForm.password}
                onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              />
            </div>
            {loginError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold text-center rounded-2xl animate-shake">
                {loginError}
              </div>
            )}
            <button 
              type="submit" 
              className="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 transition-all active:scale-[0.98] glow-indigo uppercase tracking-widest text-sm"
            >
              Enter Dashboard
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">System Access Details</p>
            <div className="flex justify-center gap-4 text-[11px] font-bold">
              <span className="text-slate-400">Admin: <span className="text-indigo-400">U001 / password</span></span>
              <span className="text-slate-400">User: <span className="text-indigo-400">U002 / user123</span></span>
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

      <main className="max-w-5xl mx-auto px-6 pt-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight">
              {view === 'home' ? 'Marketplace' : 'Management Console'}
            </h2>
            <p className="text-slate-400 font-medium mt-1">
              {view === 'home' 
                ? 'Curated high-value assets currently in auction.' 
                : 'Administrative controls for users and assets.'}
            </p>
          </div>

          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-white/5 shadow-inner w-fit">
            <button 
              onClick={() => setView('home')}
              className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${view === 'home' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Auctions
            </button>
            {isAdmin && (
              <button 
                onClick={() => setView('admin')}
                className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${view === 'admin' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Settings
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-16 h-16 border-[6px] border-indigo-600/20 border-t-indigo-500 rounded-full animate-spin mb-8"></div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing Encrypted Ledger...</p>
          </div>
        ) : (
          <div className="animate-fade-in">
            {view === 'home' ? (
              <div className="flex flex-col gap-8">
                {items.length > 0 ? items.map(item => (
                  <BiddingItemCard 
                    key={item.id} 
                    item={item} 
                    bids={bids}
                    onClick={setSelectedItem} 
                  />
                )) : (
                  <div className="col-span-full text-center py-32 bg-slate-900/50 rounded-[40px] border border-dashed border-white/5">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No Active Assets Identified</p>
                  </div>
                )}
              </div>
            ) : (
              isAdmin ? (
                <AdminPanel 
                  users={users} 
                  items={items} 
                  winners={winners} 
                  logs={logs}
                  onUpdateItems={updateAdminItems}
                  onUpdateUsers={updateAdminUsers}
                />
              ) : (
                <div className="text-center py-20 bg-rose-900/10 rounded-3xl border border-rose-500/20">
                  <p className="text-rose-400 font-bold">Unauthorized. Security protocols prevent access.</p>
                  <button onClick={() => setView('home')} className="mt-4 text-indigo-400 font-bold hover:underline">Return Home</button>
                </div>
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
        className="fixed bottom-10 right-10 w-16 h-16 bg-white text-slate-950 rounded-3xl shadow-2xl flex items-center justify-center hover:bg-slate-200 transition-all active:scale-90 z-40 md:hidden"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
};

export default App;


import React, { useState, useRef, useEffect } from 'react';
import { User, BiddingItem, Winner, LogRecord, ItemStatus, UserRole } from '../types';

interface AdminPanelProps {
  users: User[];
  items: BiddingItem[];
  winners: Winner[];
  logs: LogRecord[];
  onUpdateItems: (items: BiddingItem[]) => void;
  onUpdateUsers: (users: User[]) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ users, items, winners, logs, onUpdateItems, onUpdateUsers }) => {
  const [mainTab, setMainTab] = useState<'dashboard' | 'bidding'>('dashboard');
  const [biddingSubTab, setBiddingSubTab] = useState<'items' | 'winners' | 'logs'>('items');
  const [editingItem, setEditingItem] = useState<Partial<BiddingItem> & { durationMode?: 'hms' | 'fixed', durationH?: number, durationM?: number, durationS?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDeleteItem = (id: string) => {
    if (confirm('Permanently delete this asset from the database?')) {
      onUpdateItems(items.filter(i => i.id !== id));
    }
  };

  const handleStartBidding = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    let finalEndTime = item.endTime;
    if (new Date(item.endTime).getTime() <= Date.now()) {
      finalEndTime = new Date(Date.now() + 3600000).toISOString();
    }

    onUpdateItems(items.map(i => i.id === id ? {
      ...i, 
      status: ItemStatus.OPEN,
      endTime: finalEndTime
    } : i));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingItem(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveItem = () => {
    if (!editingItem?.name || !editingItem?.startingPrice) {
      alert("Missing required fields: Asset Title, Valuation.");
      return;
    }

    let calculatedEndTime = editingItem.endTime || new Date(Date.now() + 3600000).toISOString();

    if (editingItem.durationMode === 'hms') {
      const h = Number(editingItem.durationH || 0);
      const m = Number(editingItem.durationM || 0);
      const s = Number(editingItem.durationS || 0);
      const totalMs = (h * 3600 + m * 60 + s) * 1000;
      if (totalMs > 0) {
        calculatedEndTime = new Date(Date.now() + totalMs).toISOString();
      }
    }
    
    if (editingItem.id) {
      onUpdateItems(items.map(i => i.id === editingItem.id ? { 
        ...i, 
        ...editingItem, 
        endTime: calculatedEndTime 
      } as BiddingItem : i));
    } else {
      const newItem: BiddingItem = {
        id: 'I' + Math.random().toString(36).substr(2, 4).toUpperCase(),
        name: editingItem.name!,
        imageUrl: editingItem.imageUrl || 'https://picsum.photos/seed/placeholder/600/400',
        startingPrice: Number(editingItem.startingPrice),
        highestBidAmount: Number(editingItem.startingPrice),
        highestBidUserName: 'None',
        highestBidUserId: '',
        endTime: calculatedEndTime,
        status: ItemStatus.PENDING,
        isTie: false
      };
      onUpdateItems([...items, newItem]);
    }
    setEditingItem(null);
  };

  const toDatetimeLocal = (iso: string) => {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4 p-1.5 bg-slate-900 rounded-2xl w-fit border border-white/5">
        <button 
          onClick={() => setMainTab('dashboard')}
          className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${mainTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Personnel
        </button>
        <button 
          onClick={() => setMainTab('bidding')}
          className={`px-8 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${mainTab === 'bidding' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Assets
        </button>
      </div>

      <div className="bg-slate-900 rounded-[32px] border border-white/5 shadow-2xl overflow-hidden min-h-[600px] flex flex-col">
        {mainTab === 'dashboard' ? (
          <div className="p-10">
            <div className="mb-10">
              <h2 className="text-2xl font-black text-white tracking-tight">Active Personnel</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">Registry of all authorized participants and administrators.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 uppercase tracking-widest text-[10px] font-black">
                    <th className="pb-5 pl-4">Universal ID</th>
                    <th className="pb-5">Full Designation</th>
                    <th className="pb-5">Total Liquidity</th>
                    <th className="pb-5">Security Rank</th>
                    <th className="pb-5">Power Rating</th>
                    <th className="pb-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                      <td className="py-6 pl-4 font-mono font-bold text-slate-400 text-sm">{u.id}</td>
                      <td className="py-6 font-black text-slate-100">{u.name}</td>
                      <td className="py-6">
                        <span className="text-indigo-400 font-black text-lg">${u.walletBalance.toLocaleString()}</span>
                      </td>
                      <td className="py-6">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${u.role === UserRole.ADMIN ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-800 text-slate-400'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-6 font-black text-amber-500 text-lg">{u.powerScore}</td>
                      <td className="py-6">
                        <button className="text-slate-600 hover:text-indigo-400 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            <div className="flex border-b border-white/5 p-2 bg-slate-950/30">
              {(['items', 'winners', 'logs'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setBiddingSubTab(tab)}
                  className={`flex-1 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                    biddingSubTab === tab ? 'bg-slate-800 text-indigo-400 shadow-xl border border-white/5' : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
              {biddingSubTab === 'items' && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-widest">Global Asset Index</h3>
                      <p className="text-sm text-slate-500 font-medium">Lifecycle management for high-value auctions.</p>
                    </div>
                    <button 
                      onClick={() => setEditingItem({ durationMode: 'hms', durationH: 1, durationM: 0, durationS: 0 })}
                      className="bg-white text-slate-950 px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl shadow-white/5"
                    >
                      Initialize Asset
                    </button>
                  </div>

                  {editingItem && (
                    <div className="bg-slate-800/40 p-8 rounded-[32px] border-2 border-dashed border-white/10 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Asset Designation</label>
                          <input 
                            placeholder="e.g. Prototype X-1" 
                            className="w-full p-4 rounded-2xl border border-white/5 bg-slate-900 text-white placeholder-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/50"
                            value={editingItem.name || ''}
                            onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Starting Valuation</label>
                          <input 
                            placeholder="0" 
                            type="number"
                            className="w-full p-4 rounded-2xl border border-white/5 bg-slate-900 text-white placeholder-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/50"
                            value={editingItem.startingPrice || ''}
                            onChange={e => setEditingItem({...editingItem, startingPrice: Number(e.target.value)})}
                          />
                        </div>

                        <div className="md:col-span-2 space-y-6 bg-slate-900 p-8 rounded-3xl border border-white/5 shadow-inner">
                          <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Temporal Settings</h4>
                            <div className="flex bg-slate-800 p-1.5 rounded-xl border border-white/5">
                              <button 
                                onClick={() => setEditingItem({...editingItem, durationMode: 'hms'})}
                                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${editingItem.durationMode === 'hms' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}
                              >
                                Relative
                              </button>
                              <button 
                                onClick={() => setEditingItem({...editingItem, durationMode: 'fixed'})}
                                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${editingItem.durationMode === 'fixed' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}
                              >
                                Fixed
                              </button>
                            </div>
                          </div>

                          {editingItem.durationMode === 'hms' ? (
                            <div className="grid grid-cols-3 gap-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center block">H</label>
                                <input 
                                  type="number" 
                                  className="w-full p-4 rounded-2xl border border-white/5 bg-slate-800 text-white text-center font-black text-xl outline-none focus:ring-2 focus:ring-indigo-500/50"
                                  value={editingItem.durationH ?? 1}
                                  onChange={e => setEditingItem({...editingItem, durationH: Number(e.target.value)})}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center block">M</label>
                                <input 
                                  type="number" 
                                  className="w-full p-4 rounded-2xl border border-white/5 bg-slate-800 text-white text-center font-black text-xl outline-none focus:ring-2 focus:ring-indigo-500/50"
                                  value={editingItem.durationM ?? 0}
                                  onChange={e => setEditingItem({...editingItem, durationM: Number(e.target.value)})}
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest text-center block">S</label>
                                <input 
                                  type="number" 
                                  className="w-full p-4 rounded-2xl border border-white/5 bg-slate-800 text-white text-center font-black text-xl outline-none focus:ring-2 focus:ring-indigo-500/50"
                                  value={editingItem.durationS ?? 0}
                                  onChange={e => setEditingItem({...editingItem, durationS: Number(e.target.value)})}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Final Timestamp</label>
                              <input 
                                type="datetime-local" 
                                className="w-full p-4 rounded-2xl border border-white/5 bg-slate-800 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 [color-scheme:dark]"
                                value={editingItem.endTime ? toDatetimeLocal(editingItem.endTime) : ''}
                                onChange={e => setEditingItem({...editingItem, endTime: new Date(e.target.value).toISOString()})}
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Visual Reference</label>
                          <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                              <input 
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                              <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full p-5 rounded-2xl border border-white/5 bg-slate-900 hover:bg-slate-800 text-slate-500 font-bold text-left flex items-center gap-4 transition-all"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                {editingItem.imageUrl ? "Modify Data" : "Initialize Link"}
                              </button>
                              <input 
                                placeholder="External HTTPS Source Link" 
                                className="w-full mt-4 p-5 rounded-2xl border border-white/5 bg-slate-900 text-white placeholder-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/50"
                                value={editingItem.imageUrl?.startsWith('data:') ? '' : editingItem.imageUrl || ''}
                                onChange={e => setEditingItem({...editingItem, imageUrl: e.target.value})}
                              />
                            </div>
                            {editingItem.imageUrl && (
                              <div className="w-full md:w-36 h-36 rounded-3xl overflow-hidden border border-white/10 flex-shrink-0 shadow-2xl">
                                <img src={editingItem.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-12">
                        <button onClick={handleSaveItem} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-900/20 hover:bg-indigo-500 transition-all">Commit Changes</button>
                        <button onClick={() => setEditingItem(null)} className="bg-slate-900 text-slate-400 border border-white/5 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:text-white transition-all">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {items.map(item => (
                      <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-950/50 border border-white/5 rounded-[32px] hover:border-indigo-500/20 hover:bg-slate-950 transition-all group gap-6">
                        <div className="flex items-center gap-6">
                          <div className="relative">
                            <img src={item.imageUrl} alt={item.name} className="w-20 h-20 rounded-2xl object-cover opacity-80" />
                            <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full border-4 border-slate-900 ${
                              item.status === ItemStatus.OPEN ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                              item.status === ItemStatus.CLOSED ? 'bg-slate-600' : 'bg-amber-500'
                            }`}></div>
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1.5">
                              <h4 className="font-black text-white text-lg tracking-tight">{item.name}</h4>
                              <span className="text-[10px] font-mono font-bold text-slate-600 px-2 py-0.5 bg-white/5 rounded-md">ID: {item.id}</span>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Base: <span className="text-slate-300">${item.startingPrice.toLocaleString()}</span></p>
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Expiry: <span className="text-slate-300 font-mono">{new Date(item.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></p>
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Status: <span className={`font-black ${
                                item.status === ItemStatus.OPEN ? 'text-emerald-400' : 
                                item.status === ItemStatus.CLOSED ? 'text-rose-500' : 'text-amber-500'
                              }`}>{item.status}</span></p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {item.status === ItemStatus.PENDING && (
                            <button 
                              onClick={() => handleStartBidding(item.id)}
                              className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                            >
                              Initialize Market
                            </button>
                          )}
                          <div className="h-10 w-[1px] bg-white/5 hidden md:block mx-3"></div>
                          <button 
                            onClick={() => setEditingItem({ ...item, durationMode: 'fixed' })}
                            className="p-3.5 bg-slate-800 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded-2xl transition-all border border-white/5"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-3.5 bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-2xl transition-all border border-white/5"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {biddingSubTab === 'winners' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-widest">Victory Archives</h3>
                    <p className="text-sm text-slate-500 font-medium">Historical data of finalized transactions and winners.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {winners.length > 0 ? winners.map((w, i) => (
                      <div key={i} className="bg-slate-950/40 p-8 rounded-[32px] border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all shadow-xl">
                        {w.isTie && (
                          <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] px-4 py-1.5 font-black uppercase tracking-widest">Consensus Victory</div>
                        )}
                        <p className="text-[10px] text-slate-500 uppercase font-black mb-2 tracking-[0.2em]">{w.itemName}</p>
                        <p className="font-black text-white text-2xl mb-6 tracking-tight">{w.winnerName}</p>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest mb-1">Settlement Price</p>
                            <p className="text-indigo-400 font-black text-3xl tracking-tighter">${w.winningAmount.toLocaleString()}</p>
                          </div>
                          <span className="text-[10px] text-slate-600 font-mono font-bold mb-1.5">{new Date(w.awardedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-full py-24 text-center bg-slate-950/30 rounded-[32px] border border-dashed border-white/5">
                        <p className="text-slate-600 font-black uppercase tracking-widest text-sm">Archival Records Empty</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {biddingSubTab === 'logs' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-widest">Network Activity</h3>
                    <p className="text-sm text-slate-500 font-medium">Real-time system telemetry and transaction logs.</p>
                  </div>
                  <div className="space-y-4">
                    {logs.map(log => (
                      <div key={log.id} className="p-5 border border-white/5 bg-slate-950/20 rounded-2xl flex items-center justify-between group hover:bg-slate-950/40 transition-all">
                        <div className="flex items-center gap-5">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                            log.action.includes('BID') ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                            log.action.includes('REFUND') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-white/5'
                          }`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-200">
                              {log.userName} <span className="text-slate-500 font-medium mx-1">/</span> {log.action}
                            </p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">{log.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{new Date(log.timestamp).toLocaleDateString()}</p>
                          <p className="text-[10px] text-indigo-500 font-mono mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;

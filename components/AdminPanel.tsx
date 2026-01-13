
import React, { useState, useRef, useEffect } from 'react';
import { User, BiddingItem, Winner, LogRecord, ItemStatus, UserRole } from '../types';
import { GOOGLE_SHEET_URL } from '../constants';

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
    if (confirm('Permanently delete this asset from the Bidding Database?')) {
      onUpdateItems(items.filter(i => i.id !== id));
    }
  };

  const handleOpenSheet = () => {
    window.open(GOOGLE_SHEET_URL, '_blank');
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
      alert("Required: Asset Title and Starting Valuation.");
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
        imageUrl: editingItem.imageUrl || 'https://images.unsplash.com/photo-1579546673183-592b00569106?auto=format&fit=crop&q=80&w=800',
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-4 p-1.5 bg-slate-900 rounded-2xl w-fit border border-white/5">
          <button 
            onClick={() => setMainTab('dashboard')}
            className={`px-8 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${mainTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Personnel
          </button>
          <button 
            onClick={() => setMainTab('bidding')}
            className={`px-8 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-3 ${mainTab === 'bidding' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Assets
          </button>
        </div>

        <button 
          onClick={handleOpenSheet}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 rounded-xl font-bold text-xs uppercase tracking-widest transition-all group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Edit Bidding Database (Sheets)
        </button>
      </div>

      <div className="bg-slate-900 rounded-[32px] border border-white/5 shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
        {mainTab === 'dashboard' ? (
          <div className="p-8">
            <div className="mb-10">
              <h2 className="text-xl font-bold text-white tracking-tight uppercase tracking-widest">Active Personnel Index</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Registry of authorized administrators and users.</p>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 uppercase tracking-widest text-[10px] font-bold">
                    <th className="pb-5 pl-4">ID</th>
                    <th className="pb-5">Designation</th>
                    <th className="pb-5">Liquidity</th>
                    <th className="pb-5">Rank</th>
                    <th className="pb-5">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                      <td className="py-6 pl-4 font-mono font-bold text-slate-400 text-sm">{u.id}</td>
                      <td className="py-6 font-bold text-slate-100 text-sm">{u.name}</td>
                      <td className="py-6">
                        <span className="text-indigo-400 font-bold text-sm">${u.walletBalance.toLocaleString()}</span>
                      </td>
                      <td className="py-6">
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${u.role === UserRole.ADMIN ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-800 text-slate-500 border-white/5'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-6 font-bold text-amber-500 text-sm">{u.powerScore}</td>
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
                  className={`flex-1 py-4 px-6 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                    biddingSubTab === tab ? 'bg-slate-800 text-indigo-400 shadow-xl border border-white/5' : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
              {biddingSubTab === 'items' && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-white uppercase tracking-widest">Global Asset Index</h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Asset lifecycle management.</p>
                    </div>
                    <button 
                      onClick={() => setEditingItem({ durationMode: 'hms', durationH: 1, durationM: 0, durationS: 0 })}
                      className="bg-white text-slate-950 px-8 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl"
                    >
                      Initialize Asset
                    </button>
                  </div>

                  {editingItem && (
                    <div className="bg-slate-800/40 p-8 rounded-[32px] border-2 border-dashed border-white/10 animate-fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Asset Designation</label>
                          <input 
                            placeholder="Title" 
                            className="w-full p-4 rounded-2xl border border-white/5 bg-slate-900 text-white text-sm outline-none"
                            value={editingItem.name || ''}
                            onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Starting Valuation</label>
                          <input 
                            placeholder="0" 
                            type="number"
                            className="w-full p-4 rounded-2xl border border-white/5 bg-slate-900 text-white text-sm outline-none"
                            value={editingItem.startingPrice || ''}
                            onChange={e => setEditingItem({...editingItem, startingPrice: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                      <div className="flex gap-4 mt-8">
                        <button onClick={handleSaveItem} className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] shadow-xl hover:bg-indigo-500 transition-all">Commit Changes</button>
                        <button onClick={() => setEditingItem(null)} className="bg-slate-900 text-slate-400 border border-white/5 px-10 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:text-white transition-all">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-slate-950/50 border border-white/5 rounded-3xl hover:bg-slate-950 transition-all gap-4">
                        <div className="flex items-center gap-4">
                          <img src={item.imageUrl} className="w-12 h-12 rounded-xl object-cover" />
                          <div>
                            <h4 className="font-bold text-white text-sm">{item.name}</h4>
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{item.status} • ${item.startingPrice.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleStartBidding(item.id)}
                            className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white px-4 py-2 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all"
                          >
                            Live
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 bg-slate-800 text-slate-400 hover:text-rose-400 rounded-xl transition-all"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {biddingSubTab === 'winners' && (
                <div className="text-center py-20 bg-slate-950/30 rounded-[32px] border border-dashed border-white/5">
                  <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px]">Registry Empty</p>
                </div>
              )}

              {biddingSubTab === 'logs' && (
                <div className="space-y-4">
                  {logs.map(log => (
                    <div key={log.id} className="p-4 border border-white/5 bg-slate-950/20 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200">{log.userName} • {log.action}</p>
                          <p className="text-[10px] text-slate-600 font-medium uppercase tracking-widest">{log.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
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

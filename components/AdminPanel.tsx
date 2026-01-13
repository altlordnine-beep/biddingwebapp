
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
    if (confirm('Are you sure you want to delete this item?')) {
      onUpdateItems(items.filter(i => i.id !== id));
    }
  };

  const handleStartBidding = (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    // Use existing endTime if it's in the future, otherwise default to 1 hour
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
      alert("Please fill in the item name and starting price.");
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

  // Helper to format ISO to datetime-local input string
  const toDatetimeLocal = (iso: string) => {
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Navigation */}
      <div className="flex gap-4 p-1 bg-slate-200/50 rounded-2xl w-fit">
        <button 
          onClick={() => setMainTab('dashboard')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${mainTab === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Setting Dashboard
        </button>
        <button 
          onClick={() => setMainTab('bidding')}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${mainTab === 'bidding' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Bidding Item Settings
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[600px] flex flex-col">
        {mainTab === 'dashboard' ? (
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
                <p className="text-slate-500 text-sm">Manage users, access levels, and wallet balances.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-widest text-[10px] font-black">
                    <th className="pb-4 pl-4">User ID</th>
                    <th className="pb-4">Full Name</th>
                    <th className="pb-4">Wallet Balance</th>
                    <th className="pb-4">Role</th>
                    <th className="pb-4">Power Score</th>
                    <th className="pb-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-5 pl-4 font-mono font-bold text-slate-400 text-sm">{u.id}</td>
                      <td className="py-5 font-bold text-slate-700">{u.name}</td>
                      <td className="py-5">
                        <span className="text-emerald-600 font-black">${u.walletBalance.toLocaleString()}</span>
                      </td>
                      <td className="py-5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${u.role === UserRole.ADMIN ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-5 font-black text-amber-500">{u.powerScore}</td>
                      <td className="py-5">
                        <button className="text-slate-400 hover:text-indigo-600 transition-colors">
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
            {/* Bidding Settings Sub-Tabs */}
            <div className="flex border-b border-slate-100 p-2 bg-slate-50/50">
              {(['items', 'winners', 'logs'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setBiddingSubTab(tab)}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all capitalize ${
                    biddingSubTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'
                  }`}
                >
                  {tab} Tab
                </button>
              ))}
            </div>

            <div className="flex-1 p-8 overflow-y-auto">
              {biddingSubTab === 'items' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Manage Items</h3>
                      <p className="text-sm text-slate-500">Create, edit, and launch bidding items.</p>
                    </div>
                    <button 
                      onClick={() => setEditingItem({ durationMode: 'hms', durationH: 1, durationM: 0, durationS: 0 })}
                      className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add New Item
                    </button>
                  </div>

                  {editingItem && (
                    <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200 animate-in slide-in-from-top-4 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase ml-1">Item Name</label>
                          <input 
                            placeholder="e.g. Rare Vintage Watch" 
                            className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                            value={editingItem.name || ''}
                            onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-slate-400 uppercase ml-1">Starting Price</label>
                          <input 
                            placeholder="0" 
                            type="number"
                            className="w-full p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                            value={editingItem.startingPrice || ''}
                            onChange={e => setEditingItem({...editingItem, startingPrice: Number(e.target.value)})}
                          />
                        </div>

                        {/* Manual Time Settings */}
                        <div className="md:col-span-2 space-y-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Countdown Time Settings</h4>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                              <button 
                                onClick={() => setEditingItem({...editingItem, durationMode: 'hms'})}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${editingItem.durationMode === 'hms' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                              >
                                By Duration
                              </button>
                              <button 
                                onClick={() => setEditingItem({...editingItem, durationMode: 'fixed'})}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${editingItem.durationMode === 'fixed' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                              >
                                By Date/Time
                              </button>
                            </div>
                          </div>

                          {editingItem.durationMode === 'hms' ? (
                            <div className="grid grid-cols-3 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Hours</label>
                                <input 
                                  type="number" 
                                  min="0"
                                  placeholder="0"
                                  className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50 text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                  value={editingItem.durationH ?? 1}
                                  onChange={e => setEditingItem({...editingItem, durationH: Number(e.target.value)})}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Minutes</label>
                                <input 
                                  type="number" 
                                  min="0"
                                  max="59"
                                  placeholder="0"
                                  className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50 text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                  value={editingItem.durationM ?? 0}
                                  onChange={e => setEditingItem({...editingItem, durationM: Number(e.target.value)})}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase">Seconds</label>
                                <input 
                                  type="number" 
                                  min="0"
                                  max="59"
                                  placeholder="0"
                                  className="w-full p-3 rounded-xl border border-slate-100 bg-slate-50 text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                  value={editingItem.durationS ?? 0}
                                  onChange={e => setEditingItem({...editingItem, durationS: Number(e.target.value)})}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-slate-400 uppercase">End Date & Time</label>
                              <input 
                                type="datetime-local" 
                                className="w-full p-4 rounded-xl border border-slate-100 bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                value={editingItem.endTime ? toDatetimeLocal(editingItem.endTime) : ''}
                                onChange={e => setEditingItem({...editingItem, endTime: new Date(e.target.value).toISOString()})}
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <label className="text-xs font-black text-slate-400 uppercase ml-1">Item Image</label>
                          <div className="flex flex-col md:flex-row gap-4">
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
                                className="w-full p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-500 font-medium text-left flex items-center gap-3"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                {editingItem.imageUrl ? "Change Image" : "Upload Image"}
                              </button>
                              <div className="mt-2 text-xs text-slate-400 italic">Or paste a URL below</div>
                              <input 
                                placeholder="https://images.unsplash.com/..." 
                                className="w-full mt-2 p-4 rounded-2xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                                value={editingItem.imageUrl?.startsWith('data:') ? '' : editingItem.imageUrl || ''}
                                onChange={e => setEditingItem({...editingItem, imageUrl: e.target.value})}
                              />
                            </div>
                            {editingItem.imageUrl && (
                              <div className="w-full md:w-32 h-32 rounded-2xl overflow-hidden border-2 border-indigo-100 flex-shrink-0">
                                <img src={editingItem.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-8">
                        <button onClick={handleSaveItem} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100">Save Item</button>
                        <button onClick={() => setEditingItem(null)} className="bg-white text-slate-700 border border-slate-200 px-8 py-3 rounded-2xl font-bold">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4">
                    {items.map(item => (
                      <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:border-indigo-100 hover:shadow-md transition-all group gap-4">
                        <div className="flex items-center gap-5">
                          <div className="relative">
                            <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-2xl object-cover" />
                            <div className={`absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-white ${
                              item.status === ItemStatus.OPEN ? 'bg-emerald-500 animate-pulse' : 
                              item.status === ItemStatus.CLOSED ? 'bg-slate-400' : 'bg-amber-400'
                            }`}></div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-slate-800">{item.name}</h4>
                              <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 bg-slate-50 rounded">ID: {item.id}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="text-xs text-slate-400 font-medium">Start: <span className="text-slate-600">${item.startingPrice.toLocaleString()}</span></p>
                              <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                              <p className="text-xs text-slate-400 font-medium">End: <span className="text-slate-600">{new Date(item.endTime).toLocaleString()}</span></p>
                              <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                              <p className="text-xs text-slate-400 font-medium">Status: <span className={`uppercase font-bold ${
                                item.status === ItemStatus.OPEN ? 'text-emerald-600' : 
                                item.status === ItemStatus.CLOSED ? 'text-rose-500' : 'text-amber-500'
                              }`}>{item.status}</span></p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {item.status === ItemStatus.PENDING && (
                            <button 
                              onClick={() => handleStartBidding(item.id)}
                              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              </svg>
                              Start Bidding
                            </button>
                          )}
                          <div className="h-8 w-[1px] bg-slate-100 hidden md:block mx-2"></div>
                          <button 
                            onClick={() => {
                              // Pre-fill duration logic could be added here, but simple edit is fine
                              setEditingItem({ ...item, durationMode: 'fixed' });
                            }}
                            className="p-3 hover:bg-indigo-50 rounded-2xl text-slate-400 hover:text-indigo-600 transition-all"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-3 hover:bg-rose-50 rounded-2xl text-slate-400 hover:text-rose-600 transition-all"
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
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Winner Management</h3>
                    <p className="text-sm text-slate-500">View and verify auction results.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {winners.length > 0 ? winners.map((w, i) => (
                      <div key={i} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 relative overflow-hidden group hover:border-indigo-200 transition-all">
                        {w.isTie && (
                          <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] px-3 py-1 font-black uppercase tracking-widest">Tie Victory</div>
                        )}
                        {!w.isTie && (
                          <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] px-3 py-1 font-black uppercase tracking-widest">Solo Winner</div>
                        )}
                        <p className="text-[10px] text-slate-400 uppercase font-black mb-2 tracking-widest">{w.itemName}</p>
                        <p className="font-bold text-slate-800 text-xl mb-4">{w.winnerName}</p>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Final Price</p>
                            <p className="text-indigo-600 font-black text-2xl">${w.winningAmount.toLocaleString()}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono mb-1">{new Date(w.awardedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        </div>
                        <p className="text-slate-400 font-medium">No auctions have concluded yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {biddingSubTab === 'logs' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Activity & Bid Logs</h3>
                    <p className="text-sm text-slate-500">Real-time tracking of placements, outbids, and refunds.</p>
                  </div>
                  <div className="space-y-3">
                    {logs.map(log => (
                      <div key={log.id} className="p-4 border border-slate-100 bg-white rounded-2xl flex items-center justify-between group hover:shadow-sm transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            log.action.includes('BID') ? 'bg-indigo-50 text-indigo-600' : 
                            log.action.includes('REFUND') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                          }`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">
                              {log.userName} <span className="text-slate-400 font-normal">performed</span> {log.action}
                            </p>
                            <p className="text-xs text-slate-500 font-medium">{log.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-black uppercase">{new Date(log.timestamp).toLocaleDateString()}</p>
                          <p className="text-[10px] text-indigo-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</p>
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

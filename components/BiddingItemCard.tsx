
import React, { useState, useEffect } from 'react';
import { BiddingItem, ItemStatus, BidRecord } from '../types';

interface BiddingItemCardProps {
  item: BiddingItem;
  bids: BidRecord[];
  onClick: (item: BiddingItem) => void;
}

const BiddingItemCard: React.FC<BiddingItemCardProps> = ({ item, bids, onClick }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(item.endTime).getTime();
      const distance = end - now;

      if (distance < 0 || item.status === ItemStatus.CLOSED) {
        setTimeLeft('EXPIRED');
        setIsExpired(true);
        clearInterval(timer);
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        setIsExpired(false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [item.endTime, item.status]);

  // Find all unique users currently tied at the highest bid
  const tiedBidders = Array.from(new Set(
    bids
      .filter(b => b.itemId === item.id && b.bidAmount === item.highestBidAmount)
      .map(b => b.userName)
  ));

  return (
    <div 
      onClick={() => onClick(item)}
      className="group bg-slate-900 rounded-[32px] border border-white/5 overflow-hidden shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-500/30 transition-all cursor-pointer relative flex flex-col md:flex-row items-stretch border-l-4 border-l-transparent hover:border-l-indigo-500"
    >
      <div className="w-full md:w-72 h-56 md:h-auto overflow-hidden bg-slate-800 flex-shrink-0 relative">
        <img 
          src={item.imageUrl} 
          alt={item.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" 
        />
        {isExpired && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center backdrop-blur-md">
            <span className="bg-white text-slate-950 px-6 py-2 rounded-2xl font-bold text-xs tracking-widest uppercase shadow-2xl">
              Auction Concluded
            </span>
          </div>
        )}
      </div>
      
      <div className="flex-1 p-8 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg text-white tracking-tight mb-1">{item.name}</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Asset ID: {item.id}</p>
            </div>
            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
              isExpired ? 'bg-slate-800 text-slate-500 border-slate-700' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {isExpired ? 'Ended' : 'Live Auction'}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-8 mt-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Evaluation</span>
              <span className="text-xl font-bold text-indigo-400 tracking-tighter">${item.highestBidAmount.toLocaleString()}</span>
            </div>
            
            <div className="w-[1px] bg-white/5 hidden sm:block"></div>
            
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Time To Expiry</span>
              <span className={`text-lg font-semibold ${isExpired ? 'text-rose-500' : 'text-amber-500 font-mono tracking-tight'}`}>
                {timeLeft}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-6 border-t border-white/5">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${item.isTie ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block leading-none mb-1.5">
                {item.isTie ? 'Tied Leaders' : 'Primary Leader'}
              </span>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {tiedBidders.length > 0 ? (
                  tiedBidders.map((name, idx) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 truncate max-w-[140px]">{name}</span>
                      <span className="text-indigo-500 font-bold text-[11px]">${item.highestBidAmount.toLocaleString()}</span>
                      {idx < tiedBidders.length - 1 && <span className="text-slate-700">•</span>}
                    </div>
                  ))
                ) : (
                  <span className="font-bold text-slate-600 italic">No activity</span>
                )}
                
                {item.isTie && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-tighter ml-1">
                    {tiedBidders.length} Way Tie
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <button className={`px-10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex-shrink-0 ${
            isExpired 
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-white/5' 
              : 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20 hover:bg-indigo-500 hover:-translate-y-1 active:scale-95 glow-indigo'
          }`}>
            {isExpired ? 'View Ledger' : 'Authorize Bid'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BiddingItemCard;

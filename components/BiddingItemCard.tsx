
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

  // Find all users who are currently tied at the highest bid
  const tiedBidders = Array.from(new Set(
    bids
      .filter(b => b.itemId === item.id && b.bidAmount === item.highestBidAmount)
      .map(b => b.userName)
  ));

  return (
    <div 
      onClick={() => onClick(item)}
      className="group bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all cursor-pointer relative flex flex-col md:flex-row items-stretch"
    >
      <div className="w-full md:w-64 h-48 md:h-auto overflow-hidden bg-slate-100 flex-shrink-0 relative">
        <img 
          src={item.imageUrl} 
          alt={item.name} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
        />
        {isExpired && (
          <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center backdrop-blur-[2px]">
            <span className="bg-white text-slate-900 px-4 py-2 rounded-full font-black text-xs tracking-widest uppercase shadow-2xl">
              Auction Closed
            </span>
          </div>
        )}
      </div>
      
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-black text-xl text-slate-800 tracking-tight">{item.name}</h3>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
              isExpired ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100 animate-pulse'
            }`}>
              {isExpired ? 'Ended' : 'Live Now'}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Current Bid</span>
              <span className="text-2xl font-black text-indigo-600">${item.highestBidAmount.toLocaleString()}</span>
            </div>
            
            <div className="w-[1px] bg-slate-100 hidden sm:block"></div>
            
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Time Remaining</span>
              <span className={`text-lg font-bold ${isExpired ? 'text-rose-500' : 'text-amber-500 font-mono'}`}>
                {timeLeft}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${item.isTie ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block leading-none mb-1">
                {item.isTie ? 'Tied Leaders' : 'Current Leader'}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {tiedBidders.length > 0 ? (
                  tiedBidders.map((name, idx) => (
                    <React.Fragment key={name}>
                      <span className="font-bold text-slate-700 truncate max-w-[120px]">{name}</span>
                      {idx < tiedBidders.length - 1 && <span className="text-slate-300">•</span>}
                    </React.Fragment>
                  ))
                ) : (
                  <span className="font-bold text-slate-400 italic">No bids yet</span>
                )}
                
                {item.isTie && (
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-600 text-[9px] font-black uppercase tracking-tighter">
                    {tiedBidders.length} Tied
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <button className={`px-8 py-3 rounded-2xl font-black text-sm transition-all flex-shrink-0 ${
            isExpired 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0'
          }`}>
            {isExpired ? 'View Results' : 'Place Your Bid'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BiddingItemCard;

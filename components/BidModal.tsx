
import React, { useState, useEffect } from 'react';
import { BiddingItem, User, BidRecord, ItemStatus } from '../types';
import { COOLDOWN_SECONDS } from '../constants';

interface BidModalProps {
  item: BiddingItem;
  user: User;
  bids: BidRecord[];
  onClose: () => void;
  onPlaceBid: (itemId: string, amount: number) => Promise<string | null>;
}

const BidModal: React.FC<BidModalProps> = ({ item, user, bids, onClose, onPlaceBid }) => {
  const [bidAmount, setBidAmount] = useState<number>(item.highestBidAmount);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const itemHistory = bids.filter(b => b.itemId === item.id).slice(0, 10);

  useEffect(() => {
    const userBids = bids.filter(b => b.itemId === item.id && b.userId === user.id);
    if (userBids.length > 0) {
      const lastBidTime = new Date(userBids[0].timestamp).getTime();
      const now = new Date().getTime();
      const diff = Math.floor((now - lastBidTime) / 1000);
      if (diff < COOLDOWN_SECONDS) {
        setCooldown(COOLDOWN_SECONDS - diff);
      }
    }
  }, [bids, item.id, user.id]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(item.endTime).getTime();
      const distance = end - now;
      if (distance < 0 || item.status === ItemStatus.CLOSED) {
        setTimeLeft('EXPIRED');
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [item.endTime, item.status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (item.status === ItemStatus.CLOSED || new Date(item.endTime).getTime() < Date.now()) {
      setError("This bidding has already closed.");
      return;
    }

    if (bidAmount < item.highestBidAmount) {
      setError(`Your bid must be at least the current highest bid ($${item.highestBidAmount}).`);
      return;
    }

    if (bidAmount > user.walletBalance) {
      setError("Insufficient wallet balance.");
      return;
    }

    if (cooldown > 0) {
      setError(`Please wait ${cooldown}s before bidding again.`);
      return;
    }

    setIsSubmitting(true);
    const result = await onPlaceBid(item.id, Math.floor(bidAmount));
    setIsSubmitting(false);

    if (result) {
      setError(result);
    } else {
      onClose();
    }
  };

  // Find all tied users at the current highest amount
  const tiedBidders = Array.from(new Set(
    bids
      .filter(b => b.itemId === item.id && b.bidAmount === item.highestBidAmount)
      .map(b => b.userName)
  ));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 border border-slate-100">
        <div className="relative h-56">
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 bg-black/20 hover:bg-black/40 backdrop-blur-xl p-2.5 rounded-2xl text-white transition-all hover:rotate-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute bottom-6 left-6">
            <span className="bg-white/95 backdrop-blur px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-800 shadow-xl flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              Remaining: {timeLeft}
            </span>
          </div>
        </div>

        <div className="p-8">
          <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">{item.name}</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-slate-50 rounded-3xl mb-8 border border-slate-100">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Price</p>
              <p className="text-3xl font-black text-indigo-600 tracking-tighter">${item.highestBidAmount.toLocaleString()}</p>
            </div>
            <div className="text-right flex flex-col items-end overflow-hidden">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                {item.isTie ? 'Tied Leaders' : 'Leader'}
              </p>
              <div className="flex flex-wrap justify-end gap-1.5 max-h-[60px] overflow-y-auto">
                {tiedBidders.length > 0 ? (
                  tiedBidders.map((name) => (
                    <span key={name} className="text-xs font-bold text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm whitespace-nowrap">
                      {name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm font-bold text-slate-400 italic">No leader yet</span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2 px-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider">Place Your Bid</label>
                <span className="text-[10px] font-bold text-indigo-500 px-2 py-0.5 bg-indigo-50 rounded-lg">Match bid permitted</span>
              </div>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-2xl">$</span>
                <input 
                  type="number"
                  step="1"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
                  disabled={isSubmitting || cooldown > 0 || timeLeft === 'EXPIRED'}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-3xl py-5 pl-12 pr-6 font-black text-3xl focus:border-indigo-500 focus:bg-white transition-all outline-none tracking-tighter"
                  placeholder="0"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold flex items-center gap-3 animate-shake border border-rose-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting || cooldown > 0 || timeLeft === 'EXPIRED'}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-5 rounded-3xl shadow-xl shadow-indigo-100 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : cooldown > 0 ? (
                `Wait ${cooldown}s`
              ) : (
                bidAmount === item.highestBidAmount ? 'Match Highest Bid' : 'Submit New Bid'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Live Bidding Activity</h4>
            <div className="space-y-3 max-h-44 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
              {itemHistory.length > 0 ? itemHistory.map((bid) => (
                <div key={bid.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${bid.type === 'PLACE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <div>
                      <p className="text-xs font-black text-slate-800 leading-tight">{bid.userName}</p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {bid.bidAmount === item.highestBidAmount ? 'Matched current' : 'Placed a bid'}
                      </p>
                    </div>
                  </div>
                  <span className="font-black text-slate-800 tracking-tighter text-sm">${bid.bidAmount.toLocaleString()}</span>
                </div>
              )) : (
                <div className="text-center py-6 text-slate-300 font-bold text-xs italic">No activity yet. Lead the way!</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BidModal;

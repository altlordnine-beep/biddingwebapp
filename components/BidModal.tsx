
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
      setError("Market window closed for this asset.");
      return;
    }

    if (bidAmount < item.highestBidAmount) {
      setError(`Minimum offer threshold is $${item.highestBidAmount}.`);
      return;
    }

    if (bidAmount > user.walletBalance) {
      setError("Insufficient liquidity in wallet.");
      return;
    }

    if (cooldown > 0) {
      setError(`Wait ${cooldown}s for network confirmation.`);
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

  const tiedBidders = Array.from(new Set(
    bids
      .filter(b => b.itemId === item.id && b.bidAmount === item.highestBidAmount)
      .map(b => b.userName)
  ));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
      <div className="bg-slate-900 rounded-[32px] md:rounded-[40px] w-full max-w-xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl border border-white/5 animate-fade-in">
        {/* Header / Image Section */}
        <div className="relative h-40 md:h-56 flex-shrink-0">
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover opacity-70" />
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 md:top-6 md:right-6 bg-slate-950/50 hover:bg-indigo-600 backdrop-blur-xl p-2 md:p-2.5 rounded-xl text-white transition-all border border-white/10 hover:rotate-90 z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
            <span className="bg-slate-950/80 backdrop-blur px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-slate-100 border border-white/10 shadow-2xl flex items-center gap-2 md:gap-3">
              <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${timeLeft === 'EXPIRED' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`}></span>
              Expiry: {timeLeft}
            </span>
          </div>
        </div>

        {/* Scrollable Content Section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-2">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white tracking-tighter mb-1">{item.name}</h2>
              <p className="text-[9px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest">Global Asset Ledger</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 p-4 md:p-6 bg-slate-800/50 rounded-2xl md:rounded-[32px] mb-6 md:mb-8 border border-white/5">
            <div>
              <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Current Evaluation</p>
              <p className="text-xl md:text-2xl font-bold text-indigo-400 tracking-tighter">${item.highestBidAmount.toLocaleString()}</p>
            </div>
            <div className="flex flex-col items-start sm:items-end overflow-hidden border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0 sm:pl-6">
              <p className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                {item.isTie ? 'Leaders' : 'Leader'}
              </p>
              <div className="flex flex-wrap sm:justify-end gap-2 max-h-[60px] overflow-y-auto custom-scrollbar">
                {tiedBidders.length > 0 ? (
                  tiedBidders.map((name) => (
                    <div key={name} className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg border border-white/5 shadow-inner">
                      <span className="text-[10px] md:text-[11px] font-bold text-slate-100">{name}</span>
                      <span className="text-indigo-400 font-bold text-[10px] md:text-[11px]">${item.highestBidAmount.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs font-bold text-slate-600 italic">Unclaimed</span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Offer Amount</label>
                <span className="text-[9px] md:text-[10px] font-bold text-indigo-400 px-2 py-0.5 md:px-3 md:py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20 uppercase tracking-widest">Match Permitted</span>
              </div>
              <div className="relative group">
                <span className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-500 font-bold text-xl md:text-2xl transition-colors">$</span>
                <input 
                  type="number"
                  step="1"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
                  disabled={isSubmitting || cooldown > 0 || timeLeft === 'EXPIRED'}
                  className="w-full bg-slate-800/50 border border-white/5 rounded-2xl md:rounded-3xl py-4 md:py-5 pl-10 md:pl-14 pr-4 md:pr-8 font-bold text-xl md:text-2xl text-white focus:border-indigo-500/50 focus:bg-slate-800 outline-none transition-all tracking-tighter glow-indigo"
                  placeholder="0"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 md:p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-bold flex items-center gap-2 md:gap-3 animate-shake">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting || cooldown > 0 || timeLeft === 'EXPIRED'}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold py-4 md:py-5 rounded-2xl md:rounded-3xl shadow-2xl shadow-indigo-900/30 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 md:gap-3 glow-indigo text-[11px] md:text-sm uppercase tracking-[0.2em]"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 md:w-6 md:h-6 border-[3px] border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : cooldown > 0 ? (
                `Awaiting Lock (${cooldown}s)`
              ) : (
                bidAmount === item.highestBidAmount ? 'Match Bid' : 'Authorize High Bid'
              )}
            </button>
          </form>

          <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-white/5">
            <h4 className="text-[9px] md:text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 md:mb-6">History</h4>
            <div className="space-y-3 md:space-y-4 max-h-36 md:max-h-44 overflow-y-auto pr-2 custom-scrollbar">
              {itemHistory.length > 0 ? itemHistory.map((bid) => (
                <div key={bid.id} className="flex items-center justify-between p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-800/30 border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${bid.bidAmount === item.highestBidAmount ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-slate-700'}`}></div>
                    <div>
                      <p className="text-xs md:text-sm font-bold text-slate-200 leading-tight">{bid.userName}</p>
                      <p className="text-[8px] md:text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                        {bid.bidAmount === item.highestBidAmount ? 'Matching' : 'Escalation'}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-white tracking-tight text-sm md:text-lg">${bid.bidAmount.toLocaleString()}</span>
                </div>
              )) : (
                <div className="text-center py-6 md:py-8 text-slate-700 font-bold text-[10px] md:text-xs uppercase tracking-widest italic">Ledger Empty</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BidModal;

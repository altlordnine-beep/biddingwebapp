
import { UserRole, ItemStatus, User, BiddingItem } from './types';

export const INITIAL_USERS: User[] = [
  { id: 'U001', name: 'Admin Master', walletBalance: 250000, role: UserRole.ADMIN, password: 'password', powerScore: 100 },
  { id: 'U002', name: 'John Doe', walletBalance: 12000, role: UserRole.USER, password: 'user123', powerScore: 45 },
  { id: 'U003', name: 'Jane Smith', walletBalance: 15500, role: UserRole.USER, password: 'user123', powerScore: 52 },
  { id: 'U004', name: 'Alice Wong', walletBalance: 25000, role: UserRole.USER, password: 'user123', powerScore: 68 },
];

export const INITIAL_ITEMS: BiddingItem[] = [
  {
    id: 'I001',
    name: 'Vintage Rolex Submariner (1968)',
    imageUrl: 'https://images.unsplash.com/photo-1587836374828-4dbaba94cf0e?auto=format&fit=crop&q=80&w=800',
    startingPrice: 8500,
    highestBidAmount: 8500,
    highestBidUserName: 'Initial Listing',
    highestBidUserId: '',
    endTime: new Date(Date.now() + 3600000).toISOString(),
    status: ItemStatus.OPEN,
    isTie: false
  },
  {
    id: 'I002',
    name: 'Concept EV Prototype X',
    imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800',
    startingPrice: 120000,
    highestBidAmount: 120000,
    highestBidUserName: 'Initial Listing',
    highestBidUserId: '',
    endTime: new Date(Date.now() + 7200000).toISOString(),
    status: ItemStatus.OPEN,
    isTie: false
  },
  {
    id: 'I003',
    name: 'Limited Edition Digital Canvas',
    imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=800',
    startingPrice: 4500,
    highestBidAmount: 4500,
    highestBidUserName: 'Initial Listing',
    highestBidUserId: '',
    endTime: new Date(Date.now() + 1800000).toISOString(),
    status: ItemStatus.OPEN,
    isTie: false
  }
];

export const COOLDOWN_SECONDS = 15; // Optimized for faster UX in production
export const BID_TIME_EXTENSION_MINUTES = 2;

// Production Google Sheet Backend Reference
export const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';

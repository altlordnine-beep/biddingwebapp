
import { UserRole, ItemStatus, User, BiddingItem } from './types';

export const INITIAL_USERS: User[] = [
  { id: 'U001', name: 'Admin User', walletBalance: 100000, role: UserRole.ADMIN, password: 'password', powerScore: 99 },
  { id: 'U002', name: 'John Doe', walletBalance: 5000, role: UserRole.USER, password: 'user123', powerScore: 45 },
  { id: 'U003', name: 'Jane Smith', walletBalance: 7500, role: UserRole.USER, password: 'user123', powerScore: 52 },
];

export const INITIAL_ITEMS: BiddingItem[] = [
  {
    id: 'I001',
    name: 'Vintage Rolex Submariner',
    imageUrl: 'https://picsum.photos/seed/rolex/600/400',
    startingPrice: 2000,
    highestBidAmount: 2000,
    highestBidUserName: 'None',
    highestBidUserId: '',
    endTime: new Date(Date.now() + 3600000).toISOString(),
    status: ItemStatus.OPEN,
    isTie: false
  },
  {
    id: 'I002',
    name: 'Tesla Model S Plaid',
    imageUrl: 'https://picsum.photos/seed/tesla/600/400',
    startingPrice: 50000,
    highestBidAmount: 50000,
    highestBidUserName: 'None',
    highestBidUserId: '',
    endTime: new Date(Date.now() + 7200000).toISOString(),
    status: ItemStatus.OPEN,
    isTie: false
  }
];

export const COOLDOWN_SECONDS = 30;
export const BID_TIME_EXTENSION_MINUTES = 3;

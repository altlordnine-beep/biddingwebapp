
export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export enum ItemStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  PENDING = 'PENDING'
}

export interface User {
  id: string;
  name: string;
  walletBalance: number;
  role: UserRole;
  password?: string;
  powerScore: number;
}

export interface BiddingItem {
  id: string;
  name: string;
  imageUrl: string;
  startingPrice: number;
  highestBidAmount: number;
  highestBidUserName: string;
  highestBidUserId: string;
  endTime: string; // ISO string
  status: ItemStatus;
  isTie: boolean;
}

export interface BidRecord {
  id: string;
  itemId: string;
  userName: string;
  userId: string;
  bidAmount: number;
  timestamp: string;
  type: 'PLACE' | 'OUTBID' | 'REFUND';
}

export interface LogRecord {
  id: string;
  userId: string;
  userName: string;
  action: string;
  description: string;
  timestamp: string;
}

export interface Winner {
  itemId: string;
  itemName: string;
  winnerName: string;
  winnerId: string;
  winningAmount: number;
  isTie: boolean;
  awardedAt: string;
}

export interface AppState {
  currentUser: User | null;
  items: BiddingItem[];
  users: User[];
  bids: BidRecord[];
  logs: LogRecord[];
  winners: Winner[];
}

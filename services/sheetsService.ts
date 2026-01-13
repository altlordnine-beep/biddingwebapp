
import { AppState, User, BiddingItem, BidRecord, LogRecord, Winner } from '../types';
import { INITIAL_USERS, INITIAL_ITEMS } from '../constants';

/**
 * PRODUCTION READY SHEETS SERVICE
 * In your Vercel project settings, set VITE_SHEETS_API_URL.
 */

class SheetsService {
  private storageKey = 'bidmaster_v2_data';
  // Use Vite's standard way of accessing env vars
  private apiUrl = (import.meta as any).env?.VITE_SHEETS_API_URL || '';

  private async getLocalState(): Promise<AppState> {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      return JSON.parse(data);
    }
    const initial: AppState = {
      currentUser: null,
      items: INITIAL_ITEMS,
      users: INITIAL_USERS,
      bids: [],
      logs: [],
      winners: []
    };
    this.saveToLocal(initial);
    return initial;
  }

  private saveToLocal(state: AppState) {
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  async fetchData(): Promise<AppState> {
    if (this.apiUrl) {
      try {
        const response = await fetch(this.apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const remoteState = await response.json();
        // Sync local storage with remote for offline persistence
        this.saveToLocal(remoteState);
        return remoteState;
      } catch (err) {
        console.warn("API Fetch failed, falling back to Local Storage", err);
        return this.getLocalState();
      }
    }
    return this.getLocalState();
  }

  async updateState(newState: AppState): Promise<boolean> {
    this.saveToLocal(newState);
    
    if (this.apiUrl) {
      try {
        await fetch(this.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newState)
        });
        return true;
      } catch (err) {
        console.error("API Update failed", err);
        return false;
      }
    }
    return true;
  }

  async addLog(log: Omit<LogRecord, 'id' | 'timestamp'>): Promise<void> {
    const state = await this.getLocalState();
    const newLog: LogRecord = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
    state.logs.unshift(newLog);
    // Keep logs list manageable
    if (state.logs.length > 100) state.logs = state.logs.slice(0, 100);
    await this.updateState(state);
  }
}

export const sheetsService = new SheetsService();

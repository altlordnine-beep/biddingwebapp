
import { AppState, User, BiddingItem, BidRecord, LogRecord, Winner } from '../types';
import { INITIAL_USERS, INITIAL_ITEMS } from '../constants';

/**
 * PRODUCTION READY SHEETS SERVICE
 * In a Vercel deployment, you can set GOOGLE_SHEET_API_URL in your Environment Variables.
 * This should point to a Google Apps Script Web App or a service like SheetDB.
 */

class SheetsService {
  private storageKey = 'bidmaster_v2_data';
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
        return await response.json();
      } catch (err) {
        console.warn("API Fetch failed, falling back to Local Storage", err);
        return this.getLocalState();
      }
    }
    return new Promise((resolve) => {
      setTimeout(async () => resolve(await this.getLocalState()), 150);
    });
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
    await this.updateState(state);
  }
}

export const sheetsService = new SheetsService();

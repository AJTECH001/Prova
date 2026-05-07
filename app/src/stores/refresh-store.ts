import { create } from 'zustand';

interface RefreshState {
  balanceRefreshKey: number;
  triggerBalanceRefresh: () => void;
}

export const useRefreshStore = create<RefreshState>((set, get) => ({
  balanceRefreshKey: 0,
  triggerBalanceRefresh: () => set({ balanceRefreshKey: get().balanceRefreshKey + 1 }),
}));

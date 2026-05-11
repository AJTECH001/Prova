import { create } from 'zustand';

export type UserRole = 'SELLER' | 'BUYER' | 'LP' | 'ADMIN';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  walletAddress: string | null;
  walletProvider: string | null;
  role: UserRole | null;
  isAuthorized: () => boolean;
  setTokens: (access: string, refresh: string) => void;
  setWallet: (address: string, provider: string) => void;
  setRole: (role: UserRole) => void;
  logout: () => void;
}

const ls = (key: string) => typeof window !== 'undefined' ? localStorage.getItem(key) : null;

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: ls('access_token'),
  refreshToken: ls('refresh_token'),
  walletAddress: ls('wallet_address'),
  walletProvider: ls('wallet_provider'),
  role: (ls('user_role') as UserRole | null),

  isAuthorized: () => !!get().accessToken,

  setTokens: (access, refresh) => {
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    set({ accessToken: access, refreshToken: refresh });
  },

  setWallet: (address, provider) => {
    localStorage.setItem('wallet_address', address);
    localStorage.setItem('wallet_provider', provider);
    set({ walletAddress: address, walletProvider: provider });
  },

  setRole: (role) => {
    localStorage.setItem('user_role', role);
    set({ role });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('wallet_provider');
    localStorage.removeItem('user_role');
    set({
      accessToken: null,
      refreshToken: null,
      walletAddress: null,
      walletProvider: null,
      role: null,
    });
  },
}));

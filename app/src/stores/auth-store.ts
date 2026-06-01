import { create } from 'zustand';

export type UserRole = 'SELLER' | 'BUYER' | 'LP';

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

// Tokens are stored in sessionStorage (cleared on tab close) rather than localStorage
// to reduce the persistent XSS attack surface. wallet_address and role are not secrets
// and stay in localStorage for cross-tab persistence.
const ss = (key: string) => typeof window !== 'undefined' ? sessionStorage.getItem(key) : null;
const ls = (key: string) => typeof window !== 'undefined' ? localStorage.getItem(key) : null;

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken:    ss('access_token'),
  refreshToken:   ss('refresh_token'),
  walletAddress:  ls('wallet_address'),
  walletProvider: ls('wallet_provider'),
  role: (ls('user_role') as UserRole | null),

  isAuthorized: () => !!get().accessToken,

  setTokens: (access, refresh) => {
    sessionStorage.setItem('access_token', access);
    sessionStorage.setItem('refresh_token', refresh);
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
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
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

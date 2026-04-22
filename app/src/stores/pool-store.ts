import { create } from 'zustand';
import { PoolService, type PoolStatus } from '@/services/PoolService';

export interface StakeRecord {
  public_id: string;
  amount: number;
  pool_address: string;
  created_at: string;
}

const STAKES_KEY = 'prova_pool_stakes';

function loadStakes(): StakeRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STAKES_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveStakes(stakes: StakeRecord[]) {
  localStorage.setItem(STAKES_KEY, JSON.stringify(stakes));
}

interface PoolState {
  status: PoolStatus | null;
  stakes: StakeRecord[];
  loading: boolean;
  fetchStatus: () => Promise<void>;
  addStake: (stake: StakeRecord) => void;
  removeStake: (publicId: string) => void;
}

export const usePoolStore = create<PoolState>((set, get) => ({
  status: null,
  stakes: loadStakes(),
  loading: false,

  fetchStatus: async () => {
    set({ loading: true });
    try {
      const status = await PoolService.getStatus();
      set({ status });
    } finally {
      set({ loading: false });
    }
  },

  addStake: (stake) => {
    const stakes = [stake, ...get().stakes];
    saveStakes(stakes);
    set({ stakes });
  },

  removeStake: (publicId) => {
    const stakes = get().stakes.filter((s) => s.public_id !== publicId);
    saveStakes(stakes);
    set({ stakes });
  },
}));

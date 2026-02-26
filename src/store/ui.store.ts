import { create } from 'zustand';

type UIState = {
    isPlayerOpen: boolean;
    setPlayerOpen: (open: boolean) => void;
};

export const useUIStore = create<UIState>()((set) => ({
    isPlayerOpen: false,
    setPlayerOpen: (open) => set({ isPlayerOpen: open }),
}));

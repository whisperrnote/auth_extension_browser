import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface ExtensionState {
  currentPage: string;
  user: any;
  isAuthenticated: boolean;
  isVaultUnlocked: boolean;
  popoutWindow: Window | null;
  isPopout: boolean;
  setCurrentPage: (page: string) => void;
  setUser: (user: any) => void;
  setAuthenticated: (auth: boolean) => void;
  setVaultUnlocked: (unlocked: boolean) => void;
  setPopoutWindow: (window: Window | null) => void;
  setIsPopout: (isPopout: boolean) => void;
}

export const useExtensionStore = create<ExtensionState>()(
  persist(
    (set) => ({
      currentPage: 'login',
      user: null,
      isAuthenticated: false,
      isVaultUnlocked: false,
      popoutWindow: null,
      isPopout: false,
      setCurrentPage: (page) => set({ currentPage: page }),
      setUser: (user) => set({ user }),
      setAuthenticated: (auth) => set({ isAuthenticated: auth }),
      setVaultUnlocked: (unlocked) => set({ isVaultUnlocked: unlocked }),
      setPopoutWindow: (window) => set({ popoutWindow: window }),
      setIsPopout: (isPopout) => set({ isPopout }),
    }),
    {
      name: 'extension-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const restoreStateFromStorage = async () => {
  // Force rehydration of the store
  useExtensionStore.persist.rehydrate();
};
 
// Subscribe to store changes and persist automatically
useExtensionStore.subscribe((state) => {
  persistStateToStorage(state);
});

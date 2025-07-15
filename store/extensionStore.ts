import { create } from "zustand";

type ExtensionState = {
  user: any;
  vaultUnlocked: boolean;
  currentPage: string;
  // ...other state...
  setUser: (user: any) => void;
  setVaultUnlocked: (unlocked: boolean) => void;
  setCurrentPage: (page: string) => void;
};

export const useExtensionStore = create<ExtensionState>((set) => ({
  user: null,
  vaultUnlocked: false,
  currentPage: "login",
  setUser: (user) => set({ user }),
  setVaultUnlocked: (vaultUnlocked) => set({ vaultUnlocked }),
  setCurrentPage: (currentPage) => set({ currentPage }),
}));

// Persist state to chrome.storage.local or localStorage
export async function persistStateToStorage(state: ExtensionState) {
  try {
    if (window.chrome?.storage?.local) {
      await chrome.storage.local.set({ extensionState: state });
    } else {
      localStorage.setItem("extensionState", JSON.stringify(state));
    }
  } catch {}
}

export async function restoreStateFromStorage() {
  try {
    if (window.chrome?.storage?.local) {
      chrome.storage.local.get("extensionState", (result) => {
        if (result.extensionState) {
          useExtensionStore.setState(result.extensionState);
        }
      });
    } else {
      const raw = localStorage.getItem("extensionState");
      if (raw) {
        useExtensionStore.setState(JSON.parse(raw));
      }
    }
  } catch {}
}

// Subscribe to store changes and persist automatically
useExtensionStore.subscribe((state) => {
  persistStateToStorage(state);
});

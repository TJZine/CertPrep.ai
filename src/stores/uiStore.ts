'use client';
import { create } from 'zustand';

interface UIState {
  isImportModalOpen: boolean;
  isModeSelectModalOpen: boolean;
  syncStatus: 'idle' | 'syncing' | 'completed' | 'error';
}

interface UIActions {
  openImportModal: () => void;
  closeImportModal: () => void;
  openModeSelectModal: () => void;
  closeModeSelectModal: () => void;
  setSyncStatus: (status: UIState['syncStatus']) => void;
}

const initialState: UIState = {
  isImportModalOpen: false,
  isModeSelectModalOpen: false,
  syncStatus: 'idle',
};

/**
 * Placeholder UI store for modal visibility.
 */
export const useUIStore = create<UIState & UIActions>((set) => ({
  ...initialState,
  openImportModal: (): void => set(() => ({ isImportModalOpen: true })),
  closeImportModal: (): void => set(() => ({ isImportModalOpen: false })),
  openModeSelectModal: (): void => set(() => ({ isModeSelectModalOpen: true })),
  closeModeSelectModal: (): void => set(() => ({ isModeSelectModalOpen: false })),
  setSyncStatus: (status): void => set(() => ({ syncStatus: status })),
}));

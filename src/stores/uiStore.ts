'use client';
import { create } from 'zustand';

interface UIState {
  isImportModalOpen: boolean;
  isModeSelectModalOpen: boolean;
}

interface UIActions {
  openImportModal: () => void;
  closeImportModal: () => void;
  openModeSelectModal: () => void;
  closeModeSelectModal: () => void;
}

const initialState: UIState = {
  isImportModalOpen: false,
  isModeSelectModalOpen: false,
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
}));

'use client';

import * as React from 'react';
import { Modal } from '@/components/ui/Modal';

const shortcuts = {
  'Quiz Navigation': [
    { keys: ['A', 'B', 'C', 'D'], description: 'Select answer option' },
    { keys: ['Enter'], description: 'Submit answer / Confirm' },
    { keys: ['←', '→'], description: 'Previous / Next question' },
    { keys: ['F'], description: 'Flag question for review' },
  ],
  'Zen Mode (After Answering)': [
    { keys: ['1'], description: 'Again - Review soon' },
    { keys: ['2'], description: 'Hard - Add to review list' },
    { keys: ['3'], description: 'Good - Move on' },
  ],
  General: [
    { keys: ['Esc'], description: 'Close modal / Exit' },
    { keys: ['?'], description: 'Show this help' },
  ],
};

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps): React.ReactElement {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="md">
      <div className="space-y-6">
        {Object.entries(shortcuts).map(([category, items]) => (
          <div key={category}>
            <h3 className="mb-3 font-semibold text-slate-900">{category}</h3>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.description + index}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="text-sm text-slate-600">{item.description}</span>
                  <div className="flex gap-1">
                    {item.keys.map((key) => (
                      <kbd
                        key={key}
                        className="rounded bg-slate-200 px-2 py-1 font-mono text-xs text-slate-700"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function useKeyboardShortcutsHelp(): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
} {
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect((): (() => void) => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
        const target = event.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          event.preventDefault();
          setIsOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return (): void => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: (): void => setIsOpen(true),
    close: (): void => setIsOpen(false),
  };
}

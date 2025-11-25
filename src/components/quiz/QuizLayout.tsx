'use client';

import * as React from 'react';
import { ArrowLeft, Clock, Keyboard, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from './ProgressBar';
import { cn } from '@/lib/utils';
import { KeyboardShortcutsHelp, useKeyboardShortcutsHelp } from '@/components/common/KeyboardShortcutsHelp';

interface QuizLayoutProps {
  title: string;
  currentProgress: number;
  totalQuestions: number;
  timerDisplay?: string;
  timerWarning?: boolean;
  onExit: () => void;
  showExitConfirm?: boolean;
  mode: 'zen' | 'proctor';
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}

/**
 * Shared layout shell for quiz modes with header, progress, and optional sidebar.
 */
export function QuizLayout({
  title,
  currentProgress,
  totalQuestions,
  timerDisplay,
  timerWarning = false,
  onExit,
  showExitConfirm = true,
  mode,
  children,
  sidebar,
  className,
}: QuizLayoutProps): React.ReactElement {
  const [showExitModal, setShowExitModal] = React.useState(false);
  const shortcutsHelp = useKeyboardShortcutsHelp();

  const handleExitClick = (): void => {
    if (showExitConfirm) {
      setShowExitModal(true);
    } else {
      onExit();
    }
  };

  const handleConfirmExit = (): void => {
    setShowExitModal(false);
    onExit();
  };

  return (
    <div className={cn('min-h-screen bg-slate-50', className)}>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" onClick={handleExitClick} aria-label="Exit quiz">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold text-slate-900 line-clamp-1">{title}</h1>
              <p className="text-xs text-slate-500 capitalize">{mode} Mode</p>
            </div>
          </div>

          <div className="flex-1 px-4 sm:max-w-md">
            <ProgressBar current={currentProgress} total={totalQuestions} showFraction size="sm" />
          </div>

          <div className="flex items-center gap-2">
            {timerDisplay && (
              <div
                className={cn(
                  'flex items-center gap-1 rounded-lg px-3 py-1.5 font-mono text-sm font-semibold',
                  timerWarning ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700',
                )}
                aria-label={`Time remaining: ${timerDisplay}`}
              >
                <Clock className="h-4 w-4" aria-hidden="true" />
                {timerDisplay}
              </div>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={shortcutsHelp.open}
              aria-label="Keyboard shortcuts"
              className="inline-flex"
            >
              <Keyboard className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleExitClick}
              aria-label="Close quiz"
              className="hidden sm:flex"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl">
        <div className={cn('flex', sidebar && 'lg:gap-6')}>
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
          {sidebar && <aside className="hidden w-64 border-l border-slate-200 bg-white p-4 lg:block">{sidebar}</aside>}
        </div>
      </div>

      <Modal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        title="Exit Quiz?"
        description="Your progress will be saved, but you'll need to restart this session."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowExitModal(false)}>
              Continue Quiz
            </Button>
            <Button variant="danger" onClick={handleConfirmExit}>
              Exit Quiz
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          You&apos;ve answered {currentProgress} of {totalQuestions} questions.
          {mode === 'proctor' && ' In Proctor mode, exiting will end your attempt.'}
        </p>
      </Modal>
      <KeyboardShortcutsHelp isOpen={shortcutsHelp.isOpen} onClose={shortcutsHelp.close} />
    </div>
  );
}

export default QuizLayout;

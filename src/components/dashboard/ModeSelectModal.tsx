'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Clock, Check, Zap } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { Quiz, QuizMode } from '@/types/quiz';

export interface ModeSelectModalProps {
  quiz: Quiz | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ModeOption {
  id: QuizMode;
  name: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  recommended?: boolean;
}

const modeOptions: ModeOption[] = [
  {
    id: 'zen',
    name: 'Zen Study',
    description: 'Learn at your own pace with immediate feedback',
    icon: <Brain className="h-8 w-8" aria-hidden="true" />,
    features: ['Instant answer feedback', 'Detailed explanations', 'Spaced repetition controls', 'AI Tutor integration'],
    recommended: true,
  },
  {
    id: 'proctor',
    name: 'Proctor Exam',
    description: 'Simulate real exam conditions',
    icon: <Clock className="h-8 w-8" aria-hidden="true" />,
    features: ['Timed countdown', 'No immediate feedback', 'Flag for review', 'Full results at end'],
  },
];

/**
 * Modal for selecting a quiz mode prior to starting.
 */
export function ModeSelectModal({ quiz, isOpen, onClose }: ModeSelectModalProps): React.ReactElement {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = React.useState<QuizMode>('zen');
  const questionCount = quiz?.questions.length ?? 0;
  const estimatedMinutes = questionCount > 0 ? Math.max(1, Math.ceil(questionCount * 1.5)) : null;

  const handleStart = (): void => {
    if (!quiz) return;
    onClose();
    router.push(`/quiz/${quiz.id}/${selectedMode}`);
  };

  React.useEffect(() => {
    if (isOpen) {
      setSelectedMode('zen');
    }
  }, [isOpen, quiz]);

  const footer = (
    <div className="flex justify-end gap-3">
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={handleStart} leftIcon={<Zap className="h-4 w-4" aria-hidden="true" />} disabled={!quiz}>
        Start {selectedMode === 'zen' ? 'Study' : 'Exam'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Study Mode"
      description={quiz ? `Starting: "${quiz.title}"` : undefined}
      size="lg"
      footer={footer}
    >
      {quiz ? (
        <p className="mb-4 text-sm text-slate-600">
          {quiz.questions.length} questions • ~{estimatedMinutes ?? 0} minutes
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {modeOptions.map((mode) => (
          <ModeCard
            key={mode.id}
            mode={mode}
            isSelected={selectedMode === mode.id}
            onSelect={() => setSelectedMode(mode.id)}
          />
        ))}
      </div>
    </Modal>
  );
}

function ModeCard({
  mode,
  isSelected,
  onSelect,
}: {
  mode: ModeOption;
  isSelected: boolean;
  onSelect: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'relative flex h-full flex-col rounded-xl border-2 p-6 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2',
        isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-offset-2' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50',
      )}
      aria-pressed={isSelected}
    >
      {mode.recommended ? (
        <Badge className="absolute -top-2 left-4" variant="default">
          Recommended
        </Badge>
      ) : null}

      <div
        className={cn(
          'mb-4 flex h-16 w-16 items-center justify-center rounded-full',
          isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600',
        )}
      >
        {mode.icon}
      </div>

      <h3 className="text-lg font-semibold text-slate-900">{mode.name}</h3>
      <p className="mt-1 text-sm text-slate-500">{mode.description}</p>

      <ul className="mt-4 space-y-2">
        {mode.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
            <Check className="h-4 w-4 text-green-500" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex justify-center">
        <div
          className={cn(
            'h-5 w-5 rounded-full border-2',
            isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300',
          )}
        >
          {isSelected ? <Check className="h-full w-full p-0.5 text-white" aria-hidden="true" /> : null}
        </div>
      </div>
    </button>
  );
}

export default ModeSelectModal;

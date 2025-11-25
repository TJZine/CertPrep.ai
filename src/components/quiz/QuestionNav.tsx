'use client';
import * as React from 'react';
import { Button } from '@/components/ui/Button';

export interface QuestionNavProps {
  currentIndex: number;
  total: number;
  onPrevious?: () => void;
  onNext?: () => void;
}

/**
 * Previous/next navigation placeholder.
 */
export function QuestionNav({ currentIndex, total, onPrevious, onNext }: QuestionNavProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button variant="secondary" onClick={onPrevious} disabled={currentIndex <= 0}>
        Previous
      </Button>
      <div className="text-sm text-slate-700">
        Question {currentIndex + 1} of {total}
      </div>
      <Button variant="secondary" onClick={onNext} disabled={currentIndex >= total - 1}>
        Next
      </Button>
    </div>
  );
}

export default QuestionNav;

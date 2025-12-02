'use client';

import * as React from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function QuizLoading(): React.ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <LoadingSpinner size="lg" text="Preparing your quiz..." />
    </div>
  );
}

'use client';

import * as React from 'react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export default function Loading(): React.ReactElement {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner size="lg" text="Loading..." />
    </div>
  );
}

'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, FileQuestion, Home } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFound(): React.ReactElement {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100">
        <FileQuestion className="h-12 w-12 text-slate-400" aria-hidden="true" />
      </div>

      <h1 className="mb-2 text-3xl font-bold text-slate-900">Page Not Found</h1>
      <p className="mb-8 max-w-md text-slate-600">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="w-full sm:w-auto">
          <Button className="w-full">
            <Home className="mr-2 h-4 w-4" aria-hidden="true" />
            Go to Dashboard
          </Button>
        </Link>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Go Back
        </Button>
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import { Shield } from 'lucide-react';
import { APP_NAME, APP_VERSION } from '@/lib/constants';

/**
 * Application footer with privacy messaging.
 */
export function Footer(): React.ReactElement {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span className="font-semibold text-slate-900">{APP_NAME}</span>
          <span className="text-slate-500">v{APP_VERSION}</span>
          <span className="text-slate-500">Professional exam simulator</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600">
          <Shield className="h-4 w-4" aria-hidden="true" />
          <span>Privacy First: All data stored locally</span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

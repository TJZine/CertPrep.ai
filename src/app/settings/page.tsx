'use client';

import * as React from 'react';
import { DataManagement } from '@/components/settings/DataManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { APP_NAME, APP_VERSION } from '@/lib/constants';
import { Settings, Info, Shield } from 'lucide-react';

export default function SettingsPage(): React.ReactElement {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900">
          <Settings className="h-7 w-7" aria-hidden="true" />
          Settings
        </h1>
        <p className="mt-1 text-slate-500">Manage your data and application preferences</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About {APP_NAME}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-700">Version {APP_VERSION}</p>
              <p className="text-sm text-slate-500">Professional exam simulator with AI-assisted learning</p>
            </div>
            <Badge variant="success">
              <Shield className="mr-1 h-3 w-3" />
              Privacy First
            </Badge>
          </div>

          <div className="mt-4 rounded-lg bg-blue-50 p-4">
            <h4 className="font-medium text-blue-900">Privacy Notice</h4>
            <p className="mt-1 text-sm text-blue-700">
              All your data is stored locally on your device using IndexedDB. No data is ever sent to external servers.
              Your quiz results, progress, and personal notes never leave your browser.
            </p>
          </div>
        </CardContent>
      </Card>

      <DataManagement />
    </div>
  );
}

'use client';

import * as React from 'react';
import { DataManagement } from '@/components/settings/DataManagement';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { APP_NAME, APP_VERSION } from '@/lib/constants';
import { Settings, Info, Shield } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

export default function SettingsPage(): React.ReactElement {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
          <Settings className="h-7 w-7" aria-hidden="true" />
          Settings
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-300">Manage your data and application preferences</p>
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
              <p className="text-slate-700 dark:text-slate-200">Version {APP_VERSION}</p>
              <p className="text-sm text-slate-500 dark:text-slate-300">Professional exam simulator with AI-assisted learning</p>
            </div>
            <Badge variant="success">
              <Shield className="mr-1 h-3 w-3" />
              Privacy First
            </Badge>
          </div>

          <div className="mt-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/30">
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Privacy Notice</h4>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-100">
              {user
                ? 'Your data is stored locally first and securely synced to your account so you can back up and access it across devices. You can clear both local and cloud data from this page at any time.'
                : 'Your data stays local to this device using IndexedDB. You can sign in to enable encrypted sync and backups, or continue fully offline.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <ProfileSettings />
      <SecuritySettings />
      <DataManagement />
    </div>
  );
}

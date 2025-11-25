'use client';

import * as React from 'react';
import { Download, Upload, Trash2, HardDrive, AlertTriangle, FileJson } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  downloadDataAsFile,
  importData,
  validateImportData,
  clearAllData,
  getStorageStats,
  type ExportData,
} from '@/lib/dataExport';

export function DataManagement(): React.ReactElement {
  const { addToast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [stats, setStats] = React.useState<{
    quizCount: number;
    resultCount: number;
    estimatedSizeKB: number;
  } | null>(null);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [showResetModal, setShowResetModal] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importFile, setImportFile] = React.useState<ExportData | null>(null);
  const [importMode, setImportMode] = React.useState<'merge' | 'replace'>('merge');

  React.useEffect((): void => {
    getStorageStats().then(setStats);
  }, []);

  const refreshStats = async (): Promise<void> => {
    const newStats = await getStorageStats();
    setStats(newStats);
  };

  const handleExport = async (): Promise<void> => {
    setIsExporting(true);
    try {
      await downloadDataAsFile();
      addToast('success', 'Data exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      addToast('error', 'Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e): void => {
      try {
        const data = JSON.parse((e.target?.result as string) ?? '');
        if (!validateImportData(data)) {
          addToast('error', 'Invalid backup file format.');
          return;
        }
        setImportFile(data);
        setShowImportModal(true);
      } catch (error) {
        console.error('Failed to read file:', error);
        addToast('error', "Failed to read file. Please ensure it's a valid JSON file.");
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleImportConfirm = async (): Promise<void> => {
    if (!importFile) return;
    setIsImporting(true);
    try {
      const result = await importData(importFile, importMode);
      addToast('success', `Imported ${result.quizzesImported} quizzes and ${result.resultsImported} results!`);
      setShowImportModal(false);
      setImportFile(null);
      await refreshStats();
    } catch (error) {
      console.error('Import failed:', error);
      addToast('error', 'Failed to import data. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = async (): Promise<void> => {
    setIsResetting(true);
    try {
      await clearAllData();
      addToast('success', 'All data has been cleared.');
      setShowResetModal(false);
      await refreshStats();
      window.location.href = '/';
    } catch (error) {
      console.error('Reset failed:', error);
      addToast('error', 'Failed to reset data. Please try again.');
      setIsResetting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>Export, import, or reset your quiz data. All data is stored locally on your device.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {stats ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h4 className="mb-2 font-medium text-slate-900">Storage Usage</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.quizCount}</p>
                  <p className="text-sm text-slate-500">Quizzes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.resultCount}</p>
                  <p className="text-sm text-slate-500">Results</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.estimatedSizeKB} KB</p>
                  <p className="text-sm text-slate-500">Est. Size</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <h4 className="font-medium text-slate-900">Export Data</h4>
              <p className="text-sm text-slate-500">Download all your quizzes and results as a JSON file</p>
            </div>
            <Button onClick={handleExport} isLoading={isExporting} leftIcon={<Download className="h-4 w-4" />}>
              Export
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <h4 className="font-medium text-slate-900">Import Data</h4>
              <p className="text-sm text-slate-500">Restore from a previously exported backup file</p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Select backup file to import"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} leftIcon={<Upload className="h-4 w-4" />}>
                Import
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
            <div>
              <h4 className="font-medium text-red-900">Reset All Data</h4>
              <p className="text-sm text-red-700">Permanently delete all quizzes, results, and settings</p>
            </div>
            <Button variant="danger" onClick={() => setShowResetModal(true)} leftIcon={<Trash2 className="h-4 w-4" />}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setImportFile(null);
        }}
        title="Import Data"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setShowImportModal(false);
                setImportFile(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleImportConfirm} isLoading={isImporting}>
              Import
            </Button>
          </>
        }
      >
        {importFile ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <FileJson className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium text-slate-900">Backup File</p>
                  <p className="text-sm text-slate-500">
                    {importFile.quizzes.length} quizzes, {importFile.results.length} results
                  </p>
                  <p className="text-xs text-slate-400">
                    Exported: {new Date(importFile.exportedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Import Mode</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={importMode === 'merge'}
                    onChange={() => setImportMode('merge')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700">Merge (keep existing data, add new)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="h-4 w-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700">Replace (delete existing data first)</span>
                </label>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset All Data?"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset} isLoading={isResetting}>
              Yes, Delete Everything
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-slate-700">This will permanently delete:</p>
            <ul className="mt-2 list-inside list-disc text-sm text-slate-600">
              <li>All imported quizzes</li>
              <li>All quiz results and history</li>
              <li>All settings and preferences</li>
            </ul>
            <p className="mt-4 font-medium text-red-700">This action cannot be undone!</p>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default DataManagement;

'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { Quiz } from '@/types/quiz';

export interface DeleteConfirmModalProps {
  quiz: Quiz | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
  attemptCount?: number;
}

/**
 * Confirmation dialog for deleting a quiz and its associated results.
 */
export function DeleteConfirmModal({
  quiz,
  isOpen,
  onClose,
  onConfirm,
  isDeleting = false,
  attemptCount = 0,
}: DeleteConfirmModalProps): React.ReactElement | null {
  const title = quiz ? `"${quiz.title}"` : 'this quiz';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Quiz"
      description={`Are you sure you want to delete ${title}? This will also delete all ${
        attemptCount ?? 0
      } attempt records. This action cannot be undone.`}
      size="sm"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-orange-100 p-2 text-orange-600" aria-hidden="true">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm text-slate-700">
          Deleting a quiz removes it from your library along with any saved attempts or analytics. You
          will not be able to recover this data later.
        </p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} isLoading={isDeleting}>
          Delete Quiz
        </Button>
      </div>
    </Modal>
  );
}

export default DeleteConfirmModal;

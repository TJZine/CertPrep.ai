import React, { useState, useEffect, useMemo } from 'react';

/**
 * Asynchronously resolves the correct answer key for a question by hashing options.
 * Offloads computation to a Web Worker to prevent main thread blocking.
 */
export function useCorrectAnswer(
  questionId: string | null,
  targetHash: string | null,
  options?: Record<string, string>
): { resolvedAnswers: Record<string, string>; isResolving: boolean } {
  const [resolvedAnswers, setResolvedAnswers] = useState<Record<string, string>>({});
  const [isResolving, setIsResolving] = useState(false);
  
  // Keep track of resolved attempts to avoid re-work
  const resolvedRef = React.useRef<Set<string>>(new Set());
  
  // Stable worker reference
  const workerRef = React.useRef<Worker | null>(null);

  // Memoize options key to prevent effect re-runs on unstable object references
  // This fixes the eslint-disable requirement safely.
  const optionsKey = useMemo(() => {
    return options ? JSON.stringify(Object.keys(options).sort()) : '';
  }, [options]);

  useEffect((): (() => void) => {
    // Initialize worker once
    workerRef.current = new Worker(new URL('../workers/hash.worker.ts', import.meta.url));

    return (): void => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []); // Run once on mount

  useEffect((): (() => void) => {
    let isMounted = true;
    let handler: ((event: MessageEvent) => void) | null = null;

    const resolveAnswer = async (): Promise<void> => {
      if (!questionId || !targetHash || !options || !workerRef.current) return;

      const cacheKey = `${questionId}:${targetHash}`;
      if (resolvedRef.current.has(cacheKey)) return;
      
      setIsResolving(true);

      // Define handler in scope where we can clean it up
      handler = (event: MessageEvent): void => {
        const { type, payload } = event.data;
        
        if (type === 'hash_bulk_error' && payload.id === questionId) {
          console.error('Worker error:', payload.error);
          if (isMounted) setIsResolving(false);
          // Remove listener on error to avoid leaking
          if (handler && workerRef.current) {
             workerRef.current.removeEventListener('message', handler);
          }
          return;
        }

        if (type === 'hash_bulk_result' && payload.id === questionId) {
          const hashes = payload.hashes as Record<string, string>;
          // Find match
          const match = Object.entries(hashes).find((entry) => entry[1] === targetHash);
          
          if (match) {
            const [correctOptionKey] = match;
            if (isMounted) {
              setResolvedAnswers(prev => ({
                ...prev,
                [questionId]: correctOptionKey
              }));
            }
          }
          
          resolvedRef.current.add(cacheKey);
          if (isMounted) setIsResolving(false);
          
          // Remove self
          if (handler && workerRef.current) {
             workerRef.current.removeEventListener('message', handler);
          }
        }
      };

      workerRef.current.addEventListener('message', handler);
      
      // Send work
      workerRef.current.postMessage({
        type: 'hash_bulk',
        payload: {
          id: questionId,
          options
        }
      });
    };

    void resolveAnswer();

    return () => {
      isMounted = false;
      if (handler && workerRef.current) {
        workerRef.current.removeEventListener('message', handler);
      }
    };
  }, [questionId, targetHash, optionsKey, options]); // Safe deps now

  return { resolvedAnswers, isResolving };
}
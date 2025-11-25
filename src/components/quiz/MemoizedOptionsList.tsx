'use client';

import * as React from 'react';
import { OptionsList } from './OptionsList';

/**
 * Memoized wrapper for OptionsList to avoid unnecessary re-renders.
 */
export const MemoizedOptionsList = React.memo(
  OptionsList,
  (prevProps, nextProps) =>
    prevProps.selectedAnswer === nextProps.selectedAnswer &&
    prevProps.hasSubmitted === nextProps.hasSubmitted &&
    prevProps.correctAnswer === nextProps.correctAnswer &&
    prevProps.disabled === nextProps.disabled &&
    JSON.stringify(prevProps.options) === JSON.stringify(nextProps.options),
);

MemoizedOptionsList.displayName = 'MemoizedOptionsList';

export default MemoizedOptionsList;

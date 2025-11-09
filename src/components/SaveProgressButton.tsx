import React from 'react';
import { Button } from './ui/Button';
import { Tooltip } from './ui/Tooltip';

interface SaveProgressButtonProps {
  onClick: () => void;
  className?: string;
}

export function SaveProgressButton({ onClick, className = '' }: SaveProgressButtonProps) {
  const isFullWidth = className.includes('w-full');

  return (
    <Tooltip
      content={
        <div className="text-slate-700">
          <p className="font-semibold mb-1">Save Your Progress</p>
          <p>Save your configuration at any point and return later when you're ready to continue.</p>
        </div>
      }
      fullWidth={isFullWidth}
    >
      <Button
        variant="outline"
        size="md"
        onClick={onClick}
        className={className}
        aria-label="Save your progress"
      >
        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <span className="whitespace-nowrap">Save Progress</span>
      </Button>
    </Tooltip>
  );
}

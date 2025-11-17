import React from 'react';
import { Button } from './ui/Button';

interface GuidanceContinueButtonProps {
  onClick: () => void;
  disabled?: boolean;
  nextStepTitle: string;
  isMobile?: boolean;
  shouldShowPulse?: boolean;
  shouldShowHint?: boolean;
  className?: string;
}

export function GuidanceContinueButton({
  onClick,
  disabled = false,
  nextStepTitle,
  isMobile = false,
  shouldShowPulse = false,
  shouldShowHint = false,
  className = '',
}: GuidanceContinueButtonProps) {
  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={onClick}
        size="md"
        className={`py-4 sm:py-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
          isMobile && shouldShowPulse && !disabled ? 'animate-button-pulsate animate-button-glow' : ''
        } ${className}`}
        disabled={disabled}
      >
        Continue to {nextStepTitle}
      </Button>
      {isMobile && shouldShowHint && !disabled && (
        <p className="guidance-hint text-center">
          Tap to continue to the next step
        </p>
      )}
    </div>
  );
}

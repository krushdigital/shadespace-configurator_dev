import React from 'react';
import { Check } from 'lucide-react';

interface StepCompletionIndicatorProps {
  show: boolean;
  message?: string;
}

export function StepCompletionIndicator({ show, message = 'Step Complete!' }: StepCompletionIndicatorProps) {
  if (!show) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-[#BFF102] border-2 border-[#307C31] rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
        <div className="w-6 h-6 bg-[#307C31] rounded-full flex items-center justify-center animate-check-expand">
          <Check className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold text-[#01312D]">{message}</span>
      </div>
    </div>
  );
}

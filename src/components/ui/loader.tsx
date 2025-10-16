import React from 'react';

interface LoadingOverlayProps {
  isVisible?: boolean;
  currentStep?: string;
  progress?: number;
}

export function LoadingOverlay({
  isVisible = false,
  currentStep = 'Loading...',
  progress
}: LoadingOverlayProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-[#01312D]"></div>
        <p className="text-slate-700 font-medium">{currentStep}</p>
        {progress !== undefined && (
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#BFF102] h-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

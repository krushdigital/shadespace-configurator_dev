import React from 'react';

interface LoadingOverlayProps {
  isVisible: boolean;
  currentStep?: string;
  progress?: number;
}

export function LoadingOverlay({ isVisible, currentStep = 'Loading...', progress = 0 }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4">
            <svg
              className="animate-spin h-16 w-16 text-[#BFF102]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#01312D] mb-2">{currentStep}</h3>
          <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
            <div
              className="bg-[#BFF102] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-[#01312D]/60">Please wait...</p>
        </div>
      </div>
    </div>
  );
}

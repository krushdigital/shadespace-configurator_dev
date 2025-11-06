import React from 'react';

interface SaveProgressButtonProps {
  onClick: () => void;
  hasContent: boolean;
}

export function SaveProgressButton({ onClick, hasContent }: SaveProgressButtonProps) {
  if (!hasContent) return null;

  return (
    <div className="hidden lg:block fixed top-4 right-4 z-40 lg:top-6 lg:right-6">
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-[#307C31] text-[#307C31] rounded-full shadow-lg hover:bg-[#307C31] hover:text-white transition-all duration-200 font-semibold text-sm"
        aria-label="Save your progress"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <span>Save Progress</span>
      </button>
    </div>
  );
}

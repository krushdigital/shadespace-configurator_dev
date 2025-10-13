import React from 'react';

interface PhaseIndicatorProps {
  currentStep: number;
  hasQuote: boolean;
}

export function PhaseIndicator({ currentStep, hasQuote }: PhaseIndicatorProps) {
  // Phase 1: Get Quote (Steps 0-4)
  // Phase 2: Complete Order (Steps 5-6)
  const isPhase1 = currentStep <= 4;
  const phase1Complete = hasQuote || currentStep > 4;

  return (
    <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Phase 1 */}
          <div className="flex items-center gap-3 flex-1">
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                phase1Complete
                  ? 'bg-[#307C31] text-white'
                  : isPhase1
                  ? 'bg-[#BFF102] text-[#01312D] ring-2 ring-[#307C31]'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {phase1Complete ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                '1'
              )}
            </div>
            <div className="flex-1">
              <div
                className={`text-xs font-semibold uppercase tracking-wider ${
                  isPhase1 ? 'text-[#307C31]' : phase1Complete ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                Phase 1
              </div>
              <div
                className={`text-sm font-bold ${
                  isPhase1 ? 'text-[#01312D]' : phase1Complete ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                Get Your Quote
              </div>
              {isPhase1 && !hasQuote && (
                <div className="text-xs text-slate-600 mt-0.5">
                  Step {currentStep + 1} of 5
                </div>
              )}
              {phase1Complete && (
                <div className="text-xs text-[#307C31] font-medium mt-0.5">
                  Complete
                </div>
              )}
            </div>
          </div>

          {/* Connector */}
          <div className="flex-shrink-0 w-12 h-0.5 bg-gradient-to-r from-slate-300 to-slate-300 relative">
            {phase1Complete && (
              <div className="absolute inset-0 bg-gradient-to-r from-[#307C31] to-[#307C31] transition-all duration-500" />
            )}
          </div>

          {/* Phase 2 */}
          <div className="flex items-center gap-3 flex-1">
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                !isPhase1 && phase1Complete
                  ? 'bg-[#BFF102] text-[#01312D] ring-2 ring-[#307C31]'
                  : phase1Complete
                  ? 'bg-slate-300 text-slate-600'
                  : 'bg-slate-200 text-slate-400'
              }`}
            >
              2
            </div>
            <div className="flex-1">
              <div
                className={`text-xs font-semibold uppercase tracking-wider ${
                  !isPhase1 && phase1Complete ? 'text-[#307C31]' : phase1Complete ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                Phase 2
              </div>
              <div
                className={`text-sm font-bold ${
                  !isPhase1 && phase1Complete ? 'text-[#01312D]' : phase1Complete ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                Complete Your Order
              </div>
              {!isPhase1 && phase1Complete && (
                <div className="text-xs text-slate-600 mt-0.5">
                  Step {currentStep - 4} of 2
                </div>
              )}
              {!phase1Complete && (
                <div className="text-xs text-slate-400 mt-0.5">
                  Unlocks after quote
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Message */}
        {isPhase1 && !hasQuote && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <svg className="w-4 h-4 text-[#307C31]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Complete Phase 1 to see your custom pricing and save your quote
              </span>
            </div>
          </div>
        )}

        {hasQuote && isPhase1 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-[#307C31]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-[#307C31] font-semibold">
                Quote ready! Continue to complete your order or save for later
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

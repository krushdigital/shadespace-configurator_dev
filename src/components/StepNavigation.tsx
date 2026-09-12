import React from 'react';
import { Check, Bookmark } from 'lucide-react';
import logoWhite from '../assets/logo-white.png';

interface StepDef {
  label: string;
  subtitle?: string;
  completed: boolean;
  current: boolean;
  accessible: boolean;
}

interface StepRailProps {
  steps: StepDef[];
  onStepClick: (index: number) => void;
  onSave?: () => void;
}

export function StepRail({ steps, onStepClick, onSave }: StepRailProps) {
  return (
    <nav className="hidden tablet:flex flex-col w-rail min-w-[180px] max-w-[300px] h-screen bg-brand-green text-white flex-shrink-0 sticky top-0 self-start max-h-screen">
      <div className="px-6 pt-6 pb-8">
        <img src={logoWhite} alt="ShadeSpace" className="h-8 w-auto" />
      </div>

      <div className="flex flex-col gap-1 px-3 flex-1">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => step.accessible && onStepClick(i)}
            disabled={!step.accessible}
            className={`flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group min-h-[44px] ${
              step.current
                ? 'bg-white/15'
                : step.accessible
                  ? 'hover:bg-white/8'
                  : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <span
              className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold flex-shrink-0 transition-all duration-200 mt-0.5 ${
                step.completed
                  ? 'bg-brand-lime text-brand-green'
                  : step.current
                    ? 'bg-white text-brand-green'
                    : 'border-2 border-white/40 text-white/60'
              }`}
            >
              {step.completed ? <Check className="w-4 h-4" /> : i + 1}
            </span>
            <div className="flex flex-col min-w-0">
              <span className={`text-[15px] font-semibold transition-colors duration-200 ${
                step.current ? 'text-white' : step.completed ? 'text-white/90' : 'text-white/50'
              }`}>
                {step.label}
              </span>
              {step.subtitle && (
                <span className="text-[12px] text-[#9fc4ad] leading-tight mt-0.5 truncate">
                  {step.subtitle}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Save progress link */}
      {onSave && (
        <div className="px-6 py-3" style={{ marginTop: 'auto' }}>
          <button
            onClick={onSave}
            className="flex items-center gap-2 text-brand-lime text-[14px] font-semibold hover:text-white transition-colors min-h-[44px]"
          >
            <Bookmark className="w-4 h-4" />
            Save progress
          </button>
        </div>
      )}

      <div className="px-6 py-4 text-white/30 text-xs">
        &copy; ShadeSpace
      </div>
    </nav>
  );
}

interface MobileHeaderProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
  onSave?: () => void;
  onStepClick?: (index: number) => void;
}

export function MobileHeader({ currentStep, totalSteps, stepLabels, onSave, onStepClick }: MobileHeaderProps) {
  return (
    <div className="tablet:hidden sticky top-0 z-[999] bg-brand-green">
      <div className="flex items-center justify-between px-4 py-3">
        <img src={logoWhite} alt="ShadeSpace" className="h-6 w-auto" />
        <span className="text-white/80 text-sm font-semibold">
          Step {currentStep} of {totalSteps}
        </span>
        {onSave ? (
          <button
            onClick={onSave}
            className="text-brand-lime text-sm font-semibold hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            Save
          </button>
        ) : (
          <div className="w-11" />
        )}
      </div>

      <div className="flex gap-1 px-4 pb-1">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full overflow-hidden bg-white/20"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                i < currentStep ? 'w-full bg-brand-lime' : 'w-0 bg-brand-lime'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Tappable step labels below progress segments */}
      {stepLabels && stepLabels.length > 0 && (
        <div className="flex gap-1 px-4 pb-3 pt-1">
          {stepLabels.map((label, i) => (
            <button
              key={i}
              onClick={() => i < currentStep && onStepClick?.(i)}
              className={`flex-1 text-center text-[10px] font-bold leading-tight truncate min-h-[28px] flex items-center justify-center ${
                i === currentStep - 1
                  ? 'text-brand-lime'
                  : i < currentStep
                    ? 'text-white/70 hover:text-white'
                    : 'text-white/30 cursor-default'
              }`}
              disabled={i >= currentStep}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

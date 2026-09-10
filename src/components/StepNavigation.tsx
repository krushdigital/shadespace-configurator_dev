import React from 'react';
import { Check } from 'lucide-react';
import logoWhite from '../assets/logo-white.png';

interface StepDef {
  label: string;
  completed: boolean;
  current: boolean;
  accessible: boolean;
}

interface StepRailProps {
  steps: StepDef[];
  onStepClick: (index: number) => void;
}

export function StepRail({ steps, onStepClick }: StepRailProps) {
  return (
    <nav className="hidden tablet:flex flex-col w-rail min-h-screen bg-brand-green text-white flex-shrink-0">
      <div className="px-6 pt-6 pb-8">
        <img src={logoWhite} alt="ShadeSpace" className="h-8 w-auto" />
      </div>

      <div className="flex flex-col gap-1 px-3 flex-1">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => step.accessible && onStepClick(i)}
            disabled={!step.accessible}
            className={`flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200 group min-h-[44px] ${
              step.current
                ? 'bg-white/15'
                : step.accessible
                  ? 'hover:bg-white/8'
                  : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <span
              className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold flex-shrink-0 transition-all duration-200 ${
                step.completed
                  ? 'bg-brand-lime text-brand-green'
                  : step.current
                    ? 'bg-white text-brand-green'
                    : 'border-2 border-white/40 text-white/60'
              }`}
            >
              {step.completed ? <Check className="w-4 h-4" /> : i + 1}
            </span>
            <span className={`text-[15px] font-semibold transition-colors duration-200 ${
              step.current ? 'text-white' : step.completed ? 'text-white/90' : 'text-white/50'
            }`}>
              {step.label}
            </span>
          </button>
        ))}
      </div>

      <div className="px-6 py-6 text-white/30 text-xs">
        &copy; ShadeSpace
      </div>
    </nav>
  );
}

interface MobileHeaderProps {
  currentStep: number;
  totalSteps: number;
  onSave?: () => void;
}

export function MobileHeader({ currentStep, totalSteps, onSave }: MobileHeaderProps) {
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

      <div className="flex gap-1 px-4 pb-3">
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
    </div>
  );
}

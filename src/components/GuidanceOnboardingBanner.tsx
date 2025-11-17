import React from 'react';
import { X, Sparkles } from 'lucide-react';

interface GuidanceOnboardingBannerProps {
  onDismiss: () => void;
  onOpenSettings: () => void;
}

export function GuidanceOnboardingBanner({
  onDismiss,
  onOpenSettings,
}: GuidanceOnboardingBannerProps) {
  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-40 onboarding-banner">
      <div className="bg-gradient-to-r from-[#BFF102] to-[#caee41] border-b-2 border-[#307C31] shadow-lg">
        <div className="px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-[#01312D]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#01312D] mb-1">
                Mobile Guidance Active
              </p>
              <p className="text-xs text-[#01312D]/80 mb-2">
                We'll help guide you through each step with smart scrolling and helpful hints.
              </p>
              <button
                onClick={onOpenSettings}
                className="text-xs font-medium text-[#01312D] underline hover:no-underline"
              >
                Customize in settings
              </button>
            </div>
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-1 hover:bg-[#01312D]/10 rounded transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-5 h-5 text-[#01312D]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

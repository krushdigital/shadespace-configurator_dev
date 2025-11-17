import React from 'react';
import { X, Settings } from 'lucide-react';
import { GuidancePreferences } from '../utils/guidancePreferences';

interface GuidanceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: GuidancePreferences;
  onUpdatePreferences: (updates: Partial<GuidancePreferences>) => Promise<void>;
  onReset: () => void;
}

export function GuidanceSettingsModal({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
  onReset,
}: GuidanceSettingsModalProps) {
  if (!isOpen) return null;

  const handleToggleGuidance = async () => {
    await onUpdatePreferences({ guidanceEnabled: !preferences.guidanceEnabled });
  };

  const handleSpeedChange = async (speed: 'slow' | 'normal' | 'fast') => {
    await onUpdatePreferences({ autoScrollSpeed: speed });
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="settings-overlay absolute inset-0"
        onClick={onClose}
      />

      <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl animate-slide-in-right">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#307C31]" />
              <h3 className="text-lg font-bold text-[#01312D]">Guidance Settings</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close settings"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="guidance-toggle" className="text-sm font-semibold text-[#01312D]">
                  Mobile Guidance
                </label>
                <button
                  id="guidance-toggle"
                  onClick={handleToggleGuidance}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.guidanceEnabled ? 'bg-[#307C31]' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={preferences.guidanceEnabled}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.guidanceEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-slate-600">
                {preferences.guidanceEnabled
                  ? 'Automatic scrolling and helpful hints are active'
                  : 'Navigate manually without automatic assistance'}
              </p>
            </div>

            {preferences.guidanceEnabled && (
              <div>
                <label className="text-sm font-semibold text-[#01312D] block mb-3">
                  Auto-Scroll Speed
                </label>
                <div className="space-y-2">
                  {(['slow', 'normal', 'fast'] as const).map((speed) => (
                    <button
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      className={`w-full p-3 rounded-lg border-2 transition-all ${
                        preferences.autoScrollSpeed === speed
                          ? 'border-[#307C31] bg-[#BFF102]/10 ring-2 ring-[#307C31]/20'
                          : 'border-slate-200 hover:border-[#307C31]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#01312D] capitalize">
                          {speed}
                        </span>
                        {preferences.autoScrollSpeed === speed && (
                          <div className="w-4 h-4 rounded-full bg-[#307C31] flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 text-left mt-1">
                        {speed === 'slow' && 'Gentle scrolling with more time to read'}
                        {speed === 'normal' && 'Balanced speed for most users'}
                        {speed === 'fast' && 'Quick navigation for experienced users'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-sm font-semibold text-[#01312D] mb-2">About Mobile Guidance</h4>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[#307C31] font-bold">•</span>
                  <span>Automatically scrolls to the next section when you make a selection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#307C31] font-bold">•</span>
                  <span>Highlights the Continue button when a step is complete</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#307C31] font-bold">•</span>
                  <span>Pauses automatically if you scroll backwards</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#307C31] font-bold">•</span>
                  <span>Smart delay when browsing colors to avoid interruption</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="p-4 border-t border-slate-200">
            <button
              onClick={handleReset}
              className="w-full px-4 py-2 text-sm font-medium text-[#307C31] border-2 border-[#307C31] rounded-lg hover:bg-[#307C31] hover:text-white transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

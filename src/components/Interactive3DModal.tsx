import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Interactive3DShadeSail } from './Interactive3DShadeSail';
import { MeasurementLines } from './MeasurementLines';

interface Interactive3DModalProps {
  isOpen: boolean;
  onClose: () => void;
  corners: number;
  measurementType: 'space' | 'sail' | null;
  fabricColor: string;
}

export function Interactive3DModal({
  isOpen,
  onClose,
  corners,
  measurementType,
  fabricColor
}: Interactive3DModalProps) {
  const [showInstructions, setShowInstructions] = useState(true);
  const [hasSeenInstructions, setHasSeenInstructions] = useState(false);

  useEffect(() => {
    if (isOpen && !hasSeenInstructions) {
      setShowInstructions(true);
      const timer = setTimeout(() => {
        setShowInstructions(false);
        setHasSeenInstructions(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else if (isOpen && hasSeenInstructions) {
      setShowInstructions(false);
    }
  }, [isOpen, hasSeenInstructions]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full md:w-[90vw] md:h-[90vh] md:max-w-6xl md:rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-white/95 to-white/0 backdrop-blur-sm">
          <div className="flex items-center justify-between p-4 md:p-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-[#01312D]">
                Interactive 3D View
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {measurementType === 'space'
                  ? 'Space measurements between fixing points'
                  : 'Finished shade sail dimensions'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
              aria-label="Close 3D view"
            >
              <X className="w-6 h-6 text-slate-600 group-hover:text-slate-900" />
            </button>
          </div>
        </div>

        {/* 3D Canvas */}
        <div className="w-full h-full">
          <Interactive3DShadeSail
            corners={corners}
            measurementType={measurementType}
            fabricColor={fabricColor}
          />

          {/* Measurement lines overlay */}
          {corners > 0 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 400 400"
              style={{ zIndex: 10 }}
            >
              <MeasurementLines
                measurementType={measurementType}
                corners={corners}
                isActive={true}
              />
            </svg>
          )}
        </div>

        {/* Instructions Overlay */}
        {showInstructions && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-md mx-4 animate-fade-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[#BFF102] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-[#01312D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-[#01312D] mb-2">
                  How to Interact
                </h3>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#01312D] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-[#01312D]">Drag to Rotate</p>
                    <p className="text-sm text-slate-600">Click and drag to rotate the view</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#01312D] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-[#01312D]">Scroll to Zoom</p>
                    <p className="text-sm text-slate-600">Use mouse wheel or pinch to zoom in/out</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#01312D] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-[#01312D]">Right-click to Pan</p>
                    <p className="text-sm text-slate-600">Right-click and drag to move the view</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowInstructions(false)}
                className="w-full bg-[#BFF102] hover:bg-[#a8d902] text-[#01312D] font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Got it, let's explore!
              </button>
            </div>
          </div>
        )}

        {/* Persistent Help Button */}
        {!showInstructions && (
          <button
            onClick={() => setShowInstructions(true)}
            className="absolute bottom-6 left-6 z-20 bg-white/90 backdrop-blur-sm hover:bg-white text-[#01312D] font-semibold py-2 px-4 rounded-full shadow-lg transition-all duration-200 flex items-center gap-2 group"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">Show Controls</span>
          </button>
        )}
      </div>
    </div>
  );
}

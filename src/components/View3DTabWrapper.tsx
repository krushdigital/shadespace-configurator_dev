import React, { useState, lazy, Suspense } from 'react';
import { ConfiguratorState } from '../types';
import { ShapeCanvas } from './ShapeCanvas';

const ShadeSail3DViewer = lazy(() =>
  import('./view3d').then(module => ({ default: module.ShadeSail3DViewer }))
);

interface View3DTabWrapperProps {
  config: ConfiguratorState;
  updateConfig?: (updates: Partial<ConfiguratorState>) => void;
  highlightedMeasurement?: string | null;
  highlightedCorner?: number | null;
  isMobile?: boolean;
  readonly?: boolean;
  quoteId?: string;
  onScreenshotCapture?: (dataUrl: string) => void;
}

export function View3DTabWrapper({
  config,
  updateConfig,
  highlightedMeasurement,
  highlightedCorner,
  isMobile = false,
  readonly = false,
  quoteId,
  onScreenshotCapture
}: View3DTabWrapperProps) {
  const [activeView, setActiveView] = useState<'2d' | '3d'>('2d');

  const canShow3D = config.corners >= 3 && config.corners <= 6;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex gap-2 mb-4 border-b border-slate-200">
        <button
          onClick={() => setActiveView('2d')}
          className={`px-6 py-3 text-sm font-semibold transition-colors relative ${
            activeView === '2d'
              ? 'text-[#307C31] border-b-2 border-[#307C31]'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            2D View
          </span>
        </button>
        <button
          onClick={() => setActiveView('3d')}
          disabled={!canShow3D}
          className={`px-6 py-3 text-sm font-semibold transition-colors relative disabled:opacity-50 disabled:cursor-not-allowed ${
            activeView === '3d'
              ? 'text-[#307C31] border-b-2 border-[#307C31]'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            3D View
            {activeView === '3d' && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-[#BFF102] text-[#307C31]">
                NEW
              </span>
            )}
          </span>
        </button>
      </div>

      <div className="flex-1 min-h-[400px] lg:min-h-[600px]">
        {activeView === '2d' ? (
          <div className="h-full">
            <ShapeCanvas
              config={config}
              updateConfig={updateConfig}
              readonly={readonly}
              snapToGrid={true}
              highlightedMeasurement={highlightedMeasurement || undefined}
              highlightedCorner={highlightedCorner || undefined}
              isMobile={isMobile}
            />
          </div>
        ) : (
          <div className="h-full bg-slate-50 rounded-lg overflow-hidden">
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-[#BFF102] border-t-[#307C31] rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading 3D viewer...</p>
                  </div>
                </div>
              }
            >
              <ShadeSail3DViewer
                config={config}
                quoteId={quoteId}
                onScreenshotCapture={onScreenshotCapture}
              />
            </Suspense>
          </div>
        )}
      </div>

      {!canShow3D && activeView === '3d' && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/90 backdrop-blur-sm rounded-lg">
          <div className="text-center p-8">
            <svg className="w-16 h-16 mx-auto mb-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Complete Configuration</h3>
            <p className="text-sm text-slate-600">
              Please complete the basic configuration steps to view your shade sail in 3D.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { ConfiguratorState, FixedShapeType } from '../../types';
import { Button } from '../ui/Button';
import { SaveProgressButton } from '../SaveProgressButton';
import { Triangle, Square, Hexagon, Ruler } from 'lucide-react';

interface ShapeTypeContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  onNext?: () => void;
  onPrev?: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
  onSaveQuote?: () => void;
}

const FIXED_SHAPES: { id: FixedShapeType; label: string; description: string; corners: number }[] = [
  { id: 'triangle', label: 'Triangle', description: 'Equilateral (all sides equal)', corners: 3 },
  { id: 'right-angle-triangle', label: 'Right Angle Triangle', description: 'Two sides + calculated hypotenuse', corners: 3 },
  { id: 'square', label: 'Square', description: 'All sides equal length', corners: 4 },
  { id: 'rectangle', label: 'Rectangle', description: 'Two pairs of equal sides', corners: 4 },
];

function ShapeIcon({ shape, className }: { shape: FixedShapeType; className?: string }) {
  const cls = className || 'w-8 h-8';
  switch (shape) {
    case 'triangle':
      return <Triangle className={cls} />;
    case 'right-angle-triangle':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21 L3 3 L21 21 Z" />
          <rect x="3" y="17" width="4" height="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'square':
      return <Square className={cls} />;
    case 'rectangle':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="12" rx="1" />
        </svg>
      );
  }
}

export function ShapeTypeContent({
  config,
  updateConfig,
  onNext,
  onPrev,
  nextStepTitle,
  showBackButton,
  onSaveQuote,
}: ShapeTypeContentProps) {
  const selectedMode = config.shapeMode || null;
  const selectedFixedShape = config.fixedShapeType || null;

  const handleSelectCustom = () => {
    updateConfig({ shapeMode: 'custom', fixedShapeType: null });
  };

  const handleSelectFixedShape = (shape: FixedShapeType) => {
    const corners = FIXED_SHAPES.find(s => s.id === shape)!.corners;
    updateConfig({
      shapeMode: 'fixed',
      fixedShapeType: shape,
      corners,
    });
  };

  const isComplete = selectedMode === 'custom' || (selectedMode === 'fixed' && !!selectedFixedShape);

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Choose your shape type</h3>

        {/* Custom Shape Option */}
        <button
          onClick={handleSelectCustom}
          className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
            selectedMode === 'custom'
              ? 'border-emerald-500 bg-emerald-50 shadow-md'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-2.5 rounded-lg ${selectedMode === 'custom' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              <Hexagon className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-base">Custom Shape</span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 rounded-full">Fit Guarantee</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Any shape from 3 to 8 corners. Measured precisely to fit your space.</p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 flex items-center justify-center ${
              selectedMode === 'custom' ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300'
            }`}>
              {selectedMode === 'custom' && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        </button>

        {/* Fixed Shape Option */}
        <div
          className={`w-full text-left rounded-xl border-2 transition-all duration-200 ${
            selectedMode === 'fixed'
              ? 'border-blue-500 bg-blue-50/30 shadow-md'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          }`}
        >
          <button
            onClick={() => {
              if (selectedMode !== 'fixed') {
                handleSelectFixedShape(selectedFixedShape || 'rectangle');
              }
            }}
            className="w-full text-left p-4"
          >
            <div className="flex items-start gap-4">
              <div className={`p-2.5 rounded-lg ${selectedMode === 'fixed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                <Ruler className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-gray-900 text-base">Fixed Shape</span>
                <p className="text-sm text-gray-500 mt-0.5">Standard geometric shapes. Fewer measurements needed.</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-1 flex items-center justify-center ${
                selectedMode === 'fixed' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
              }`}>
                {selectedMode === 'fixed' && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </button>

          {/* Fixed shape sub-options */}
          {selectedMode === 'fixed' && (
            <div className="px-4 pb-4 pt-1">
              <div className="grid grid-cols-2 gap-2.5">
                {FIXED_SHAPES.map(shape => (
                  <button
                    key={shape.id}
                    onClick={() => handleSelectFixedShape(shape.id)}
                    className={`p-3 rounded-lg border-2 transition-all duration-150 text-left ${
                      selectedFixedShape === shape.id
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ShapeIcon
                        shape={shape.id}
                        className={`w-6 h-6 ${selectedFixedShape === shape.id ? 'text-blue-600' : 'text-gray-500'}`}
                      />
                      <div>
                        <span className={`text-sm font-medium ${selectedFixedShape === shape.id ? 'text-blue-900' : 'text-gray-800'}`}>
                          {shape.label}
                        </span>
                        <p className="text-xs text-gray-500 mt-0.5">{shape.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <Button variant="outline" onClick={onPrev} className="text-sm">
              Back
            </Button>
          )}
          <SaveProgressButton onSaveQuote={onSaveQuote} />
        </div>
        <Button
          onClick={onNext}
          disabled={!isComplete}
          className="text-sm"
        >
          Continue{nextStepTitle ? ` → ${nextStepTitle}` : ''}
        </Button>
      </div>
    </div>
  );
}

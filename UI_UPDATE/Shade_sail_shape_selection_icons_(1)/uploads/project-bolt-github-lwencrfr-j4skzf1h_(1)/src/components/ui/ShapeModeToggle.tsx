import React from 'react';
import { ToggleSwitch } from './ToggleSwitch';
import { Zap, PenTool, Sparkles } from 'lucide-react';

interface ShapeModeToggleProps {
  isAutoMode: boolean;
  onToggle: (isAuto: boolean) => void;
  corners: number;
  hasEnoughDiagonals: boolean;
  shapeAccuracy: 'exact' | 'approximate' | 'incomplete';
  className?: string;
}

export const ShapeModeToggle: React.FC<ShapeModeToggleProps> = ({
  isAutoMode,
  onToggle,
  corners,
  hasEnoughDiagonals,
  shapeAccuracy,
  className = '',
}) => {
  const showViewAccurateButton = !isAutoMode && hasEnoughDiagonals && corners >= 4;
  const minimumDiagonals = corners >= 4 ? corners - 3 : 0;

  const getStatusMessage = () => {
    if (isAutoMode) {
      if (shapeAccuracy === 'exact') {
        return 'Shape automatically generated from your measurements';
      }
      if (shapeAccuracy === 'approximate') {
        return `Preview is approximate - add ${minimumDiagonals === 1 ? 'a diagonal' : 'diagonals'} for exact shape`;
      }
      return 'Enter measurements to generate shape';
    }

    if (hasEnoughDiagonals) {
      return 'You have enough measurements for an accurate shape';
    }
    if (corners >= 4 && shapeAccuracy !== 'incomplete') {
      return `Add ${minimumDiagonals === 1 ? 'a diagonal' : `${minimumDiagonals} diagonals`} to enable accurate shape generation`;
    }
    return 'Drag corners to customize shape';
  };

  const handleViewAccurateShape = () => {
    onToggle(true);
  };

  return (
    <div className={`w-full bg-white border border-slate-200 rounded-lg shadow-sm ${className}`}>
      <div className="px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Shape Mode</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Zap className={`w-3.5 h-3.5 ${isAutoMode ? 'text-green-600' : 'text-slate-400'}`} />
              <span className={`text-xs font-medium ${isAutoMode ? 'text-green-700' : 'text-slate-500'}`}>
                Auto
              </span>
            </div>

            <ToggleSwitch
              enabled={isAutoMode}
              onChange={onToggle}
              onLabel="Automatic shape generation"
              offLabel="Manual shape adjustment"
              className="scale-90"
            />

            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-medium ${!isAutoMode ? 'text-blue-700' : 'text-slate-500'}`}>
                Manual
              </span>
              <PenTool className={`w-3.5 h-3.5 ${!isAutoMode ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className={`text-[11px] leading-tight ${
            isAutoMode
              ? shapeAccuracy === 'exact' ? 'text-green-700' : 'text-slate-600'
              : hasEnoughDiagonals ? 'text-blue-700' : 'text-slate-600'
          }`}>
            {getStatusMessage()}
          </p>

          {showViewAccurateButton && (
            <button
              type="button"
              onClick={handleViewAccurateShape}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3 h-3" />
              View Accurate Shape
            </button>
          )}
        </div>
      </div>

      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 rounded-b-lg">
        <p className="text-[10px] text-slate-500 leading-snug">
          {isAutoMode ? (
            <>
              <span className="font-medium text-green-700">Auto:</span> Shape is calculated from your measurements
            </>
          ) : (
            <>
              <span className="font-medium text-blue-700">Manual:</span> Drag corners to customize - switch to Auto to fit measurements
            </>
          )}
        </p>
      </div>
    </div>
  );
};

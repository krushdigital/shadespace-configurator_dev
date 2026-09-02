import React from 'react';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { FixedShapeType } from '../types';

const SHAPE_LABELS: Record<FixedShapeType, string> = {
  triangle: 'Triangle',
  'right-angle-triangle': 'Right Angle Triangle',
  square: 'Square',
  rectangle: 'Rectangle',
};

interface ShapeModeSwitchModalProps {
  direction: 'toFixed' | 'toCustom';
  targetShape?: FixedShapeType;
  onKeepMeasurements: () => void;
  onStartFresh: () => void;
  onCancel: () => void;
}

export function ShapeModeSwitchModal({
  direction,
  targetShape,
  onKeepMeasurements,
  onStartFresh,
  onCancel,
}: ShapeModeSwitchModalProps) {
  const shapeName = targetShape ? SHAPE_LABELS[targetShape] : 'Fixed Shape';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-[fadeIn_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h3 className="text-lg font-bold text-[#01312D]">
            {direction === 'toFixed'
              ? `Switch to ${shapeName}?`
              : 'Switch to Custom Shape?'}
          </h3>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Warning icon + context */}
          <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900 leading-relaxed">
              <strong>Important:</strong> Measurements mean different things in each mode. Carrying the same numbers across may result in a sail that doesn't fit.
            </p>
          </div>

          {direction === 'toFixed' ? (
            <>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                  <div>
                    <p className="text-sm font-semibold text-[#01312D]">Right now (Custom mode)</p>
                    <p className="text-sm text-gray-600">Your measurements are the distances between your fixing points (posts, walls, etc.). The sail is made slightly smaller to fit within those points, with room for tensioning hardware.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                  <div>
                    <p className="text-sm font-semibold text-[#01312D]">After switching ({shapeName})</p>
                    <p className="text-sm text-gray-600">Measurements will represent the <strong>actual size of the shade sail fabric</strong>. If you keep your current numbers, the sail will be the same size as the gap between your posts -- too large to tension properly.</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                  <div>
                    <p className="text-sm font-semibold text-[#01312D]">Right now (Fixed mode)</p>
                    <p className="text-sm text-gray-600">Your measurements are the <strong>actual size of the shade sail fabric</strong>.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                  <div>
                    <p className="text-sm font-semibold text-[#01312D]">After switching (Custom mode)</p>
                    <p className="text-sm text-gray-600">Measurements will represent the distance between your fixing points. The sail will be made <strong>smaller than those numbers</strong> to allow for hardware and tensioning. If you keep your current numbers, the resulting sail will be smaller than you expect.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 pt-2 space-y-2">
          <button
            onClick={onKeepMeasurements}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-[#2e7d4f] text-[#01312D] font-medium text-sm hover:bg-[#eef5ef] transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            I understand -- keep my measurements
          </button>
          <button
            onClick={onStartFresh}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#01312D] text-white font-medium text-sm hover:bg-[#01312D]/90 transition-colors"
          >
            Start with fresh measurements
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

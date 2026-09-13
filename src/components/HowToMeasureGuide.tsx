import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import MeasuringGuide from './MeasuringGuide';
import type { Shape } from './MeasuringGuide';

type ShapeKey = 'triangle' | 'right-angle-triangle' | 'square' | 'rectangle';

interface HowToMeasureGuideProps {
  measurementOption: 'adjust' | 'exact';
  shapeMode?: 'custom' | 'fixed';
  fixedShapeType?: ShapeKey | null;
  corners: number;
}

function resolveGuideProps(
  shapeMode?: 'custom' | 'fixed',
  fixedShapeType?: ShapeKey | null,
  corners?: number
): { shape: Shape | 'custom'; corners: number } {
  if (shapeMode === 'fixed' && fixedShapeType) {
    const mapped = fixedShapeType === 'right-angle-triangle' ? 'right' : fixedShapeType;
    return { shape: mapped as Shape, corners: 0 };
  }
  return { shape: 'custom', corners: corners ?? 4 };
}

export function HowToMeasureGuide({
  measurementOption,
  shapeMode,
  fixedShapeType,
  corners,
}: HowToMeasureGuideProps) {
  const guideProps = resolveGuideProps(shapeMode, fixedShapeType, corners);

  return (
    <div className="animate-[fadeUp_0.35s_ease-out]">
      <MeasuringGuide shape={guideProps.shape} corners={guideProps.corners} />
    </div>
  );
}

interface HowToMeasureModalProps {
  isOpen: boolean;
  onClose: () => void;
  measurementOption: 'adjust' | 'exact';
  shapeMode?: 'custom' | 'fixed';
  fixedShapeType?: ShapeKey | null;
  corners: number;
}

export function HowToMeasureModal({
  isOpen,
  onClose,
  measurementOption,
  shapeMode,
  fixedShapeType,
  corners,
}: HowToMeasureModalProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const guideProps = resolveGuideProps(shapeMode, fixedShapeType, corners);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto transition-all duration-200 ${visible ? 'scale-100' : 'scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
        >
          <X className="w-4 h-4 text-brand-green" />
        </button>
        <MeasuringGuide shape={guideProps.shape} corners={guideProps.corners} />
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { X, Ruler } from 'lucide-react';
import { MiniSailDiagram, MiniSpaceDiagram } from './steps/SailMeasurementVisuals';
import HowToMeasureAnimation from './HowToMeasureAnimation';
import type { FixedVariant } from './HowToMeasureAnimation';

type ShapeKey = 'triangle' | 'right-angle-triangle' | 'square' | 'rectangle';

interface HowToMeasureGuideProps {
  measurementOption: 'adjust' | 'exact';
  shapeMode?: 'custom' | 'fixed';
  fixedShapeType?: ShapeKey | null;
  corners: number;
}

function shapeKeyFromCorners(corners: number): ShapeKey | undefined {
  if (corners === 3) return 'triangle';
  if (corners === 4) return 'rectangle';
  return undefined;
}

export function HowToMeasureGuide({
  measurementOption,
  shapeMode,
  fixedShapeType,
  corners,
}: HowToMeasureGuideProps) {
  const isSpaceMode = measurementOption === 'adjust';
  const shape: ShapeKey | undefined =
    shapeMode === 'fixed' && fixedShapeType ? fixedShapeType : shapeKeyFromCorners(corners);

  return (
    <div>
      <div className="bg-white border-2 border-border-card rounded-card overflow-hidden animate-[fadeUp_0.35s_ease-out]">
        {/* Header */}
        <div className="bg-brand-green px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-lime/20 flex items-center justify-center flex-shrink-0">
            <Ruler className="w-5 h-5 text-brand-lime" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[17px] font-extrabold text-white leading-tight">
              Before You Start Measuring
            </h3>
            <p className="text-[13px] text-white/70 mt-0.5">
              Quick guide to getting accurate dimensions
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5">
          <MeasureGuideBody isSpaceMode={isSpaceMode} shape={shape} shapeMode={shapeMode} corners={corners} />
        </div>
      </div>
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

  const isSpaceMode = measurementOption === 'adjust';
  const shape: ShapeKey | undefined =
    shapeMode === 'fixed' && fixedShapeType ? fixedShapeType : shapeKeyFromCorners(corners);

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
        {/* Header */}
        <div className="bg-brand-green px-5 py-4 flex items-center gap-3 rounded-t-2xl sticky top-0 z-10">
          <div className="w-10 h-10 rounded-full bg-brand-lime/20 flex items-center justify-center flex-shrink-0">
            <Ruler className="w-5 h-5 text-brand-lime" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[17px] font-extrabold text-white leading-tight">
              How to Measure
            </h3>
            <p className="text-[13px] text-white/70 mt-0.5">
              {isSpaceMode ? 'Measuring between your fixing points' : 'Measuring the finished sail size'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <MeasureGuideBody isSpaceMode={isSpaceMode} shape={shape} shapeMode={shapeMode} corners={corners} />
        </div>
      </div>
    </div>
  );
}

function resolveAnimationVariant(
  shapeMode?: 'custom' | 'fixed',
  fixedShape?: ShapeKey,
  corners?: number
): { variant: FixedVariant | 'custom'; corners: number } {
  if (shapeMode === 'fixed' && fixedShape) {
    const mapped = fixedShape === 'right-angle-triangle' ? 'right' : fixedShape;
    return { variant: mapped as FixedVariant, corners: 0 };
  }
  return { variant: 'custom', corners: corners ?? 4 };
}

function MeasureGuideBody({
  isSpaceMode,
  shape,
  shapeMode,
  corners,
}: {
  isSpaceMode: boolean;
  shape?: ShapeKey;
  shapeMode?: 'custom' | 'fixed';
  corners?: number;
}) {
  const anim = resolveAnimationVariant(shapeMode, shape, corners);

  return (
    <>
      {/* Diagram -- animated on desktop, static on mobile */}
      <div className="flex justify-center mb-5">
        {/* Desktop: animated tape-measure */}
        <div className="hidden md:block bg-[#F4F3EF] rounded-xl p-6 border border-slate-200 w-full max-w-sm">
          <HowToMeasureAnimation variant={anim.variant} corners={anim.corners} />
        </div>
        {/* Mobile: small static diagram */}
        <div className="md:hidden bg-[#F4F3EF] rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-center" style={{ transform: 'scale(1.6)', transformOrigin: 'center' }}>
            {isSpaceMode ? (
              <MiniSpaceDiagram shape={shape} />
            ) : (
              <MiniSailDiagram shape={shape} />
            )}
          </div>
        </div>
      </div>

      {/* Mode indicator */}
      <div className={`rounded-xl p-4 mb-4 ${isSpaceMode ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isSpaceMode ? 'bg-blue-100' : 'bg-amber-100'}`}>
            <Ruler className={`w-4 h-4 ${isSpaceMode ? 'text-blue-600' : 'text-amber-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={`text-[14px] font-bold mb-1 ${isSpaceMode ? 'text-blue-900' : 'text-amber-900'}`}>
              {isSpaceMode ? 'You\'re measuring your space' : 'You\'re specifying sail dimensions'}
            </h4>
            <p className={`text-[13px] leading-relaxed ${isSpaceMode ? 'text-blue-800' : 'text-amber-800'}`}>
              {isSpaceMode
                ? 'Measure the distance between each fixing point (posts, walls, brackets). We\'ll calculate the adjustments needed for hardware and fabric stretch so your sail fits perfectly.'
                : 'Enter the exact finished size you want for the sail itself. We\'ll manufacture it to those precise dimensions -- you\'ll arrange your fixing points to suit.'}
            </p>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="space-y-3">
        <h4 className="text-[14px] font-bold text-brand-green">Measurement Tips</h4>
        <div className="space-y-2.5">
          <TipRow
            number={1}
            text={isSpaceMode
              ? 'Measure from the centre of each fixing point to the centre of the next.'
              : 'Measure along each edge of the sail shape you want, from corner to corner.'}
          />
          <TipRow
            number={2}
            text="Use a tape measure for accuracy. Avoid estimating from plans or drawings where possible."
          />
          <TipRow
            number={3}
            text={isSpaceMode
              ? 'Include all edges and diagonals if prompted -- these help us verify the shape geometry.'
              : 'Double-check each measurement. The sail will be made exactly to the sizes you provide.'}
          />
        </div>
      </div>
    </>
  );
}

function TipRow({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-brand-green/10 text-brand-green text-[12px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {number}
      </span>
      <p className="text-[13px] text-text-secondary leading-relaxed">{text}</p>
    </div>
  );
}

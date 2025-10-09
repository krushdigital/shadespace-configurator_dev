import React, { forwardRef } from 'react';
import { ConfiguratorState, ShadeCalculations, Point } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ShapeCanvas } from '../ShapeCanvas';
import { formatCurrency } from '../../utils/currencyFormatter';
import { formatMeasurement, formatArea } from '../../utils/geometry';
import { FABRICS } from '../../data/fabrics';

interface ReviewContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  calculations: ShadeCalculations;
  onNext: () => void;
  onPrev: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
  isGeneratingPDF?: boolean;
  handleGeneratePDF?: (svgElement?: SVGElement, isEmailSummary?: boolean) => Promise<any>;
  showEmailInput?: boolean;
  email?: string;
  setEmail?: (email: string) => void;
  handleEmailSummary?: () => void;
  handleCancelEmailInput?: () => void;
  acknowledgments?: {
    customManufactured: boolean;
    measurementsAccurate: boolean;
    installationNotIncluded: boolean;
    structuralResponsibility: boolean;
  };
  handleAcknowledgmentChange?: (key: string) => void;
  handleAddToCart?: (orderData: any) => void;
  allDiagonalsEntered?: boolean;
  allAcknowledgmentsChecked?: boolean;
  canAddToCart?: boolean;
  hasAllEdgeMeasurements?: boolean;
  canvasRef?: any;
  isMobile?: boolean;
  loading?: boolean;
  setLoading?: (loading: boolean) => void;
}

export const ReviewContent = forwardRef<HTMLDivElement, ReviewContentProps>(({
  config,
  calculations,
  onPrev,
  showBackButton,
  isGeneratingPDF,
  handleGeneratePDF,
  showEmailInput,
  email,
  setEmail,
  handleEmailSummary,
  handleCancelEmailInput,
  acknowledgments,
  handleAcknowledgmentChange,
  handleAddToCart,
  allAcknowledgmentsChecked,
  canAddToCart,
  canvasRef,
  isMobile,
  loading
}, ref) => {
  const selectedFabric = FABRICS.find(f => f.id === config.fabricType);
  const selectedColor = selectedFabric?.colors.find(c => c.name === config.fabricColor);

  const handleSubmitOrder = async () => {
    if (!handleAddToCart || !canAddToCart) return;

    const svgElement = canvasRef?.current?.getSVGElement?.();
    let canvasImageUrl = '';

    const edgeMeasurements: Record<string, { unit: string; formatted: string }> = {};
    for (let i = 0; i < config.corners; i++) {
      const nextIndex = (i + 1) % config.corners;
      const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
      const measurement = config.measurements[edgeKey];
      if (measurement && measurement > 0) {
        edgeMeasurements[edgeKey] = {
          unit: config.unit === 'imperial' ? 'inches' : 'millimeters',
          formatted: formatMeasurement(measurement, config.unit)
        };
      }
    }

    const orderData = {
      fabricType: config.fabricType,
      fabricColor: config.fabricColor,
      edgeType: config.edgeType,
      corners: config.corners,
      unit: config.unit,
      measurementOption: config.measurementOption,
      currency: config.currency,
      measurements: config.measurements,
      points: config.points,
      fixingHeights: config.fixingHeights,
      fixingTypes: config.fixingTypes,
      eyeOrientations: config.eyeOrientations,
      area: calculations.area,
      perimeter: calculations.perimeter,
      totalPrice: calculations.totalPrice,
      selectedFabric,
      selectedColor,
      canvasImageUrl,
      warranty: selectedFabric?.warrantyYears?.toString() || '',
      Fabric_Type: selectedFabric?.label || '',
      Shade_Factor: selectedColor?.shadeFactor?.toString() || '',
      Edge_Type: config.edgeType === 'webbing' ? 'Webbing Reinforced' : 'Cabled Edge',
      Wire_Thickness: calculations.wireThickness ? `${calculations.wireThickness}mm` : 'N/A',
      Area: formatArea(calculations.area * 1000000, config.unit),
      Perimeter: formatMeasurement(calculations.perimeter * 1000, config.unit),
      createdAt: new Date().toISOString(),
      edgeMeasurements,
      diagonalMeasurementsObj: {},
      anchorPointMeasurements: {}
    };

    await handleAddToCart(orderData);
  };

  return (
    <div ref={ref} className="p-6 space-y-6">
      <div className="bg-[#BFF102]/10 border border-[#307C31]/30 rounded-lg p-4">
        <h3 className="font-bold text-[#01312D] mb-2">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#01312D]/60">Fabric:</span>
            <span className="font-semibold">{selectedFabric?.label} - {config.fabricColor}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#01312D]/60">Edge Type:</span>
            <span className="font-semibold">
              {config.edgeType === 'webbing' ? 'Webbing Reinforced' : 'Cabled Edge'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#01312D]/60">Corners:</span>
            <span className="font-semibold">{config.corners}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#01312D]/60">Area:</span>
            <span className="font-semibold">{formatArea(calculations.area * 1000000, config.unit)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#01312D]/60">Total Price:</span>
            <span className="font-bold text-lg">{formatCurrency(calculations.totalPrice, config.currency)}</span>
          </div>
        </div>
      </div>

      {isMobile && (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h4 className="font-bold text-[#01312D] mb-3">Your Design</h4>
          <ShapeCanvas
            config={config}
            updateConfig={() => {}}
            readonly={true}
            snapToGrid={false}
            highlightedMeasurement={null}
            isMobile={true}
            ref={canvasRef}
          />
        </div>
      )}

      {acknowledgments && handleAcknowledgmentChange && (
        <div className="space-y-3">
          <h4 className="font-bold text-[#01312D]">Please Acknowledge</h4>
          {Object.entries(acknowledgments).map(([key, checked]) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => handleAcknowledgmentChange(key)}
                className="mt-1 w-5 h-5 text-[#BFF102] border-slate-300 rounded focus:ring-[#BFF102]"
              />
              <span className="text-sm text-[#01312D]">
                {key === 'customManufactured' && 'I understand this is a custom-manufactured product'}
                {key === 'measurementsAccurate' && 'I confirm my measurements are accurate'}
                {key === 'installationNotIncluded' && 'I understand installation is not included'}
                {key === 'structuralResponsibility' && 'I understand I am responsible for structural integrity'}
              </span>
            </label>
          ))}
        </div>
      )}

      {isMobile && (
        <div className="space-y-3">
          {handleGeneratePDF && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => handleGeneratePDF()}
              disabled={isGeneratingPDF}
              className="w-full"
            >
              {isGeneratingPDF ? 'Generating...' : 'Download PDF Quote'}
            </Button>
          )}

          {handleEmailSummary && (
            <>
              {!showEmailInput ? (
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleEmailSummary}
                  className="w-full"
                >
                  Email Summary
                </Button>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="email"
                    value={email || ''}
                    onChange={(e) => setEmail?.(e.target.value)}
                    placeholder="Enter your email"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="primary" size="sm" onClick={handleEmailSummary}>
                      Send
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancelEmailInput}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-slate-200">
        {showBackButton && (
          <Button variant="outline" onClick={onPrev}>
            Back
          </Button>
        )}
        <Button
          variant="primary"
          onClick={handleSubmitOrder}
          disabled={!allAcknowledgmentsChecked || loading}
          className="ml-auto"
        >
          {loading ? 'Processing...' : 'Add to Cart'}
        </Button>
      </div>
    </div>
  );
});

ReviewContent.displayName = 'ReviewContent';

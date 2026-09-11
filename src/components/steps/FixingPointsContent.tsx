import React from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { DualImperialInput } from '../ui/DualImperialInput';
import { Tooltip } from '../ui/Tooltip';
import { PricingSummaryBox } from '../PricingSummaryBox';
import { convertMmToUnit, convertUnitToMm, formatMeasurement, formatSecondaryUnit } from '../../utils/geometry';
import { HeightVisualizationCanvas } from '../HeightVisualizationCanvas';
import { AlertCircle } from 'lucide-react';
import { SaveProgressButton } from '../SaveProgressButton';

interface FixingPointsContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  calculations: ShadeCalculations;
  validationErrors?: {[key: string]: string};
  typoSuggestions?: {[key: string]: number};
  onNext: () => void;
  onPrev: () => void;
  setValidationErrors?: (errors: {[key: string]: string}) => void;
  setTypoSuggestions?: (suggestions: {[key: string]: number}) => void;
  dismissTypoSuggestion?: (fieldKey: string) => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
  // Pricing props for mobile summary
  isGeneratingPDF?: boolean;
  handleGeneratePDF?: () => void;
  showEmailInput?: boolean;
  email?: string;
  setEmail?: (email: string) => void;
  handleEmailSummary?: () => void;
  hasAllEdgeMeasurements?: boolean;
  allDiagonalsEntered?: boolean;
  quoteReference?: string | null;
  onSaveQuote?: () => void;
}

export function FixingPointsContent({
  config,
  updateConfig,
  calculations,
  onNext,
  onPrev,
  validationErrors = {},
  typoSuggestions = {},
  nextStepTitle = '',
  showBackButton = false,
  setValidationErrors,
  setTypoSuggestions,
  dismissTypoSuggestion,
  // Pricing props
  isGeneratingPDF = false,
  handleGeneratePDF = () => {},
  showEmailInput = false,
  email = '',
  setEmail = () => {},
  handleEmailSummary = () => {},
  hasAllEdgeMeasurements = false,
  allDiagonalsEntered = false,
  onSaveQuote
}: FixingPointsContentProps) {

  const updateFixingHeight = (index: number, height: number) => {
    // Convert input value to mm for storage
    const mmHeight = convertUnitToMm(height, config.unit);
    const newHeights = [...config.fixingHeights];
    newHeights[index] = mmHeight;
    updateConfig({ fixingHeights: newHeights });
    
    // Clear any existing errors/suggestions for this field while typing
    if (setValidationErrors && setTypoSuggestions) {
      const newErrors = { ...validationErrors };
      const newSuggestions = { ...typoSuggestions };
      
      const heightKey = `height_${index}`;
      
      // Clear errors and suggestions for this field while user is typing
      delete newErrors[heightKey];
      delete newSuggestions[heightKey];
      
      setValidationErrors(newErrors);
      setTypoSuggestions(newSuggestions);
    }
  };

  const applyTypoCorrection = (index: number) => {
    const correctedValue = typoSuggestions[`height_${index}`];
    if (correctedValue) {
      const newHeights = [...config.fixingHeights];
      newHeights[index] = correctedValue;
      updateConfig({ fixingHeights: newHeights });
      
      // Clear validation errors and suggestions for this field
      if (setValidationErrors && setTypoSuggestions) {
        const newErrors = { ...validationErrors };
        const newSuggestions = { ...typoSuggestions };
        const heightKey = `height_${index}`;
        delete newErrors[heightKey];
        delete newSuggestions[heightKey];
        setValidationErrors(newErrors);
        setTypoSuggestions(newSuggestions);
      }
    }
  };

  const updateFixingType = (index: number, type: 'post' | 'building') => {
    const newTypes = [...(config.fixingTypes || [])];
    while (newTypes.length < config.corners) {
      newTypes.push('post');
    }
    newTypes[index] = type;
    updateConfig({ fixingTypes: newTypes });
    
    // Clear validation error for this field
    if (setValidationErrors) {
      const newErrors = { ...validationErrors };
      delete newErrors[`type_${index}`];
      setValidationErrors(newErrors);
    }
  };


  const getCornerLabel = (index: number) => String.fromCharCode(65 + index);


  return (
    <div className="p-6">
      {/* General Typo Warning */}
      {validationErrors.typoSuggestions && (
        <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-500 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-amber-800 mb-1">
                Possible Typos Detected
              </h4>
              <p className="text-amber-700">
                {validationErrors.typoSuggestions}
              </p>
            </div>
          </div>
        </div>
      )}


      <div className="space-y-2">
        {Array.from({ length: config.corners }, (_, index) => (
          <Card key={index} className="p-2 md:p-3 border-l-4 border-l-[#01312D] relative">
            <div className="space-y-0.5">
              {/* Header with Corner Label */}
              <div className="flex items-center justify-between">
                <h5 className="font-semibold text-brand-green text-sm">
                  Anchor Point {getCornerLabel(index)}
                </h5>
              </div>

              {/* Height Input */}
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-xs font-medium text-brand-green">
                    <span className="hidden md:inline">Height from Ground or Datum Level</span>
                    <span className="md:hidden">Height from Ground</span>
                  </span>
                  <Tooltip
                    content={
                      <div>
                        <p className="text-sm text-brand-green font-medium mb-2">
                          What is Datum Level?
                        </p>
                        <p className="text-sm text-brand-green/80 mb-3 leading-relaxed">
                          Datum level is a reference point for measuring heights consistently across your installation. It's typically ground level, but can be any horizontal reference point (like a deck or patio level) that you use for all measurements.
                        </p>
                        <div className="bg-brand-lime/10 border border-[#BFF102] rounded-lg p-3">
                          <p className="text-sm text-brand-green font-medium mb-2">
                            Need help measuring correctly?
                          </p>
                          <p className="text-sm text-brand-green/80 mb-2">
                            Watch our video and follow step-by-step instructions for accurate shade sail measurements.
                          </p>
                          <a
                            href="https://shadespace.com/blogs/how-to/how-to-measure-a-shade-sail"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-brand-mid hover:text-brand-green underline"
                          >
                            View Measuring Guide →
                          </a>
                        </div>
                      </div>
                    }
                  >
                    <span className="w-[18px] h-[18px] inline-flex items-center justify-center text-[10px] font-bold bg-brand-green/15 text-brand-green rounded-full cursor-help hover:bg-brand-green hover:text-white transition-colors">
                      ?
                    </span>
                  </Tooltip>
                </div>
                <div className="relative">
                  {(() => {
                    const currentHeight = config.fixingHeights[index];
                    const hasValidValue = currentHeight !== undefined && currentHeight !== null && currentHeight > 0;
                    const hasError = validationErrors[`height_${index}`];
                    const isSuccess = hasValidValue && !hasError;

                    return (
                  <DualImperialInput
                   value={hasValidValue ? convertMmToUnit(currentHeight, config.unit) : 0}
                    onChange={(value) => {
                      if (value === 0) {
                        const newHeights = [...config.fixingHeights];
                        newHeights[index] = undefined;
                        updateConfig({ fixingHeights: newHeights });

                        if (setValidationErrors && setTypoSuggestions) {
                          const newErrors = { ...validationErrors };
                          const newSuggestions = { ...typoSuggestions };
                          delete newErrors[`height_${index}`];
                          delete newSuggestions[`height_${index}`];
                          setValidationErrors(newErrors);
                          setTypoSuggestions(newSuggestions);
                        }
                      } else {
                        updateFixingHeight(index, value);
                      }
                    }}
                    unit={config.unit}
                    className="flex-1 py-2"
                    isSuccess={isSuccess}
                   error={validationErrors[`height_${index}`]}
                   errorKey={`height_${index}`}
                   secondaryValue={hasValidValue ? formatSecondaryUnit(currentHeight, config.unit) : ''}
                   showConversion={true}
                   allowFormatSwitch={true}
                  />
                    );
                  })()}
                </div>

                {/* Typo Warning */}
                {typoSuggestions[`height_${index}`] && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex flex-col gap-2">
                      <p className="text-sm text-amber-800 w-full">
                        <strong>Possible typo:</strong> Did you mean {formatMeasurement(typoSuggestions[`height_${index}`], config.unit)}?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => applyTypoCorrection(index)}
                          className="px-3 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 transition-colors"
                        >
                          Correct
                        </button>
                        <button
                          onClick={() => dismissTypoSuggestion?.(`height_${index}`)}
                          className="px-3 py-1 bg-white border border-amber-600 text-amber-800 text-sm rounded hover:bg-amber-50 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Attachment Type - Post and Building side by side */}
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-brand-green">
                    Attachment Type
                  </span>
                  <Tooltip
                    content={
                      <div>
                       <img
                         src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/ATTACHMENT_TYPE.jpg?v=1755923793"
                         alt="Post vs Building attachment example"
                         className="w-full h-auto object-cover rounded-lg mb-3"
                       />
                        <p className="text-sm text-brand-green font-medium mb-1">
                          Attachment Type
                        </p>
                        <p className="text-sm text-brand-green/70">
                          Post: Freestanding pole installation. Building: Attached to wall, roof, or existing structure.
                        </p>
                      </div>
                    }
                  >
                    <span className="w-[18px] h-[18px] inline-flex items-center justify-center text-[10px] font-bold bg-brand-green/15 text-brand-green rounded-full cursor-help hover:bg-brand-green hover:text-white transition-colors">
                      ?
                    </span>
                  </Tooltip>
                </div>
                <div
                  className="grid grid-cols-2 gap-2"
                  {...(validationErrors[`type_${index}`] ? { 'data-error': `type_${index}` } : {})}
                >
                  <button
                    onClick={() => updateFixingType(index, 'post')}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 border-2 ${
                      config.fixingTypes?.[index] === 'post'
                        ? 'bg-brand-green text-[#F3FFE3] shadow-md !border-brand-green'
                        : validationErrors[`type_${index}`] && !config.fixingTypes?.[index]
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 !border-red-500'
                        : 'bg-white text-brand-green hover:bg-brand-lime/10 border-[#307C31]/30'
                    }`}
                  >
                    Post
                  </button>
                  <button
                    onClick={() => updateFixingType(index, 'building')}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 border-2 ${
                      config.fixingTypes?.[index] === 'building'
                        ? 'bg-brand-green text-[#F3FFE3] shadow-md !border-brand-green'
                        : validationErrors[`type_${index}`] && !config.fixingTypes?.[index]
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 !border-red-500'
                        : 'bg-white text-brand-green hover:bg-brand-lime/10 border-[#307C31]/30'
                    }`}
                  >
                    Building
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Spacing between anchor points and installation guidelines */}
      <div className="mt-4"></div>

      <Card className="p-3 bg-surface-soft border-border-card">
        <h4 className="text-xs md:text-sm font-semibold text-brand-green mb-2">
          Installation Guidelines
        </h4>
        
        {/* Installation Tips Accordion */}
        {/* Basic Guidelines List */}
        <div className="w-full">
          <ul className="space-y-1 text-xs text-text-muted">
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-brand-mid rounded-full mt-1.5 mr-2 flex-shrink-0" />
              Heights are measured from ground level to the anchor point
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-brand-mid rounded-full mt-1.5 mr-2 flex-shrink-0" />
              Different heights create natural water runoff and proper sail tension
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-brand-mid rounded-full mt-1.5 mr-2 flex-shrink-0" />
              Minimum recommended height is {config.unit === 'imperial' ? '7.2ft' : '2.2m'} for pedestrian clearance
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-brand-green rounded-full mt-1.5 mr-2 flex-shrink-0" />
              Consider wind loads and local building codes - consult professionals for large installations
            </li>
          </ul>
        </div>
      </Card>



    </div>
  );
}
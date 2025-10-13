import React from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Tooltip } from '../ui/Tooltip';
import { PricingSummaryBox } from '../PricingSummaryBox';
import { convertMmToUnit, convertUnitToMm } from '../../utils/geometry';
import { formatMeasurement } from '../../utils/geometry';
import { HeightVisualizationCanvas } from '../HeightVisualizationCanvas';
import { AlertCircle } from 'lucide-react';

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
  allDiagonalsEntered = false
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

  const updateEyeOrientation = (index: number, orientation: 'horizontal' | 'vertical') => {
    const newOrientations = [...(config.eyeOrientations || [])];
    while (newOrientations.length < config.corners) {
      newOrientations.push('horizontal');
    }
    newOrientations[index] = orientation;
    updateConfig({ eyeOrientations: newOrientations });

    // Clear validation error for this field
    if (setValidationErrors) {
      const newErrors = { ...validationErrors };
      delete newErrors[`orientation_${index}`];
      setValidationErrors(newErrors);
    }
  };

  const updateFixingPointsInstalled = (installed: boolean) => {
    if (installed) {
      // Initialize eye orientations array if not present
      const newOrientations = [...(config.eyeOrientations || [])];
      while (newOrientations.length < config.corners) {
        newOrientations.push('horizontal');
      }
      updateConfig({ fixingPointsInstalled: installed, eyeOrientations: newOrientations });
    } else {
      // Clear eye orientations when not installed
      updateConfig({ fixingPointsInstalled: installed, eyeOrientations: undefined });
    }

    // Clear ALL validation errors for this step when user makes a selection
    if (setValidationErrors) {
      setValidationErrors({});
    }
  };

  const getCornerLabel = (index: number) => String.fromCharCode(65 + index);

  const isStepComplete = () => {
    // First check if fixing points installation status is selected
    if (config.fixingPointsInstalled === undefined) return false;

    // Check if all heights are valid (not undefined, not null, and greater than 0)
    const allHeightsValid = config.fixingHeights.length === config.corners &&
      config.fixingHeights.every(height =>
        height !== undefined && height !== null && height > 0
      );

    // Check if all types are selected (not empty string)
    const allTypesValid = config.fixingTypes?.length === config.corners &&
      config.fixingTypes?.every(type => type === 'post' || type === 'building');

    if (!allHeightsValid || !allTypesValid) return false;

    // If fixing points are installed, also check eye orientations
    if (config.fixingPointsInstalled === true) {
      const allOrientationsValid = config.eyeOrientations?.length === config.corners &&
        config.eyeOrientations?.every(orientation => orientation === 'horizontal' || orientation === 'vertical');
      return allOrientationsValid || false;
    }

    // If fixing points are not installed, eye orientations are not required
    return true;
  };

  const isInstallationStatusSelected = config.fixingPointsInstalled !== undefined;
  const hasInstallationError = validationErrors['fixingPointsInstalled'];

  return (
    <div className="p-6">
      {/* Fixing Points Installation Question */}
      <Card className={`p-4 mb-6 border-2 transition-all duration-300 ${
        hasInstallationError
          ? 'border-red-500 bg-red-50 animate-pulse-error'
          : config.fixingPointsInstalled === undefined
          ? 'border-[#307C31] bg-[#BFF102]/10'
          : 'border-slate-200 bg-white'
      }`}
      data-error="fixingPointsInstalled">
        <h4 className="text-base font-semibold text-[#01312D] mb-3">
          Are your Fixing Points Installed?
        </h4>
        <p className="text-sm text-[#01312D]/70 mb-4">
          This helps us understand if your anchor points are already in place or if you're planning the installation.
        </p>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <button
              onClick={() => updateFixingPointsInstalled(true)}
              className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 border-2 ${
                config.fixingPointsInstalled === true
                  ? 'bg-[#307C31] text-[#F3FFE3] shadow-md !border-[#307C31]'
                  : 'bg-white text-[#01312D] hover:bg-[#BFF102]/10 border-[#307C31]/30'
              }`}
            >
              Yes - Already Installed
            </button>
            <div className="absolute top-2 right-2">
              <Tooltip
                content={
                  <div>
                    <img
                      src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/eyes-installed.webp?v=1760396404"
                      alt="Eye plates already installed"
                      className="w-full h-auto object-cover rounded-lg mb-3"
                    />
                    <p className="text-sm text-[#01312D] font-medium mb-2">
                      Why do we need to know this?
                    </p>
                    <p className="text-sm text-[#01312D]/80 leading-relaxed">
                      We need to know if your fixing points are already installed so we can deduct the necessary amounts to cater for the eye plates/bolts when manufacturing the shade sail. This ensures your shade sail fits perfectly.
                    </p>
                  </div>
                }
              >
                <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                  ?
                </span>
              </Tooltip>
            </div>
          </div>
          <div className="flex-1 relative">
            <button
              onClick={() => updateFixingPointsInstalled(false)}
              className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-300 border-2 ${
                config.fixingPointsInstalled === false
                  ? 'bg-[#307C31] text-[#F3FFE3] shadow-md !border-[#307C31]'
                  : 'bg-white text-[#01312D] hover:bg-[#BFF102]/10 border-[#307C31]/30'
              }`}
            >
              No - Planning Installation
            </button>
            <div className="absolute top-2 right-2">
              <Tooltip
                content={
                  <div>
                    <img
                      src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/eyes-notinstalled.webp?v=1760396404"
                      alt="Eye plates not yet installed"
                      className="w-full h-auto object-cover rounded-lg mb-3"
                    />
                    <p className="text-sm text-[#01312D] font-medium mb-2">
                      Why do we need to know this?
                    </p>
                    <p className="text-sm text-[#01312D]/80 leading-relaxed">
                      We need to know if your fixing points are already installed so we can deduct the necessary amounts to cater for the eye plates/bolts when manufacturing the shade sail. This ensures your shade sail fits perfectly.
                    </p>
                  </div>
                }
              >
                <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                  ?
                </span>
              </Tooltip>
            </div>
          </div>
        </div>
        {hasInstallationError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-500 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700 font-medium">
                {validationErrors['fixingPointsInstalled']}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Info Banner - Only shown when user tries to proceed without selecting */}
      {!isInstallationStatusSelected && hasInstallationError && (
        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-800 mb-1">
                Answer Required
              </h4>
              <p className="text-sm text-blue-700">
                Please select whether your fixing points are already installed or if you're planning the installation. This will enable the configuration fields below.
              </p>
            </div>
          </div>
        </div>
      )}

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


      <div className={`space-y-2 transition-opacity duration-300 ${
        !isInstallationStatusSelected ? 'opacity-50 pointer-events-none' : ''
      }`}>
        {Array.from({ length: config.corners }, (_, index) => (
          <Card key={index} className={`p-3 border-l-4 border-l-[#01312D] relative ${
            !isInstallationStatusSelected ? 'bg-slate-50' : ''
          }`}>
            <div className="space-y-1">
              {/* Header with Corner Label */}
              <div className="flex items-center justify-between">
                <h5 className="font-semibold text-[#01312D] text-sm">
                  Anchor Point {getCornerLabel(index)} Configuration
                </h5>
              </div>
              
              {/* Responsive Grid Layout - Conditional columns based on fixing points installation */}
              <div className={`grid grid-cols-1 gap-3 md:gap-4 ${
                config.fixingPointsInstalled === true ? 'md:grid-cols-3' : 'md:grid-cols-2'
              }`}>
                {/* Height Input */}
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-[#01312D]">
                      Height from Ground or Datum Level
                    </span>
                    <Tooltip
                      content={
                        <div>
                          <p className="text-sm text-[#01312D] font-medium mb-2">
                            What is Datum Level?
                          </p>
                          <p className="text-sm text-[#01312D]/80 mb-3 leading-relaxed">
                            Datum level is a reference point for measuring heights consistently across your installation. It's typically ground level, but can be any horizontal reference point (like a deck or patio level) that you use for all measurements.
                          </p>
                          <div className="bg-[#BFF102]/10 border border-[#BFF102] rounded-lg p-3">
                            <p className="text-sm text-[#01312D] font-medium mb-2">
                              Need help measuring correctly?
                            </p>
                            <p className="text-sm text-[#01312D]/80 mb-2">
                              Watch our video and follow step-by-step instructions for accurate shade sail measurements.
                            </p>
                            <a 
                              href="https://shadespace.com/blogs/how-to/how-to-measure-a-shade-sail" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm font-semibold text-[#307C31] hover:text-[#01312D] underline"
                            >
                              View Measuring Guide →
                            </a>
                          </div>
                        </div>
                      }
                    >
                      <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                        ?
                      </span>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const currentHeight = config.fixingHeights[index];
                      const hasValidValue = currentHeight !== undefined && currentHeight !== null && currentHeight > 0;
                      const hasError = validationErrors[`height_${index}`];
                      const isSuccess = hasValidValue && !hasError;

                      return (
                    <Input
                      type="number"
                      disabled={!isInstallationStatusSelected}
                     value={hasValidValue
                       ? (config.unit === 'imperial'
                         ? String(Math.round(convertMmToUnit(currentHeight, config.unit) * 100) / 100)
                         : Math.round(convertMmToUnit(currentHeight, config.unit)).toString()
                       )
                       : ''}
                      onChange={(e) => {
                        if (e.target.value === '') {
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
                          const numValue = parseFloat(e.target.value);
                          if (!isNaN(numValue)) {
                            updateFixingHeight(index, numValue);
                          }
                        }
                      }}
                      placeholder={config.unit === 'imperial' ? '100' : '2500'}
                     autoComplete="off"
                      className="flex-1 py-2"
                      isSuccess={isSuccess}
                      isSuggestedTypo={!!typoSuggestions[`height_${index}`]}
                     step={config.unit === 'imperial' ? '0.1' : '10'}
                     error={validationErrors[`height_${index}`]}
                     errorKey={`height_${index}`}
                    />
                      );
                    })()}
                    <span className="text-xs text-[#01312D]/50 min-w-[2rem]">
                      {config.unit === 'metric' ? 'mm' : 'in'}
                    </span>
                  </div>
                  
                  {/* Typo Warning */}
                  {typoSuggestions[`height_${index}`] && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-amber-800 w-full">
                          <strong>Possible typo:</strong> Did you mean {formatMeasurement(typoSuggestions[`height_${index}`], config.unit, true)}?
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

                {/* Attachment Type */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#01312D]">
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
                          <p className="text-sm text-[#01312D] font-medium mb-1">
                            Attachment Type
                          </p>
                          <p className="text-sm text-[#01312D]/70">
                            Post: Freestanding pole installation. Building: Attached to wall, roof, or existing structure.
                          </p>
                        </div>
                      }
                    >
                      <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                        ?
                      </span>
                    </Tooltip>
                  </div>
                  <div className="flex gap-1">
                  <div 
                    className="flex gap-1 w-full"
                    {...(validationErrors[`type_${index}`] ? { 'data-error': `type_${index}` } : {})}
                  >
                    <button
                      onClick={() => updateFixingType(index, 'post')}
                      disabled={!isInstallationStatusSelected}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border-2 ${
                        config.fixingTypes?.[index] === 'post'
                          ? 'bg-[#01312D] text-[#F3FFE3] shadow-md !border-[#01312D]'
                          : validationErrors[`type_${index}`] && !config.fixingTypes?.[index]
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 !border-red-500'
                          : 'bg-white text-[#01312D] hover:bg-[#BFF102]/10 border-[#307C31]/30'
                      }`}
                    >
                      Post
                    </button>
                    <button
                      onClick={() => updateFixingType(index, 'building')}
                      disabled={!isInstallationStatusSelected}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border-2 ${
                        config.fixingTypes?.[index] === 'building'
                          ? 'bg-[#01312D] text-[#F3FFE3] shadow-md !border-[#01312D]'
                          : validationErrors[`type_${index}`] && !config.fixingTypes?.[index]
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 !border-red-500'
                          : 'bg-white text-[#01312D] hover:bg-[#BFF102]/10 border-[#307C31]/30'
                      }`}
                    >
                      Building
                    </button>
                  </div>
                  </div>
                </div>

                {/* Eye Orientation - Only show if fixing points are installed */}
                {config.fixingPointsInstalled === true && (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#01312D]">
                      Eye Orientation
                    </span>
                    <Tooltip
                      content={
                        <div>
                         <img 
                           src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/EYE_ORIENTATION.jpg?v=1755924201" 
                           alt="Horizontal vs Vertical eye orientation example"
                           className="w-full h-auto object-cover rounded-lg mb-3"
                         />
                          <p className="text-sm text-[#01312D] font-medium mb-1">
                            Eye Orientation
                          </p>
                          <p className="text-sm text-[#01312D]/70">
                            Horizontal: Eye bolt parallel to ground. Vertical: Eye bolt perpendicular to ground. Affects hardware selection.
                          </p>
                        </div>
                      }
                    >
                      <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                        ?
                      </span>
                    </Tooltip>
                  </div>
                  <div 
                    className="flex gap-1 w-full"
                    {...(validationErrors[`orientation_${index}`] ? { 'data-error': `orientation_${index}` } : {})}
                  >
                    <button
                      onClick={() => updateEyeOrientation(index, 'horizontal')}
                      disabled={!isInstallationStatusSelected}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border-2 ${
                        config.eyeOrientations?.[index] === 'horizontal'
                          ? 'bg-[#307C31] text-[#F3FFE3] shadow-md !border-[#307C31]'
                          : validationErrors[`orientation_${index}`]
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 !border-red-500'
                          : 'bg-white text-[#01312D] hover:bg-[#BFF102]/10 border-[#307C31]/30'
                      }`}
                    >
                      Horizontal
                    </button>
                    <button
                      onClick={() => updateEyeOrientation(index, 'vertical')}
                      disabled={!isInstallationStatusSelected}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 border-2 ${
                        config.eyeOrientations?.[index] === 'vertical'
                          ? 'bg-[#307C31] text-[#F3FFE3] shadow-md !border-[#307C31]'
                          : validationErrors[`orientation_${index}`]
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 !border-red-500'
                          : 'bg-white text-[#01312D] hover:bg-[#BFF102]/10 border-[#307C31]/30'
                      }`}
                    >
                      Vertical
                    </button>
                  </div>
                </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Spacing between anchor points and installation guidelines */}
      <div className="mt-4"></div>

      <Card className="p-3 bg-slate-50 border-slate-200">
        <h4 className="text-xs md:text-sm font-semibold text-[#01312D] mb-2">
          Installation Guidelines
        </h4>
        
        {/* Installation Tips Accordion */}
        {/* Basic Guidelines List */}
        <div className="w-full">
          <ul className="space-y-1 text-xs text-slate-600">
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#307C31] rounded-full mt-1.5 mr-2 flex-shrink-0" />
              Heights are measured from ground level to the anchor point
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#307C31] rounded-full mt-1.5 mr-2 flex-shrink-0" />
              Different heights create natural water runoff and proper sail tension
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#307C31] rounded-full mt-1.5 mr-2 flex-shrink-0" />
              Minimum recommended height is {config.unit === 'imperial' ? '7.2ft' : '2.2m'} for pedestrian clearance
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#01312D] rounded-full mt-1.5 mr-2 flex-shrink-0" />
              Eye orientation affects hardware selection and installation method
            </li>
            <li className="flex items-start">
              <span className="w-1.5 h-1.5 bg-[#01312D] rounded-full mt-1.5 mr-2 flex-shrink-0" />
              Consider wind loads and local building codes - consult professionals for large installations
            </li>
          </ul>
        </div>
      </Card>


      <div className="flex flex-col gap-4 pt-4 border-t border-[#307C31]/30 w-full">
        <div className="flex flex-col sm:flex-row gap-4">
          {showBackButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              className="sm:w-auto"
            >
              Back
            </Button>
          )}
          <div className="flex-1 flex flex-col gap-2">
            {(() => {
              const complete = isStepComplete();
              const hasUnacknowledgedTypos = Object.keys(typoSuggestions).length > 0;

              const missingHeights = config.fixingHeights.filter(h => h === undefined || h === null || h <= 0).length;
              const missingTypes = (config.fixingTypes?.filter(t => t !== 'post' && t !== 'building') || []).length;
              const missingOrientations = config.fixingPointsInstalled === true
                ? (config.eyeOrientations?.filter(o => o !== 'horizontal' && o !== 'vertical') || []).length
                : 0;

              const totalMissing = missingHeights + missingTypes + missingOrientations;
              const fixingPointsNotSelected = config.fixingPointsInstalled === undefined;

              return (
                <>
                  {!complete && (
                    <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                      {fixingPointsNotSelected ? (
                        <span className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-slate-500" />
                          <span>Please select whether your fixing points are installed</span>
                        </span>
                      ) : hasUnacknowledgedTypos ? (
                        <span className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          <span>Please review and address the height warnings above</span>
                        </span>
                      ) : totalMissing > 0 ? (
                        <span className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-slate-500" />
                          <span>
                            {missingHeights > 0 && `${missingHeights} height${missingHeights !== 1 ? 's' : ''}`}
                            {missingHeights > 0 && (missingTypes > 0 || missingOrientations > 0) && ', '}
                            {missingTypes > 0 && `${missingTypes} attachment type${missingTypes !== 1 ? 's' : ''}`}
                            {missingTypes > 0 && missingOrientations > 0 && ', '}
                            {missingOrientations > 0 && `${missingOrientations} eye orientation${missingOrientations !== 1 ? 's' : ''}`}
                            {' '}required to continue
                          </span>
                        </span>
                      ) : null}
                    </div>
                  )}
                  <Button
                    onClick={onNext}
                    size="md"
                    className={!complete ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    Continue to {nextStepTitle}
                  </Button>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
import React from 'react';
import { Info } from 'lucide-react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Tooltip } from '../ui/Tooltip';
import { CURRENCY_NAMES, CURRENCY_SYMBOLS } from '../../data/pricing';

// Define the mapping for hardware pack images
const HARDWARE_PACK_IMAGES: { [key: number]: string } = {
  3: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/hardware-pack-3-corner-sail-276119.jpg?v=1724718113',
  4: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/4-ss-corner-sail.jpg?v=1742362331',
  5: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/5_Corner_Sails.jpg?v=1724717405',
  6: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/6-ss-corner-sail.jpg?v=1742362262',
};

interface CombinedMeasurementContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  validationErrors?: {[key: string]: string};
  onNext: () => void;
  onPrev: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
  isMobile?: boolean;
}

export function CombinedMeasurementContent({ config, updateConfig, onNext, onPrev, nextStepTitle = '', showBackButton = false, validationErrors = {}, isMobile = false }: CombinedMeasurementContentProps) {
  const handleMeasurementOptionChange = (option: 'adjust' | 'exact') => {
    updateConfig({ measurementOption: option });
  };

  // Get the correct hardware pack image URL based on the number of corners
  const hardwarePackImageUrl = HARDWARE_PACK_IMAGES[config.corners];

  return (
    <div className="p-4 sm:p-6">

      {/* Unit Selection */}
      <div className="mb-6 sm:mb-8">
        <h4 className="text-lg font-semibold text-slate-900 mb-2">
          Units for measurements
        </h4>
        <p className="text-sm text-slate-600 mb-4">
          Choose between metric (mm/m) or imperial (inches/feet) units
        </p>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            className={`px-4 sm:px-6 py-3 rounded-lg border-2 transition-all duration-200 ${
              config.unit === 'metric'
                ? 'border-[#01312D] bg-[#01312D] text-white'
                : validationErrors.unit && !config.unit
                ? 'border-red-500 bg-red-50 text-slate-900 hover:border-red-600'
                : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400'
            }`}
            onClick={() => updateConfig({ unit: 'metric' })}
          >
            <div className="text-center">
              <div className="font-semibold text-base mb-0.5">Metric</div>
              <div className="text-sm opacity-80">(mm/m)</div>
            </div>
          </button>

          <button
            type="button"
            className={`px-4 sm:px-6 py-3 rounded-lg border-2 transition-all duration-200 ${
              config.unit === 'imperial'
                ? 'border-[#01312D] bg-[#01312D] text-white'
                : validationErrors.unit && !config.unit
                ? 'border-red-500 bg-red-50 text-slate-900 hover:border-red-600'
                : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400'
            }`}
            onClick={() => updateConfig({ unit: 'imperial' })}
          >
            <div className="text-center">
              <div className="font-semibold text-base mb-0.5">Imperial</div>
              <div className="text-sm opacity-80">(in/ft)</div>
            </div>
          </button>
        </div>
      </div>

      {/* Measurement Option Selection */}
      <div className="mb-6 sm:mb-8">
        <h4 className="text-lg font-semibold text-slate-900 mb-4">
          How would you like your shade sail to be manufactured?
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card
            className={`p-3 sm:p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
              config.measurementOption === 'adjust'
                ? '!ring-2 !ring-[#01312D] !border-2 !border-[#01312D]'
                : validationErrors.measurementOption && !config.measurementOption
                ? 'border-2 !border-red-500 bg-red-50 hover:!border-red-600'
                : 'hover:border-slate-300'
            }`}
            onClick={() => handleMeasurementOptionChange('adjust')}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex-shrink-0 mt-1 hidden sm:block">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  config.measurementOption === 'adjust'
                    ? 'border-[#caee41] bg-[#caee41]'
                    : 'border-slate-300'
                }`}>
                  {config.measurementOption === 'adjust' && (
                    <div className="w-2 h-2 bg-[#0e302d] rounded-full" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full mb-2">
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900 leading-tight">
                      Adjust Size of Sail to Fit the Space
                    </h5>
                    <Tooltip
                      content={
                        <div>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-bold text-slate-900 mb-2">Option A – You measure your space (between fixing points)</h4>
                             <p className="text-sm text-slate-600 mb-3 font-medium italic">This is the industry best-practice and fail-safe approach for a perfect fit.</p>
                            </div>
                            
                            <div>
                              <h5 className="font-semibold text-slate-800 mb-1">What you do:</h5>
                              <ul className="text-slate-600 space-y-1 ml-3">
                                <li>• Provide the precise actual measurements between your existing or newly installed fixing points or poles.</li>
                                <li>• You can order now for price indications, then finalize measurements after your fixing points (poles, brackets) are installed for a perfect fit.</li>
                                <li>• We calculate the optimal sail size to fit your space with proper tension.</li>
                                <li>• This is the most popular option for new installations.</li>
                              </ul>
                            </div>
                            
                            <div>
                              <h5 className="font-semibold text-slate-800 mb-1">What we do:</h5>
                              <ul className="text-slate-600 space-y-1 ml-3">
                                <li>• We take your precise measurements and expertly calculate the optimal sail size, allowing for fabric stretch and tensioning hardware.</li>
                                <li>• We manufacture the sail slightly smaller than your provided dimensions to ensure a taut, perfect fit when properly tensioned.</li>
                                <li>• We include all necessary hardware for installation.</li>
                              </ul>
                            </div>
                            
                            <div>
                              <h5 className="font-semibold text-slate-800 mb-1">Best for:</h5>
                              <ul className="text-slate-600 space-y-1 ml-3">
                                <li>• Professiona look shade sail installations.</li>
                                <li>• High wind zones or longterm use where high tension & zero flapping is desirable.</li>
                                <li>• Larger sails & commercial or industrial type projects.</li>
                              </ul>
                            </div>
                            
                            <div>
                              <h5 className="font-semibold text-slate-800 mb-1">Heads-up:</h5>
                              <ul className="text-slate-600 space-y-1 ml-3">
                                <li>• The finished sail will match your exact dimensions, placing full responsibility on you for proper fit and tensioning, similar to purchasing a ready-made shade sail.</li>
                                <li>• The finished sail will be smaller than your measurements to allow for tensioning.</li>
                                <li>• Hardware pack is included for complete installation.</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      }
                    >
                      <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                        ?
                      </span>
                    </Tooltip>
                  </div>
                  <span className="bg-[#BFF102] text-[#01312D] text-xs font-bold px-2 py-0.5 rounded-full shadow-md mt-1 sm:mt-0 sm:ml-2 w-fit">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Hardware Included
                  <Tooltip
                    content={
                      <div>
                        <h4 className="font-bold text-slate-900 mb-2">Hardware Pack Included</h4>
                        {config.corners > 0 && hardwarePackImageUrl && (
                          <img 
                            src={hardwarePackImageUrl} 
                            alt={`${config.corners} Corner Hardware Pack`}
                            className="w-full h-auto object-cover rounded-lg mb-3"
                          />
                        )}
                        <p className="text-sm text-slate-600 mb-3">
                          Complete stainless steel hardware kit included with your sail.
                        </p>
                        <div className="bg-[#BFF102]/10 border border-[#BFF102] rounded-lg p-3">
                          <a 
                            href="https://shadespace.com/pages/hardware" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 bg-[#BFF102] text-[#01312D] text-xs font-bold rounded-full shadow-sm hover:bg-[#caee41] transition-colors"
                          >
                            More information about hardware
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 ml-1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    }
                  >
                    <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31] ml-1">
                      ?
                    </span>
                  </Tooltip>
                </p>
              </div>
            </div>
          </Card>

          <Card
            className={`p-3 sm:p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
              config.measurementOption === 'exact'
                ? '!ring-2 !ring-[#01312D] !border-2 !border-[#01312D]'
                : validationErrors.measurementOption && !config.measurementOption
                ? 'border-2 !border-red-500 bg-red-50 hover:!border-red-600'
                : 'hover:border-slate-300'
            }`}
            onClick={() => handleMeasurementOptionChange('exact')}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex-shrink-0 mt-1 hidden sm:block">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  config.measurementOption === 'exact'
                    ? 'border-[#caee41] bg-[#caee41]'
                    : 'border-slate-300'
                }`}>
                  {config.measurementOption === 'exact' && (
                    <div className="w-2 h-2 bg-[#0e302d] rounded-full" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h5 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900 leading-tight">
                    Fabricate Sail to the Dimensions You Provide
                  </h5>
                  <Tooltip
                    content={
                      <div>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-bold text-slate-900 mb-2">Option B – You provide your sail size (exact dimensions)</h4>
                          </div>
                          
                          <div>
                            <h5 className="font-semibold text-slate-800 mb-1">What you do:</h5>
                            <ul className="text-slate-600 space-y-1 ml-3">
                              <li>• Provide the exact finished dimensions you want for your sail.</li>
                              <li>• Calculate your own tensioning requirements.</li>
                              <li>• Choose your own tensioning turnbuckles seperately.</li>
                              <li>• Install your poles and fixing hardware to suit, after you receive the shade sail..</li>
                            </ul>
                          </div>
                          
                          <div>
                            <h5 className="font-semibold text-slate-800 mb-1">What we do:</h5>
                            <ul className="text-slate-600 space-y-1 ml-3">
                              <li>• We manufacture the sail to the exact dimensions you provided.</li>
                              <li>• We provide details of how much the sail will increase in size once fully tensioned out.</li>
                              <li>• We supply hardware if required as optional extras and is it is added to the sail price.</li>
                            </ul>
                          </div>
                          
                          <div>
                            <h5 className="font-semibold text-slate-800 mb-1">Best for:</h5>
                            <ul className="text-slate-600 space-y-1 ml-3">
                              <li>• Urgent orders where you don't have time to install the poles or fixing points before ordering.</li>
                              <li>• Experienced installers who prefer exact control.</li>
                              <li>• Smaller periodic use sails that you are happy with a potentially looser fit</li>
                              <li>• Sails that are part of a proposed fixed frame structure that is being manufactured with very limited variables.</li>
                            </ul>
                          </div>
                          
                          <div>
                            <h5 className="font-semibold text-slate-800 mb-1">Heads-up:</h5>
                            <ul className="text-slate-600 space-y-1 ml-3">
                              <li>• You must account for tensioning in your measurements as we make the sail to your pre determined measurements.</li>
                              <li>• Hardware is not included and must be added to cart separately.</li>
                              <li>• Requires more installation experience.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    }
                  >
                    <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                      ?
                    </span>
                  </Tooltip>
                </div>
                <p className="text-sm text-slate-600 mt-1">
                  Hardware Not Included
                  <Tooltip
                    content={
                      <div>
                        <h4 className="font-bold text-slate-900 mb-2">Hardware Not Included</h4>
                        <p className="text-sm text-slate-600 mb-3">
                          With this option, you'll receive only the shade sail fabric. All hardware (turnbuckles, shackles, eye bolts, etc.) must be sourced separately.
                        </p>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-sm text-slate-700 font-medium mb-2">
                            Need hardware?
                          </p>
                          <p className="text-sm text-slate-600 mb-2">
                            Visit our hardware section to purchase the components you need for installation.
                          </p>
                          <a 
                            href="https://shadespace.com/pages/hardware" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 bg-[#BFF102] text-[#01312D] text-xs font-bold rounded-full shadow-sm hover:bg-[#caee41] transition-colors"
                          >
                            Shop Hardware
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 ml-1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    }
                  >
                    <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31] ml-1">
                      ?
                    </span>
                  </Tooltip>
                </p>
              </div>
            </div>
          </Card>

        </div>
      </div>

      <div className="flex flex-col gap-4 pt-4 border-t border-slate-200 mt-6">
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
          <Button 
            onClick={onNext} 
            size="md"
            className={`flex-1 ${!config.unit || !config.measurementOption ? 'opacity-50' : ''}`}
          >
            Continue to {nextStepTitle}
          </Button>
        </div>
      </div>
    </div>
  );
}
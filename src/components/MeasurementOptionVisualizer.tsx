import React, { useState } from 'react';
import { ShadeSail3DModel } from './ShadeSail3DModel';
import { MeasurementLines } from './MeasurementLines';
import { Card } from './ui/Card';
import { Tooltip } from './ui/Tooltip';
import { AccordionItem } from './ui/AccordionItem';

interface MeasurementOptionVisualizerProps {
  selectedOption: 'adjust' | 'exact' | '';
  corners: number;
  fabricColor: string;
  onOptionChange: (option: 'adjust' | 'exact') => void;
  validationErrors?: { [key: string]: string };
}

export function MeasurementOptionVisualizer({
  selectedOption,
  corners,
  fabricColor,
  onOptionChange,
  validationErrors = {}
}: MeasurementOptionVisualizerProps) {
  const [hoveredOption, setHoveredOption] = useState<'adjust' | 'exact' | null>(null);

  const activeMeasurementType = hoveredOption || (selectedOption === 'adjust' ? 'space' : selectedOption === 'exact' ? 'sail' : null);

  const HARDWARE_PACK_IMAGES: { [key: number]: string } = {
    3: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/hardware-pack-3-corner-sail-276119.jpg?v=1724718113',
    4: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/4-ss-corner-sail.jpg?v=1742362331',
    5: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/5_Corner_Sails.jpg?v=1724717405',
    6: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/6-ss-corner-sail.jpg?v=1742362262',
  };

  const hardwarePackImageUrl = HARDWARE_PACK_IMAGES[corners];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4 order-2 lg:order-1">
        <Card
          className={`p-4 cursor-pointer transition-all duration-300 hover:shadow-xl ${
            selectedOption === 'adjust'
              ? '!ring-2 !ring-[#01312D] !border-2 !border-[#01312D] bg-[#BFF102]/5'
              : validationErrors.measurementOption && !selectedOption
              ? 'border-2 !border-red-500 bg-red-50 hover:!border-red-600'
              : 'hover:border-[#307C31] hover:shadow-md'
          }`}
          onClick={() => onOptionChange('adjust')}
          onMouseEnter={() => setHoveredOption('adjust')}
          onMouseLeave={() => setHoveredOption(null)}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  selectedOption === 'adjust'
                    ? 'border-[#BFF102] bg-[#BFF102]'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {selectedOption === 'adjust' && (
                  <div className="w-3 h-3 bg-[#01312D] rounded-full" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h5 className="text-lg font-bold text-slate-900 leading-tight">
                    Adjust Size of Sail to Fit the Space
                  </h5>
                  <Tooltip
                    content={
                      <div>
                        <div className="mb-3">
                          <img
                            src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/fit-area.webp?v=1760324780"
                            alt="Fixing points measurement diagram"
                            className="w-full h-auto rounded-lg mb-3"
                          />
                          <h4 className="font-bold text-[#01312D] text-base mb-2">Perfect Fit, Every Time</h4>
                          <p className="text-sm text-slate-700 leading-relaxed">
                            Provide the fixing-point measurements of your space, and we'll engineer your sail for a flawless, professional tensioned fit.
                          </p>
                        </div>

                        <AccordionItem trigger="Learn more →">
                          <div className="space-y-4 mt-2">
                            <p className="text-xs text-slate-600 italic font-medium">
                              This is the industry best-practice and fail-safe approach for a perfect fit.
                            </p>

                            <div>
                              <h5 className="font-semibold text-slate-800 mb-2 text-sm">What you do:</h5>
                              <ul className="text-xs text-slate-600 space-y-1.5 ml-4 list-disc">
                                <li>You provide the exact measurements between your fixing points or poles.</li>
                                <li>If your poles or fixings aren't yet installed, you can estimate measurements for pricing, then re-measure and finalise before ordering once your poles or fixings are in place.</li>
                              </ul>
                            </div>

                            <div>
                              <h5 className="font-semibold text-slate-800 mb-2 text-sm">What we do:</h5>
                              <ul className="text-xs text-slate-600 space-y-1.5 ml-4 list-disc">
                                <li>We take your precise measurements and calculate the optimal sail size - factoring in fabric stretch and hardware deductions - to ensure a taut, wrinkle-free fit.</li>
                                <li>All required tensioning hardware is included and selected by our team to match your sail size.</li>
                              </ul>
                            </div>

                            <div>
                              <h5 className="font-semibold text-slate-800 mb-2 text-sm">Best for:</h5>
                              <ul className="text-xs text-slate-600 space-y-1.5 ml-4 list-disc">
                                <li>Professional-looking, long-term installations</li>
                                <li>High-wind or exposed locations</li>
                                <li>All projects requiring tight tension and zero flapping</li>
                              </ul>
                            </div>
                          </div>
                        </AccordionItem>
                      </div>
                    }
                  >
                    <span className="w-5 h-5 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31] transition-colors">
                      ?
                    </span>
                  </Tooltip>
                </div>
                <span className="bg-[#BFF102] text-[#01312D] text-xs font-bold px-3 py-1 rounded-full shadow-md">
                  Recommended
                </span>
              </div>

              <p className="text-sm text-slate-700 mb-3 leading-relaxed">
                We calculate deductions for hardware, material stretch, and perfect fit
              </p>

              <div className="flex items-center gap-2 text-sm">
                <svg className="w-5 h-5 text-[#307C31]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-[#01312D]">Hardware Included</span>
                <Tooltip
                  content={
                    <div>
                      <h4 className="font-bold text-slate-900 mb-2">Hardware Pack Included</h4>
                      {corners > 0 && hardwarePackImageUrl && (
                        <img
                          src={hardwarePackImageUrl}
                          alt={`${corners} Corner Hardware Pack`}
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
                  <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                    ?
                  </span>
                </Tooltip>
              </div>
            </div>
          </div>
        </Card>

        <Card
          className={`p-4 cursor-pointer transition-all duration-300 hover:shadow-xl ${
            selectedOption === 'exact'
              ? '!ring-2 !ring-[#01312D] !border-2 !border-[#01312D] bg-[#BFF102]/5'
              : validationErrors.measurementOption && !selectedOption
              ? 'border-2 !border-red-500 bg-red-50 hover:!border-red-600'
              : 'hover:border-[#307C31] hover:shadow-md'
          }`}
          onClick={() => onOptionChange('exact')}
          onMouseEnter={() => setHoveredOption('exact')}
          onMouseLeave={() => setHoveredOption(null)}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  selectedOption === 'exact'
                    ? 'border-[#BFF102] bg-[#BFF102]'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {selectedOption === 'exact' && (
                  <div className="w-3 h-3 bg-[#01312D] rounded-full" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h5 className="text-lg font-bold text-slate-900 leading-tight">
                  Fabricate Sail to the Dimensions You Provide
                </h5>
                <Tooltip
                  content={
                    <div>
                      <div className="mb-3">
                        <img
                          src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/fit-dimensions.webp?v=1760324780"
                          alt="Sail dimensions diagram"
                          className="w-full h-auto rounded-lg mb-3"
                        />
                        <h4 className="font-bold text-[#01312D] text-base mb-2">Your Sail, Your Measurements</h4>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          You provide the exact sail size measurements and add any required hardware additionally.
                        </p>
                      </div>

                      <AccordionItem trigger="Learn more →">
                        <div className="space-y-4 mt-2">
                          <div>
                            <h5 className="font-semibold text-slate-800 mb-2 text-sm">What you do:</h5>
                            <ul className="text-xs text-slate-600 space-y-1.5 ml-4 list-disc">
                              <li>Provide the exact finished sail dimensions you want.</li>
                              <li>Select your own hardware separately.</li>
                              <li>Once you receive the sail, install your poles and fixings to suit.</li>
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-slate-800 mb-2 text-sm">What we do:</h5>
                            <ul className="text-xs text-slate-600 space-y-1.5 ml-4 list-disc">
                              <li>We manufacture the sail to your provided dimensions.</li>
                              <li>Hardware can be added to your order at checkout.</li>
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-slate-800 mb-2 text-sm">Best for:</h5>
                            <ul className="text-xs text-slate-600 space-y-1.5 ml-4 list-disc">
                              <li>Urgent orders where poles or fixings aren't yet installed</li>
                              <li>Smaller or temporary sails with a looser fit, that can be taken down easily</li>
                            </ul>
                          </div>
                        </div>
                      </AccordionItem>
                    </div>
                  }
                >
                  <span className="w-5 h-5 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31] transition-colors">
                    ?
                  </span>
                </Tooltip>
              </div>

              <p className="text-sm text-slate-700 mb-3 leading-relaxed">
                You provide exact sail measurements - no deductions applied
              </p>

              <div className="flex items-center gap-2 text-sm">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-semibold text-slate-900">Hardware Not Included</span>
                <Tooltip
                  content={
                    <div>
                      <h4 className="font-bold text-slate-900 mb-2">Hardware Not Included</h4>
                      <p className="text-sm text-slate-600 mb-3">
                        With this option, you'll receive only the shade sail fabric. All hardware must be sourced separately.
                      </p>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-sm text-slate-700 font-medium mb-2">
                          Need hardware?
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
                  <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                    ?
                  </span>
                </Tooltip>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="order-1 lg:order-2 lg:sticky lg:top-28 lg:self-start">
        <div className="bg-white rounded-lg shadow-xl border-2 border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-[#01312D] to-[#307C31] px-4 py-3">
            <h4 className="text-white font-bold text-lg">Interactive Visualization</h4>
            <p className="text-[#BFF102] text-sm">Hover over options to see measurement differences</p>
          </div>

          <div className="relative" style={{ height: '500px' }}>
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100">
              <ShadeSail3DModel
                corners={corners > 0 ? corners : 4}
                measurementType={activeMeasurementType}
                fabricColor={fabricColor}
              />

              {corners > 0 && activeMeasurementType && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 600 600"
                  style={{ zIndex: 10 }}
                >
                  <MeasurementLines
                    measurementType={activeMeasurementType}
                    corners={corners}
                    isActive={true}
                  />
                </svg>
              )}
            </div>

            {!activeMeasurementType && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/5 backdrop-blur-[2px]">
                <div className="text-center px-6">
                  <svg className="w-16 h-16 mx-auto mb-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <p className="text-slate-600 font-medium">Hover over an option to see the visualization</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200">
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <div className="w-6 h-1 bg-red-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(to right, #ef4444 0, #ef4444 4px, transparent 4px, transparent 8px)' }}></div>
                <span>Measurements</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                <span>Measurement Points</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

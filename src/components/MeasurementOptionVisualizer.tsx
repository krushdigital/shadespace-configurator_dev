import React from 'react';
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card
        className={`p-3.5 cursor-pointer transition-all duration-300 hover:shadow-xl ${
          selectedOption === 'adjust'
            ? '!ring-2 !ring-[#01312D] !border-2 !border-[#01312D] bg-[#BFF102]/5'
            : validationErrors.measurementOption && !selectedOption
            ? 'border-2 !border-red-500 bg-red-50 hover:!border-red-600'
            : 'hover:border-[#307C31] hover:shadow-md'
        }`}
        onClick={() => onOptionChange('adjust')}
      >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  selectedOption === 'adjust'
                    ? 'border-[#BFF102] bg-[#BFF102]'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {selectedOption === 'adjust' && (
                  <div className="w-2.5 h-2.5 bg-[#01312D] rounded-full" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <h5 className="text-base font-bold text-slate-900 leading-tight">
                    Manufactured to Fit my Space
                  </h5>
                  <Tooltip
                    content={
                      <div>
                        <div className="mb-3">
                          <div className="bg-white rounded-lg border-2 border-slate-200 overflow-hidden mb-3">
                            <div className="relative" style={{ height: '280px' }}>
                              <div className="absolute inset-0">
                                <ShadeSail3DModel
                                  corners={corners > 0 ? corners : 4}
                                  measurementType="space"
                                  fabricColor={fabricColor}
                                />
                                {corners > 0 && (
                                  <svg
                                    className="absolute inset-0 w-full h-full pointer-events-none"
                                    viewBox="0 0 400 400"
                                    style={{ zIndex: 10 }}
                                  >
                                    <MeasurementLines
                                      measurementType="space"
                                      corners={corners}
                                      isActive={true}
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <div className="bg-slate-50 px-3 py-2 border-t border-slate-200">
                              <div className="flex items-center gap-4 text-xs text-slate-600">
                                <div className="flex items-center gap-2">
                                  <div className="w-5 h-0 border-t-2 border-dashed border-red-500"></div>
                                  <span>Measurements</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white"></div>
                                  <span>Fixing Points</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <h4 className="font-bold text-[#01312D] text-base mb-2">Perfect Fit, Every Time</h4>
                          <div className="bg-[#BFF102]/10 border border-[#BFF102] rounded-lg p-3 mb-3">
                            <p className="text-xs text-[#01312D] font-semibold mb-1">How does this work?</p>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              You measure between your fixing points. We engineer the sail adjusting for both fabric stretch and tensioning hardware allowance.
                            </p>
                          </div>
                        </div>

                        <AccordionItem trigger="Learn more →" onOpenChange={(isOpen) => {
                          if (isOpen) {
                            const event = new CustomEvent('accordionOpen');
                            window.dispatchEvent(event);
                          }
                        }}>
                          <div className="space-y-4 mt-2">
                            <p className="text-xs text-slate-600 italic font-medium">
                              This is the industry best-practice approach for a perfect fit.
                            </p>

                            <div>
                              <h5 className="font-semibold text-slate-800 mb-2 text-sm">What you do:</h5>
                              <ul className="text-xs text-slate-600 space-y-1.5 ml-4 list-disc">
                                <li>Provide the precise measurements between your fixing points.</li>
                              </ul>
                              <p className="text-xs text-slate-600 mt-2 ml-4">
                                <strong>Note:</strong> If your poles or fixings aren't installed yet, you can estimate the measurements for pricing now, then re-measure and order at a later date.
                              </p>
                            </div>

                            <div>
                              <h5 className="font-semibold text-slate-800 mb-2 text-sm">What we do:</h5>
                              <ul className="text-xs text-slate-600 space-y-1.5 ml-4 list-disc">
                                <li>Calculate the perfect sail size (smaller than your space) to account for fabric stretch and tensioning</li>
                                <li>Include all the stainless steel hardware you need to install your sail</li>
                                <li>Provide guidance and installation instructions</li>
                              </ul>
                            </div>

                            <div>
                              <h5 className="font-semibold text-slate-800 mb-2 text-sm">Best for:</h5>
                              <ul className="text-xs text-slate-600 space-y-1.5 ml-4 list-disc">
                                <li>Permanent installations that need to look great for years</li>
                                <li>Windy locations where the sail needs to stay tight</li>
                                <li>Anyone who wants a professional result without guesswork</li>
                              </ul>
                            </div>
                          </div>
                        </AccordionItem>
                      </div>
                    }
                  >
                    <span className="w-4 h-4 inline-flex items-center justify-center text-[10px] bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31] transition-colors">
                      ?
                    </span>
                  </Tooltip>
                </div>
                <span className="bg-[#BFF102] text-[#01312D] text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md">
                  Recommended
                </span>
              </div>

              <p className="text-xs text-slate-700 mb-2 leading-relaxed font-medium">
                <span className="text-[#01312D] font-semibold">Why Choose:</span> Your space measurements don't translate directly to sail size - we do the math to ensure a perfect, professional fit.
              </p>
            </div>
          </div>
        </Card>

      <Card
        className={`p-3.5 cursor-pointer transition-all duration-300 hover:shadow-xl ${
          selectedOption === 'exact'
            ? '!ring-2 !ring-[#01312D] !border-2 !border-[#01312D] bg-[#BFF102]/5'
            : validationErrors.measurementOption && !selectedOption
            ? 'border-2 !border-red-500 bg-red-50 hover:!border-red-600'
            : 'hover:border-[#307C31] hover:shadow-md'
        }`}
        onClick={() => onOptionChange('exact')}
      >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                  selectedOption === 'exact'
                    ? 'border-[#BFF102] bg-[#BFF102]'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {selectedOption === 'exact' && (
                  <div className="w-2.5 h-2.5 bg-[#01312D] rounded-full" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <h5 className="text-base font-bold text-slate-900 leading-tight">
                  Manufactured to the Dimensions I Provide
                </h5>
                <Tooltip
                  content={
                    <div>
                      <div className="mb-3">
                        <div className="bg-white rounded-lg border-2 border-slate-200 overflow-hidden mb-3">
                          <div className="relative" style={{ height: '280px' }}>
                            <div className="absolute inset-0">
                              <ShadeSail3DModel
                                corners={corners > 0 ? corners : 4}
                                measurementType="sail"
                                fabricColor={fabricColor}
                              />
                              {corners > 0 && (
                                <svg
                                  className="absolute inset-0 w-full h-full pointer-events-none"
                                  viewBox="0 0 400 400"
                                  style={{ zIndex: 10 }}
                                >
                                  <MeasurementLines
                                    measurementType="sail"
                                    corners={corners}
                                    isActive={true}
                                  />
                                </svg>
                              )}
                            </div>
                          </div>
                          <div className="bg-slate-50 px-3 py-2 border-t border-slate-200">
                            <div className="flex items-center gap-4 text-xs text-slate-600">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-0 border-t-2 border-dashed border-red-500"></div>
                                <span>Measurements</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white"></div>
                                <span>Sail Corners</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <h4 className="font-bold text-[#01312D] text-base mb-2">Your Sail, Your Measurements</h4>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                          <p className="text-xs text-slate-900 font-semibold mb-1">How does this work?</p>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            You specify the finished sail dimensions. We make the sail to that exact size. You arrange your own fixing points and hardware to fit the sail you receive.
                          </p>
                        </div>
                      </div>

                      <AccordionItem trigger="Learn more →" onOpenChange={(isOpen) => {
                        if (isOpen) {
                          const event = new CustomEvent('accordionOpen');
                          window.dispatchEvent(event);
                        }
                      }}>
                        <div className="space-y-4 mt-2">
                          <div>
                            <h5 className="font-semibold text-slate-800 mb-2 text-sm">What you do:</h5>
                            <ul className="text-xs text-slate-600 space-y-1.5 ml-4 list-disc">
                              <li>If none of our standard sized sails suit your requirements, you provide the exact finished sail dimensions you want.</li>
                              <li>Select your own hardware separately.</li>
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-slate-800 mb-2 text-sm">What we do:</h5>
                            <ul className="text-xs text-slate-600 space-y-1.5 ml-4 list-disc">
                              <li>Make the sail exactly to your specified size - no adjustments</li>
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-slate-800 mb-2 text-sm">Good for:</h5>
                            <ul className="text-xs text-slate-600 space-y-1.5 ml-4 list-disc">
                              <li>Urgent orders where your poles or fixings are not installed yet.</li>
                              <li>Shorter term periodic use sails where a looser relaxed fit for ease of installation & removal is desired or acceptable.</li>
                              <li>Orders where you are confident of arranging the fixing points and tensioning to suit the sail.</li>
                            </ul>
                          </div>
                        </div>
                      </AccordionItem>
                    </div>
                  }
                >
                  <span className="w-4 h-4 inline-flex items-center justify-center text-[10px] bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31] transition-colors">
                    ?
                  </span>
                </Tooltip>
              </div>

              <p className="text-xs text-slate-700 mb-2 leading-relaxed font-medium">
                <span className="text-[#01312D] font-semibold">Why Choose:</span> You want to receive a sail to the exact dimensions you provide and take care of everything else.
              </p>
            </div>
          </div>
        </Card>
    </div>
  );
}

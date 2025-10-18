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

  const HARDWARE_PACK_IMAGES: { [key: number]: string } = {
    3: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/hardware-pack-3-corner-sail-276119.jpg?v=1724718113',
    4: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/4-ss-corner-sail.jpg?v=1742362331',
    5: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/5_Corner_Sails.jpg?v=1724717405',
    6: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/6-ss-corner-sail.jpg?v=1742362262',
  };

  const hardwarePackImageUrl = HARDWARE_PACK_IMAGES[corners];

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
                    Adjust Size of Sail to Fit the Space
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
                              You measure between your fixing points. We engineer the sail smaller (accounting for fabric stretch and tensioning) so it installs tight and wrinkle-free.
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
                                <li>Measure the distance between your fixing points (or where your poles will be)</li>
                                <li>If your fixings aren't installed yet, you can estimate for now and finalize measurements later before ordering</li>
                              </ul>
                            </div>

                            <div>
                              <h5 className="font-semibold text-slate-800 mb-2 text-sm">What we do:</h5>
                              <ul className="text-xs text-slate-600 space-y-1.5 ml-4 list-disc">
                                <li>Calculate the perfect sail size (smaller than your space) to account for fabric stretch and tensioning</li>
                                <li>Include all the stainless steel hardware you need to install your sail</li>
                                <li>Ensure your sail will be taut, wrinkle-free, and look professionally installed</li>
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

              <div className="flex items-center gap-1.5 text-xs">
                <svg className="w-4 h-4 text-[#307C31]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-[#01312D] text-xs">Tensioning Hardware Included</span>
                <Tooltip
                  content={
                    <div>
                      <h4 className="font-bold text-slate-900 mb-2">Tensioning Hardware Pack Included</h4>
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
                  <span className="w-3.5 h-3.5 inline-flex items-center justify-center text-[10px] bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                    ?
                  </span>
                </Tooltip>
              </div>
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
                  Fabricate Sail to the Dimensions You Provide
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
                              <li>Decide what size sail you want (e.g., 4m x 4m)</li>
                              <li>Purchase any hardware you need separately</li>
                              <li>Set up your poles and fixings to fit the sail when it arrives</li>
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-slate-800 mb-2 text-sm">What we do:</h5>
                            <ul className="text-xs text-slate-600 space-y-1.5 ml-4 list-disc">
                              <li>Make the sail exactly to your specified size - no adjustments</li>
                              <li>Sew D-rings at each corner ready for your hardware</li>
                            </ul>
                          </div>

                          <div>
                            <h5 className="font-semibold text-slate-800 mb-2 text-sm">Best for:</h5>
                            <ul className="text-xs text-slate-600 space-y-1.5 ml-4 list-disc">
                              <li>Quick projects where you need the sail before setting up fixings</li>
                              <li>Temporary or seasonal installations with a looser, relaxed fit</li>
                              <li>Replacing an existing sail where you already know the size you need</li>
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
                <span className="text-[#01312D] font-semibold">Why Choose:</span> You know exactly what size sail you need - we make it to your specifications, no adjustments.
              </p>

              <div className="flex items-center gap-1.5 text-xs">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-semibold text-slate-900 text-xs">Tensioning Hardware Not Included</span>
                <span className="inline-flex items-center">
                  <Tooltip
                    content={
                      <div>
                        <h4 className="font-bold text-slate-900 mb-2">Tensioning Hardware Not Included</h4>
                        <p className="text-sm text-slate-600 mb-3">
                          With this option, you'll receive the shade sail with corner D-rings sewn in. Tensioning hardware (turnbuckles, shackles, eyebolts/eye plates etc.) must be sourced separately.
                        </p>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
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
                    <span className="w-4 h-4 inline-flex items-center justify-center text-[10px] bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                      ?
                    </span>
                  </Tooltip>
                </span>
              </div>
            </div>
          </div>
        </Card>
    </div>
  );
}

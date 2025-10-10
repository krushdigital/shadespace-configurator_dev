import React from 'react';
import { useState } from 'react';
import { ConfiguratorState } from '../../types';
import { FABRICS } from '../../data/fabrics';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Tooltip } from '../ui/Tooltip';
import { Info } from 'lucide-react';

interface FabricSelectionContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  validationErrors?: {[key: string]: string};
  onNext: () => void;
  onPrev?: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
}

export function FabricSelectionContent({ config, updateConfig, onNext, onPrev, nextStepTitle = '', showBackButton = false, validationErrors = {} }: FabricSelectionContentProps) {
  const selectedFabric = FABRICS.find(f => f.id === config.fabricType);
  
  return (
    <div className="p-6">
      {/* Fabric Type Selection */}
      <div className="mb-8">
        <h4 className="text-lg font-semibold text-[#01312D] mb-4">
          <a 
            href="https://shadespace.com/pages/our-fabrics" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-[#01312D] hover:text-[#307C31] transition-colors"
          >
            Fabric Material
          </a>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FABRICS.map((fabric) => {
            const isSelected = config.fabricType === fabric.id;
            const hasError = validationErrors.fabricType && !config.fabricType;
            
            return (
              <Card
                key={fabric.id}
                className={`relative p-4 cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? '!border-2 !border-[#01312D] !ring-2 !ring-[#01312D] shadow-xl transform scale-105'
                    : hasError
                    ? 'border-2 !border-red-500 bg-red-50 hover:!border-red-600 hover:shadow-lg'
                    : 'hover:border-[#307C31] hover:shadow-lg'
                }`}
                onClick={() => updateConfig({ 
                  fabricType: fabric.id,
                  fabricColor: ''
                })}
              >
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h5 className="font-semibold text-[#01312D]">
                      {fabric.label}
                    </h5>
                    {fabric.id === 'extrablock330' && (
                      <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-md">
                        FR
                      </span>
                    )}
                    <Tooltip
                      content={
                        <div className="max-w-lg">
                          <div className="mb-3">
                            <a 
                              href="https://shadespace.com/pages/our-fabrics" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1 bg-[#BFF102] text-[#01312D] text-xs font-bold rounded-full shadow-sm hover:bg-[#caee41] transition-colors"
                            >
                              View All Fabrics
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 ml-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                              </svg>
                            </a>
                          </div>
                          <div>
                            <h4 className="font-bold text-[#01312D] mb-2">
                              {fabric.label}
                            </h4>
                            <p className="text-sm text-[#01312D]/80 mb-3 leading-relaxed">
                              {fabric.detailedDescription}
                            </p>
                          
                            {fabric.id === 'extrablock330' && (
                              <div className="flex items-center justify-center mb-3">
                                <img 
                                  src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Fire_Retardant.png?v=1755470964"
                                  alt="Fire Retardant Certified"
                                  className="w-12 h-12 mr-2"
                                />
                                <p className="text-xs text-[#01312D] font-semibold">
                                  Fire Retardant Certified
                                </p>
                              </div>
                            )}
                          
                            <div className="mb-3">
                              <h5 className="font-semibold text-[#01312D] mb-1">Made In:</h5>
                              <p className="text-sm text-[#01312D]/80">{fabric.madeIn}</p>
                            </div>
                          
                            <div className="mb-3">
                              <h5 className="font-semibold text-[#01312D] mb-1">Key Benefits:</h5>
                              <ul className="text-xs text-[#01312D]/70 space-y-1">
                                {fabric.benefits
                                  .filter(benefit => !benefit.toLowerCase().includes('uv protection'))
                                  .map((benefit, index) => (
                                    <li key={index}>• {benefit}</li>
                                ))}
                              </ul>
                            </div>
                          
                            <div>
                              <h5 className="font-semibold text-[#01312D] mb-1">Best For:</h5>
                              <ul className="text-xs text-[#01312D]/70 space-y-1">
                                {fabric.bestFor.map((use, index) => (
                                  <li key={index}>• {use}</li>
                                ))}
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
                  {/* Price tier badge - moved under title */}
                  <div className="mb-2">
                    {fabric.id === 'monotec370' && (
                      <span className="bg-[#BFF102] text-[#01312D] text-xs font-bold px-2 py-0.5 rounded shadow-md">
                        Premium
                      </span>
                    )}
                    {fabric.id === 'extrablock330' && (
                      <span className="bg-[#BFF102] text-[#01312D] text-xs font-bold px-2 py-0.5 rounded shadow-md">
                        Good Value
                      </span>
                    )}
                    {fabric.id === 'shadetec320' && (
                      <span className="bg-[#BFF102] text-[#01312D] text-xs font-bold px-2 py-0.5 rounded shadow-md">
                        Best Value
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#01312D]/70 mb-3">
                    {fabric.description}
                  </p>
                  <div className={`rounded-lg p-3 transition-all duration-300 ${
                    isSelected
                     ? 'bg-gradient-to-r from-[#01312D] to-[#307C31]'
                     : 'bg-[#F3FFE3]'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className={`text-xs mb-1 ${
                          isSelected ? 'text-[#F3FFE3]/90' : 'text-[#01312D]/60'
                        }`}>Weight</div>
                        <div className={`font-semibold ${
                          isSelected ? 'text-[#F3FFE3]' : 'text-[#01312D]'
                        }`}>{fabric.weightPerSqm} g/m²</div>
                      </div>
                      <div>
                        <div className={`text-xs mb-1 ${
                          isSelected ? 'text-[#F3FFE3]/90' : 'text-[#01312D]/60'
                        }`}>Warranty</div>
                        <div className={`font-semibold ${
                          isSelected ? 'text-[#F3FFE3]' : 'text-[#01312D]'
                        }`}>
                          <a
                            href="https://shadespace.com/pages/warranty"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {fabric.warrantyYears} Years
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Color Selection */}
      {selectedFabric && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h4 className="text-lg font-semibold text-[#01312D]">
              Choose Color
            </h4>
            <Tooltip
              content={
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Shade Factor (SF %)</h4>
                  <p className="text-sm text-slate-600 mb-3">
                    The Shade Factor percentage indicates how much sunlight the fabric blocks. 
                    Higher percentages provide more shade and UV protection.
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>70-80% SF:</span>
                      <span className="text-slate-500">Light filtering</span>
                    </div>
                    <div className="flex justify-between">
                      <span>80-90% SF:</span>
                      <span className="text-slate-500">Good shade</span>
                    </div>
                    <div className="flex justify-between">
                      <span>90%+ SF:</span>
                      <span className="text-slate-500">Maximum shade</span>
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
          {/* Dynamic Info Message for Extrablock 330 */}
          {selectedFabric.id === 'extrablock330' && (
            <div className="mb-4 p-3 bg-[#F3FFE3] border border-[#307C31] rounded-lg">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#307C31] flex-shrink-0" />
                <p className="text-sm text-[#01312D]">
                  <strong>Important:</strong> Not all Extrablock 330 colors are fire retardant. Look for the <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">FR Fabric</span> badge for certified colors, or the <span className="bg-slate-300 text-slate-700 text-xs font-bold px-1.5 py-0.5 rounded">Standard</span> badge for non-FR colors.
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {selectedFabric.colors.map((color) => {
              const isSelected = config.fabricColor === color.name;
              const hasError = validationErrors.fabricColor && !config.fabricColor;
              
              return (
                <div
                  key={color.name}
                  className="relative group"
                >
                  <button
                    onClick={() => updateConfig({ fabricColor: color.name })}
                    className={`group p-2 rounded-lg transition-all duration-300 w-full ${
                      isSelected
                       ? 'border-2 border-[#01312D] ring-2 ring-[#01312D] shadow-md'
                        : hasError
                        ? 'ring-2 !ring-red-500 bg-red-50 hover:!ring-red-600 hover:shadow-sm'
                        : 'ring-1 ring-[#307C31]/30 hover:ring-[#01312D] hover:shadow-sm'
                    }`}
                  >
                    <div className="relative overflow-hidden">
                      <div className="relative overflow-hidden pb-[75%] rounded-lg border border-slate-300">
                        <img
                          src={color.imageUrl}
                          alt={color.name}
                          className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
                            'scale-100 hover:scale-110'
                          }`}
                          loading="lazy"
                        />
                        
                        {/* Shade Factor overlay - only for Monotec 370 */}
                        {(selectedFabric.id === 'monotec370' || selectedFabric.id === 'extrablock330' || selectedFabric.id === 'shadetec320') && color.shadeFactor && (
                          <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span className="text-xs font-thin text-white bg-black bg-opacity-50 px-1 py-0.5 rounded backdrop-blur-sm">
                              SF {color.shadeFactor}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* FR Fabric Banner for ExtraBlock */}
                    {selectedFabric.id === 'extrablock330' && (
                      <div className="absolute top-1 right-1">
                        {['Yellow', 'Red', 'Cream', 'Beige'].includes(color.name) ? (
                          // Non-FR colors
                          <span className="bg-[#F3FFE3] text-[#01312D] text-xs font-bold px-1.5 py-0.5 rounded shadow-md">
                            Standard
                          </span>
                        ) : (
                          // FR colors
                          <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-md">
                            FR Fabric
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs font-medium text-[#01312D] leading-tight mt-2">
                      {color.name}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 pt-4 border-t border-[#307C31]/30">
        <div className="flex flex-col sm:flex-row gap-4">
          {showBackButton && onPrev && (
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
            className={`flex-1 ${!config.fabricType || !config.fabricColor ? 'opacity-50' : ''}`}
          >
            Continue to {nextStepTitle}
          </Button>
        </div>
      </div>
    </div>
  );
}
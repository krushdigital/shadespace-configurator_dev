import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { DualImperialInput } from './ui/DualImperialInput';
import { Tooltip } from './ui/Tooltip';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { ConfiguratorState } from '../types';
import { convertMmToUnit, convertUnitToMm, formatSecondaryUnit } from '../utils/geometry';
import { X } from 'lucide-react';

interface HeightInformationModalProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function HeightInformationModal({
  config,
  updateConfig,
  isOpen,
  onClose,
}: HeightInformationModalProps) {
  const [localHeights, setLocalHeights] = useState<number[]>([]);
  const [localAttachmentTypes, setLocalAttachmentTypes] = useState<string[]>([]);
  const [highlightedCorner, setHighlightedCorner] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalHeights([...config.fixingHeights]);
      setLocalAttachmentTypes(config.attachmentTypes ? [...config.attachmentTypes] : []);
    }
  }, [isOpen, config.fixingHeights, config.attachmentTypes]);

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const getCornerLabel = (index: number) => String.fromCharCode(65 + index);

  const updateFixingHeight = (index: number, height: number) => {
    const mmHeight = convertUnitToMm(height, config.unit);
    const newHeights = [...localHeights];
    newHeights[index] = mmHeight;
    setLocalHeights(newHeights);
  };

  const updateAttachmentType = (index: number, type: string) => {
    const newTypes = [...localAttachmentTypes];
    newTypes[index] = type;
    setLocalAttachmentTypes(newTypes);
  };

  const handleSave = () => {
    updateConfig({
      fixingHeights: localHeights,
      attachmentTypes: localAttachmentTypes,
      heightsProvidedByUser: true,
    });
    onClose();
  };

  const handleCancel = () => {
    setLocalHeights([...config.fixingHeights]);
    setLocalAttachmentTypes(config.attachmentTypes ? [...config.attachmentTypes] : []);
    onClose();
  };

  const allHeightsEntered = localHeights.slice(0, config.corners).every(h => h && h > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overscroll-contain">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto overscroll-contain bg-white rounded-lg shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#01312D]">
                Height Information Required
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Shade sails with {config.corners} corners require height measurements for proper installation
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="flex-shrink-0 p-2 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-3">
          {/* Height inputs for each corner */}
          <div className="space-y-2">
            {Array.from({ length: config.corners }, (_, index) => (
              <Card key={index} className="p-2 border-l-4 border-l-[#01312D]">
                <div className="space-y-1.5">
                  <h6 className="font-semibold text-[#01312D] text-xs">
                    Anchor Point {getCornerLabel(index)}
                  </h6>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-[2fr_1fr] md:gap-3">
                    {/* Height Input */}
                    <div>
                      <DualImperialInput
                        value={localHeights[index]
                          ? convertMmToUnit(localHeights[index], config.unit)
                          : 0}
                        onChange={(value) => {
                          if (value === 0) {
                            const newHeights = [...localHeights];
                            newHeights[index] = 0;
                            setLocalHeights(newHeights);
                          } else {
                            updateFixingHeight(index, value);
                          }
                        }}
                        onFocus={() => setHighlightedCorner(index)}
                        onBlur={() => setHighlightedCorner(null)}
                        unit={config.unit}
                        className="text-sm"
                        isSuccess={!!(localHeights[index] && localHeights[index] > 0)}
                        label={
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-[#01312D]">
                              Height from Ground
                            </span>
                            <Tooltip
                              content={
                                <div>
                                  <p className="text-xs text-[#01312D] font-medium mb-1">
                                    What is this measurement?
                                  </p>
                                  <p className="text-xs text-[#01312D]/80 leading-relaxed">
                                    Height is measured from a level ground or datum level to the anchor point. This helps ensure proper sail tension and water runoff.
                                  </p>
                                </div>
                              }
                            >
                              <span className="inline-flex items-center justify-center w-3.5 h-3.5 text-[10px] font-bold text-white bg-[#01312D] rounded-full cursor-help hover:bg-[#307C31]">
                                ?
                              </span>
                            </Tooltip>
                          </div>
                        }
                        showConversion={false}
                        allowFormatSwitch={true}
                      />
                    </div>

                    {/* Attachment Type */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-medium text-[#01312D]">
                          Attachment Type
                        </span>
                        <Tooltip
                          content={
                            <div>
                              <p className="text-xs text-[#01312D] font-medium mb-1">
                                Attachment Type
                              </p>
                              <p className="text-xs text-[#01312D]/70">
                                Post: Freestanding pole. Building: Wall, roof, or structure.
                              </p>
                            </div>
                          }
                        >
                          <span className="inline-flex items-center justify-center w-3.5 h-3.5 text-[10px] font-bold text-white bg-[#01312D] rounded-full cursor-help hover:bg-[#307C31]">
                            ?
                          </span>
                        </Tooltip>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => updateAttachmentType(index, 'Post')}
                          className={`w-full px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 border ${
                            localAttachmentTypes[index] === 'Post'
                              ? 'bg-[#01312D] text-[#F3FFE3] border-[#01312D]'
                              : 'bg-white text-[#01312D] border-slate-300 hover:bg-[#BFF102]/10'
                          }`}
                        >
                          Post
                        </button>
                        <button
                          onClick={() => updateAttachmentType(index, 'Building')}
                          className={`w-full px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-200 border ${
                            localAttachmentTypes[index] === 'Building'
                              ? 'bg-[#01312D] text-[#F3FFE3] border-[#01312D]'
                              : 'bg-white text-[#01312D] border-slate-300 hover:bg-[#BFF102]/10'
                          }`}
                        >
                          Building
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 bg-white border-t border-slate-200 p-4 sm:p-6 flex gap-3 justify-end">
          <Button
            onClick={handleCancel}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!allHeightsEntered}
          >
            {allHeightsEntered ? 'Save Heights' : 'Enter all heights to continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}

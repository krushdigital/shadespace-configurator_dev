import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { DualImperialInput } from './ui/DualImperialInput';
import { Tooltip } from './ui/Tooltip';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl">
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
        <div className="p-4 sm:p-6 space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-300 rounded-lg">
            <p className="text-sm text-[#01312D]">
              <strong>Required Information:</strong> Shade sails with {config.corners} corners require height measurements for each fixing point. This ensures proper tension, water runoff, and structural integrity for complex installations.
            </p>
          </div>

          {/* Height inputs for each corner */}
          <div className="space-y-3">
            {Array.from({ length: config.corners }, (_, index) => (
              <Card key={index} className="p-3 border-l-4 border-l-[#01312D]">
                <div className="space-y-2">
                  <h6 className="font-semibold text-[#01312D] text-sm">
                    Anchor Point {getCornerLabel(index)} Configuration
                  </h6>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-[#01312D]">
                              Height from Ground
                            </span>
                            <Tooltip
                              content={
                                <div>
                                  <p className="text-sm text-[#01312D] font-medium mb-2">
                                    What is this measurement?
                                  </p>
                                  <p className="text-sm text-[#01312D]/80 leading-relaxed">
                                    Height is measured from ground level (or your chosen datum level) to the anchor point. This helps ensure proper sail tension and water runoff.
                                  </p>
                                </div>
                              }
                            >
                              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-[#01312D] rounded-full cursor-help">
                                ?
                              </span>
                            </Tooltip>
                          </div>
                        }
                        secondaryValue={localHeights[index] && localHeights[index] > 0 ? formatSecondaryUnit(localHeights[index], config.unit) : ''}
                        showConversion={false}
                        allowFormatSwitch={true}
                      />
                    </div>

                    {/* Attachment Type */}
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-medium text-[#01312D]">
                          Attachment Type
                        </span>
                        <Tooltip
                          content={
                            <div>
                              <p className="text-sm text-[#01312D] font-medium mb-2">
                                Choose your attachment point
                              </p>
                              <p className="text-sm text-[#01312D]/80 leading-relaxed">
                                Select whether this fixing point will attach to a post, building structure, or other anchor type.
                              </p>
                            </div>
                          }
                        >
                          <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-[#01312D] rounded-full cursor-help">
                            ?
                          </span>
                        </Tooltip>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateAttachmentType(index, 'Post')}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-all ${
                            localAttachmentTypes[index] === 'Post'
                              ? 'bg-[#307C31] text-white shadow-md'
                              : 'bg-white text-[#01312D] border border-slate-300 hover:border-[#307C31]'
                          }`}
                        >
                          Post
                        </button>
                        <button
                          onClick={() => updateAttachmentType(index, 'Building')}
                          className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-all ${
                            localAttachmentTypes[index] === 'Building'
                              ? 'bg-[#307C31] text-white shadow-md'
                              : 'bg-white text-[#01312D] border border-slate-300 hover:border-[#307C31]'
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

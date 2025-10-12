import React, { useState, useCallback, forwardRef, useRef, useImperativeHandle, useMemo } from 'react';
import { ConfiguratorState } from '../types';
import { convertMmToUnit, convertUnitToMm } from '../utils/geometry';
import { ShadeSVGCore } from './ShadeSVGCore';
import { Tooltip } from './ui/Tooltip';
import { getOutwardPosition, getSelectedColor } from '../utils/svgHelpers';

export interface InteractiveMeasurementCanvasRef {
  getSVGElement: () => SVGSVGElement | null;
}

interface InteractiveMeasurementCanvasProps {
  config: ConfiguratorState;
  updateConfig?: (updates: Partial<ConfiguratorState>) => void;
  highlightedMeasurement?: string;
  onMeasurementHover?: (measurement: string | null) => void;
  compact?: boolean;
  readonly?: boolean;
  forPdfCapture?: boolean;
  isMobile?: boolean;
}

export const InteractiveMeasurementCanvas = forwardRef<InteractiveMeasurementCanvasRef, InteractiveMeasurementCanvasProps>(({ 
  config, 
  updateConfig,
  highlightedMeasurement,
  onMeasurementHover,
  compact = false,
  readonly = false,
  forPdfCapture = false,
  isMobile = false
}, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [editingMeasurementKey, setEditingMeasurementKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [editingPosition, setEditingPosition] = useState<{ x: number; y: number } | null>(null);

  // Expose the SVG element to parent components
  useImperativeHandle(ref, () => ({
    getSVGElement: () => svgRef.current
  }), []);

  // Stable callback for measurement clicks
  const handleMeasurementClick = useCallback((key: string, value: number, pos: { x: number; y: number }) => {
    if (readonly) return;
    
    // Set editing state
    setEditingMeasurementKey(key);
    setEditingPosition(pos);
    
    // Convert current value from mm to user's unit for editing
    if (value > 0) {
      const convertedValue = convertMmToUnit(value, config.unit);
      const formattedValue = config.unit === 'imperial' 
        ? String(Math.round(convertedValue * 100) / 100)
        : Math.round(convertedValue).toString();
      setEditingValue(formattedValue);
    } else {
      setEditingValue('');
    }
  }, [readonly, config.unit]);
  
  const commitEdit = useCallback(() => {
    if (!editingMeasurementKey || !updateConfig) return;
    
    const numericValue = parseFloat(editingValue);
    if (!isNaN(numericValue) && numericValue > 0) {
      const mmValue = convertUnitToMm(numericValue, config.unit);
      const newMeasurements = { ...config.measurements, [editingMeasurementKey]: mmValue };
      updateConfig({ measurements: newMeasurements });
    } else if (editingValue === '') {
      // Allow clearing the field
      const newMeasurements = { ...config.measurements };
      delete newMeasurements[editingMeasurementKey];
      updateConfig({ measurements: newMeasurements });
    }
    
    setEditingMeasurementKey(null);
    setEditingValue('');
    setEditingPosition(null);
  }, [editingMeasurementKey, editingValue, config.unit, config.measurements, updateConfig]);

  const cancelEdit = useCallback(() => {
    setEditingMeasurementKey(null);
    setEditingValue('');
    setEditingPosition(null);
  }, []);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [commitEdit, cancelEdit]);

  // Memoize corner points to prevent unnecessary re-renders
  const cornerPoints = useMemo(() => {
    // Calculate centroid for label positioning
    const centroid = config.points.length > 0 ? {
      x: config.points.reduce((sum, p) => sum + p.x, 0) / config.points.length,
      y: config.points.reduce((sum, p) => sum + p.y, 0) / config.points.length
    } : { x: 300, y: 300 };

    return config.points.map((point, index) => {
      const offset = compact ? 20 : (isMobile ? 40 : 25);
      const labelPosition = getOutwardPosition(point, centroid, offset);
      const cornerColor = getSelectedColor(config.fabricType, config.fabricColor);
      
      return {
        point,
        index,
        labelPosition,
        cornerColor,
        label: String.fromCharCode(65 + index)
      };
    });
  }, [config.points, config.fabricType, config.fabricColor, compact, isMobile]);

  return (
    <div className="w-full">
      <div className="relative w-full pb-[100%] bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
        <ShadeSVGCore
          ref={svgRef}
          config={config}
          highlightedMeasurement={highlightedMeasurement}
          onMeasurementHover={onMeasurementHover}
          onMeasurementClick={handleMeasurementClick}
          readonly={readonly}
          compact={compact}
          editingMeasurementKey={editingMeasurementKey}
          editingValue={editingValue}
          editingPosition={editingPosition}
          onEditingValueChange={setEditingValue}
          onEditCommit={commitEdit}
          onEditCancel={cancelEdit}
          onEditKeyDown={handleEditKeyDown}
          forPdfCapture={forPdfCapture}
          isMobile={isMobile}
        >
          {/* Corner points - simplified for interactive canvas */}
          {cornerPoints.map(({ point, index, labelPosition, cornerColor, label }) => {
            return (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isMobile ? "18" : "10"}
                  fill={cornerColor}
                  stroke="white"
                  strokeWidth="3"
                  className="drop-shadow-sm"
                />
                <text
                  x={labelPosition.x}
                  y={labelPosition.y}
                  fontSize={isMobile ? "24" : "16"}
                  className="fill-slate-900 font-bold pointer-events-none select-none"
                  style={{ 
                    filter: 'drop-shadow(0 1px 2px rgba(255,255,255,0.8))'
                  }}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </ShadeSVGCore>
        
        {/* Info icon with legend tooltip - positioned in top-right corner */}
        {!compact && !forPdfCapture && (
          <div className="absolute top-2 right-2">
            <Tooltip
              content={
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-emerald-500"></div>
                    <span className="text-slate-600">Edge measurements</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 border-b-2 border-slate-400 border-dashed"></div>
                    <span className="text-slate-600">Diagonal measurements (color varies with fabric)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-red-500"></div>
                    <span className="text-slate-600">Highlighted measurement</span>
                  </div>
                </div>
              }
            >
              <div className="w-6 h-6 bg-white bg-opacity-90 backdrop-blur-sm rounded-full border border-slate-300 flex items-center justify-center cursor-help hover:bg-opacity-100 transition-all duration-200 shadow-sm">
                <span className="text-xs font-bold text-slate-600">?</span>
              </div>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
});
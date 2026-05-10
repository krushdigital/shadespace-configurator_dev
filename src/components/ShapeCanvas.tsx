import React, { useRef, useState, useCallback, useMemo } from 'react';
import { ConfiguratorState, Point } from '../types';
import { ShadeSVGCore } from './ShadeSVGCore';
import { convertMmToUnit, convertUnitToMm, getShapeAccuracy } from '../utils/geometry';
import { getOutwardPosition, getSelectedColor } from '../utils/svgHelpers';
import { toast } from 'react-toastify';
import { Tooltip } from './ui/Tooltip';
import { HelpCircle, AlertTriangle, CheckCircle } from 'lucide-react';

interface ShapeCanvasProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  readonly?: boolean;
  snapToGrid?: boolean;
  highlightedMeasurement?: string | null;
  highlightedCorner?: number | null;
  isMobile?: boolean;
  measurementOption?: 'adjust' | 'exact';
  unit?: 'metric' | 'imperial';
  plainBackground?: boolean;
  onCornerTap?: (index: number) => void;
  onCornerHover?: (index: number | null) => void;
  hideHelp?: boolean;
}

export function ShapeCanvas({
  config,
  updateConfig,
  readonly = false,
  snapToGrid = true,
  highlightedMeasurement = null,
  highlightedCorner = null,
  isMobile = false,
  measurementOption = 'adjust',
  unit = 'metric',
  plainBackground = false,
  onCornerTap,
  onCornerHover,
  hideHelp = false,
}: ShapeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showCornerPulse, setShowCornerPulse] = useState(true);

  // Editing state for direct measurement editing
  const [editingMeasurementKey, setEditingMeasurementKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [editingPosition, setEditingPosition] = useState<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    if (!readonly) {
      const timer = setTimeout(() => {
        setShowCornerPulse(false);
      }, 8000);
      return () => clearTimeout(timer);
    } else {
      setShowCornerPulse(false);
    }
  }, [readonly]);

  // Convert screen coordinates to SVG coordinates
  const screenToSVG = useCallback((clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };

    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 600;
    const y = ((clientY - rect.top) / rect.height) * 500;

    return { x, y };
  }, []);

  // Snap to grid
  const snapToGridFn = useCallback((point: Point): Point => {
    if (!snapToGrid) return point;
    const gridSize = 10;
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
  }, [snapToGrid]);

  // Constrain to bounds
  const constrainToBounds = useCallback((point: Point): Point => {
    return {
      x: Math.max(5, Math.min(595, point.x)),
      y: Math.max(5, Math.min(595, point.y))
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    if (readonly) return;
    if (config.corners === 3) return;

    e.preventDefault();
    e.stopPropagation();

    setDragIndex(index);
  }, [readonly, config.corners]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (dragIndex === null || readonly) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const { clientX, clientY } = e;

    // Simple 1:1 coordinate mapping - no complex transformations
    let svgX = clientX - rect.left;
    let svgY = clientY - rect.top;
    e.preventDefault();
    // Convert to SVG coordinate space
    const viewBox = svg.viewBox.baseVal;
    svgX = (svgX / rect.width) * viewBox.width + viewBox.x;
    svgY = (svgY / rect.height) * viewBox.height + viewBox.y;

    // Constrain to canvas bounds
    svgX = Math.max(5, Math.min(viewBox.width - 5, svgX));
    svgY = Math.max(5, Math.min(viewBox.height - 5, svgY));

    // Snap to grid
    if (snapToGrid) {
      const gridSize = 10;
      svgX = Math.round(svgX / gridSize) * gridSize;
      svgY = Math.round(svgY / gridSize) * gridSize;
    }

    const newPoints = [...config.points];
    newPoints[dragIndex] = { x: svgX, y: svgY };

    // Only log and notify once when flag changes
    if (!config.hasManuallyAdjustedShape) {
      console.log('User manually adjusted shape - disabling auto-reconstruction');
      toast.info('Switched to Manual mode. Toggle back to Auto to have your shape automatically fit your measurements.', {
        autoClose: 3000,
        hideProgressBar: false,
      });
    }
    updateConfig({ points: newPoints, hasManuallyAdjustedShape: true });
  }, [dragIndex, readonly, snapToGrid, config.points, config.hasManuallyAdjustedShape, updateConfig]);

  const handleMouseUp = useCallback(() => {
    setDragIndex(null);
  }, []);

  // Touch event handlers for mobile devices
  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    if (readonly) return;
    if (config.corners === 3) return;

    e.preventDefault();
    e.stopPropagation();

    setDragIndex(index);
  }, [readonly, config.corners]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (dragIndex === null || readonly) return;

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;

    const { clientX, clientY } = touch;

    // Simple 1:1 coordinate mapping - no complex transformations
    let svgX = clientX - rect.left;
    let svgY = clientY - rect.top;
    e.preventDefault();

    // Convert to SVG coordinate space
    const viewBox = svg.viewBox.baseVal;
    svgX = (svgX / rect.width) * viewBox.width + viewBox.x;
    svgY = (svgY / rect.height) * viewBox.height + viewBox.y;

    // Constrain to canvas bounds
    svgX = Math.max(5, Math.min(viewBox.width - 5, svgX));
    svgY = Math.max(5, Math.min(viewBox.height - 5, svgY));

    // Snap to grid
    if (snapToGrid) {
      const gridSize = 10;
      svgX = Math.round(svgX / gridSize) * gridSize;
      svgY = Math.round(svgY / gridSize) * gridSize;
    }

    const newPoints = [...config.points];
    newPoints[dragIndex] = { x: svgX, y: svgY };

    // Only log and notify once when flag changes
    if (!config.hasManuallyAdjustedShape) {
      console.log('User manually adjusted shape - disabling auto-reconstruction');
      toast.info('Switched to Manual mode. Toggle back to Auto to have your shape automatically fit your measurements.', {
        autoClose: 3000,
        hideProgressBar: false,
      });
    }
    updateConfig({ points: newPoints, hasManuallyAdjustedShape: true });
  }, [dragIndex, readonly, snapToGrid, config.points, config.hasManuallyAdjustedShape, updateConfig]);

  const handleTouchEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  // Handle measurement click for editing
  const handleMeasurementClick = useCallback((key: string, value: number, pos: { x: number; y: number }) => {
    if (readonly) return;
    
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

  // Commit the edit
  const commitEdit = useCallback(() => {
    if (!editingMeasurementKey) return;
    
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

  // Cancel the edit
  const cancelEdit = useCallback(() => {
    setEditingMeasurementKey(null);
    setEditingValue('');
    setEditingPosition(null);
  }, []);

  // Handle keyboard events in the edit input
  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [commitEdit, cancelEdit]);

  // Add global mouse event listeners when dragging
  React.useEffect(() => {
    if (dragIndex !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [dragIndex, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Calculate centroid for label positioning
  const centroid = useMemo(() => config.points.length > 0 ? {
    x: config.points.reduce((sum, p) => sum + p.x, 0) / config.points.length,
    y: config.points.reduce((sum, p) => sum + p.y, 0) / config.points.length
  } : { x: 300, y: 300 }, [config.points]);

  // Calculate shape accuracy
  const shapeAccuracyInfo = useMemo(() => {
    return getShapeAccuracy(config.measurements, config.corners);
  }, [config.measurements, config.corners]);

  // Memoize corner points to prevent unnecessary re-renders
  const cornerPoints = useMemo(() => {
    return config.points.map((point, index) => {
      const labelPosition = getOutwardPosition(point, centroid, isMobile ? 40 : 25);
      const fabricColor = getSelectedColor(config.fabricType, config.fabricColor);
      const cornerColor = (config.corners !== 3 && config.hasManuallyAdjustedShape) ? '#3B82F6' : fabricColor;

      return {
        point,
        index,
        labelPosition,
        cornerColor,
        label: String.fromCharCode(65 + index)
      };
    });
  }, [config.points, config.fabricType, config.fabricColor, config.hasManuallyAdjustedShape, centroid, isMobile]);

  // Generate tooltip content based on props
  const tooltipContent = (
    <div className="max-w-xs">
      <p className="text-sm text-[#01312D] font-semibold mb-2">
        Interactive Canvas Guide
      </p>
      <div className="space-y-2 text-sm text-[#01312D]/80">
        <p>
          <strong>Auto Mode:</strong> The shape automatically fits your measurements. Perfect for accurate sizing.
        </p>
        <p>
          <strong>Manual Mode:</strong> Drag the corners to customize the shape. Use the toggle button below the canvas to switch modes.
        </p>
        <p>
          Enter your {measurementOption === 'adjust' ? 'space measurements (distance between fixing points)' : 'desired shade dimensions'} in the fields {isMobile ? 'below' : 'to the right'} to calculate pricing.
        </p>
        <p className="text-xs text-[#01312D]/70 mt-2">
          All measurements are in {unit === 'imperial' ? 'inches' : 'millimeters'}.
        </p>
      </div>
    </div>
  );

  return (
    <div>
      {/* Shape Accuracy Indicator - Above Canvas */}
      {shapeAccuracyInfo.accuracy === 'exact' && config.corners >= 3 && (
        <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-700">
              Shape preview matches your measurements
            </p>
          </div>
        </div>
      )}

      <div className={`relative w-full pb-[100%] overflow-hidden ${plainBackground ? 'bg-white' : 'bg-gradient-to-br from-slate-50 to-slate-100'}`}>
        {/* Help Icon Tooltip in Top-Left Corner */}
        {!hideHelp && (
          <div className="absolute top-3 left-3 z-20">
            <Tooltip content={tooltipContent}>
              <button
                className="w-7 h-7 flex items-center justify-center bg-[#01312D] text-white rounded-full shadow-lg hover:bg-[#307C31] transition-colors duration-200 cursor-help"
                aria-label="Canvas help and instructions"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        )}

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 600 600"
          className="absolute inset-0"
          style={{ 
            cursor: dragIndex !== null ? 'grabbing' : 'default',
            userSelect: 'none'
          }}
        >
          <ShadeSVGCore
            config={config}
            highlightedMeasurement={highlightedMeasurement}
            onMeasurementClick={handleMeasurementClick}
            readonly={readonly}
            compact={false}
            plainBackground={plainBackground}
            editingMeasurementKey={editingMeasurementKey}
            editingValue={editingValue}
            editingPosition={editingPosition}
            onEditingValueChange={setEditingValue}
            onEditCommit={commitEdit}
            onEditCancel={cancelEdit}
            onEditKeyDown={handleEditKeyDown}
            isMobile={isMobile}
            showAccuracyBadge={true}
          >
            {/* Corner points */}
            {cornerPoints.map(({ point, index, labelPosition, cornerColor, label }) => {
              const isHighlighted = highlightedCorner === index;
              const displayColor = isHighlighted ? '#EF4444' : cornerColor;

              return (
                <g key={index}>
                  {/* Pulse effect circle - shown during initial animation OR when highlighted */}
                  {(showCornerPulse && !readonly || isHighlighted) && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={isMobile ? "14" : "10"}
                      fill={displayColor}
                      stroke="none"
                      className={isMobile ? "corner-pulse-mobile" : "corner-pulse"}
                      style={{
                        pointerEvents: 'none'
                      }}
                    />
                  )}
                  {/* Main corner point */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isMobile ? "14" : "10"}
                    fill={displayColor}
                    stroke="white"
                    strokeWidth="3"
                    className={(readonly && onCornerTap) ? 'cursor-pointer' : (readonly || config.corners === 3) ? '' : 'cursor-grab'}
                    onMouseDown={config.corners === 3 || readonly ? undefined : (e) => handleMouseDown(e, index)}
                    onTouchStart={config.corners === 3 || readonly ? undefined : (e) => handleTouchStart(e, index)}
                    onClick={readonly && onCornerTap ? () => onCornerTap(index) : undefined}
                    onMouseEnter={readonly && onCornerHover ? () => onCornerHover(index) : undefined}
                    onMouseLeave={readonly && onCornerHover ? () => onCornerHover(null) : undefined}
                    style={{
                      cursor: (readonly && onCornerTap) ? 'pointer' : (readonly || config.corners === 3) ? 'default' : dragIndex === index ? 'grabbing' : 'grab'
                    }}
                  />
                  <text
                    x={labelPosition.x}
                    y={labelPosition.y}
                    fontSize={isMobile ? "20" : "16"}
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
        </svg>
      </div>
    </div>
  );
}
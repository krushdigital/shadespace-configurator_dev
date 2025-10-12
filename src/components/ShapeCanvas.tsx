import React, { useRef, useState, useCallback, useMemo } from 'react';
import { ConfiguratorState, Point } from '../types';
import { ShadeSVGCore } from './ShadeSVGCore';
import { convertMmToUnit, convertUnitToMm } from '../utils/geometry';
import { getOutwardPosition, getSelectedColor } from '../utils/svgHelpers';

interface ShapeCanvasProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  readonly?: boolean;
  snapToGrid?: boolean;
  highlightedMeasurement?: string | null;
  isMobile?: boolean;
}

export function ShapeCanvas({ 
  config, 
  updateConfig, 
  readonly = false,
  snapToGrid = true,
  highlightedMeasurement = null,
  isMobile = false
}: ShapeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  
  // Editing state for direct measurement editing
  const [editingMeasurementKey, setEditingMeasurementKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [editingPosition, setEditingPosition] = useState<{ x: number; y: number } | null>(null);

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
    
    e.preventDefault();
    e.stopPropagation();
    
    setDragIndex(index);
  }, [readonly]);

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
    updateConfig({ points: newPoints });
  }, [dragIndex, readonly, snapToGrid, config.points, updateConfig]);

  const handleMouseUp = useCallback(() => {
    setDragIndex(null);
  }, []);

  // Touch event handlers for mobile devices
  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    if (readonly) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setDragIndex(index);
  }, [readonly]);

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
    updateConfig({ points: newPoints });
  }, [dragIndex, readonly, snapToGrid, config.points, updateConfig]);

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

  // Memoize corner points to prevent unnecessary re-renders
  const cornerPoints = useMemo(() => {
    return config.points.map((point, index) => {
      const labelPosition = getOutwardPosition(point, centroid, isMobile ? 40 : 25);
      const cornerColor = getSelectedColor(config.fabricType, config.fabricColor);
      
      return {
        point,
        index,
        labelPosition,
        cornerColor,
        label: String.fromCharCode(65 + index)
      };
    });
  }, [config.points, config.fabricType, config.fabricColor, centroid, isMobile]);

  return (
    <div>
      <div className="relative w-full pb-[100%] bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
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
            editingMeasurementKey={editingMeasurementKey}
            editingValue={editingValue}
            editingPosition={editingPosition}
            onEditingValueChange={setEditingValue}
            onEditCommit={commitEdit}
            onEditCancel={cancelEdit}
            onEditKeyDown={handleEditKeyDown}
            isMobile={isMobile}
          >
            {/* Corner points */}
            {cornerPoints.map(({ point, index, labelPosition, cornerColor, label }) => {
              return (
                <g key={index}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isMobile ? "14" : "10"}
                    fill={cornerColor}
                    stroke="white"
                    strokeWidth="3"
                    className={readonly ? '' : 'cursor-grab'}
                    onMouseDown={(e) => handleMouseDown(e, index)}
                    onTouchStart={(e) => handleTouchStart(e, index)}
                    style={{ 
                      cursor: readonly ? 'default' : dragIndex === index ? 'grabbing' : 'grab'
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
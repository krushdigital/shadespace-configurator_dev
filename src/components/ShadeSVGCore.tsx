import React, { useRef, useState, useEffect, useMemo, useCallback, forwardRef } from 'react';
import { ConfiguratorState, Point } from '../types';
import { formatMeasurement } from '../utils/geometry';
import { FABRICS } from '../data/fabrics';

interface ShadeSVGCoreProps {
  config: ConfiguratorState;
  highlightedMeasurement?: string | null;
  onMeasurementHover?: (measurement: string | null) => void;
  onMeasurementClick?: (measurementKey: string, currentValue: number, position: { x: number; y: number }) => void;
  readonly?: boolean;
  compact?: boolean;
  editingMeasurementKey?: string | null;
  editingValue?: string;
  editingPosition?: { x: number; y: number } | null;
  onEditingValueChange?: (value: string) => void;
  onEditCommit?: () => void;
  onEditCancel?: () => void;
  onEditKeyDown?: (e: React.KeyboardEvent) => void;
  children?: React.ReactNode; // For corner points or other custom content
  forPdfCapture?: boolean;
  isMobile?: boolean;
}

export const ShadeSVGCore = forwardRef<SVGSVGElement, ShadeSVGCoreProps>(({
  config,
  highlightedMeasurement,
  onMeasurementHover,
  onMeasurementClick,
  readonly = false,
  compact = false,
  editingMeasurementKey,
  editingValue,
  editingPosition,
  onEditingValueChange,
  onEditCommit,
  onEditCancel,
  onEditKeyDown,
  children,
  forPdfCapture = false,
  isMobile = false
}, ref) => {
  const [fabricImageBase64, setFabricImageBase64] = useState<string | null>(null);

  // Stable click handler that always uses the current onMeasurementClick prop
  const handleMeasurementClick = useCallback((measurementKey: string, currentValue: number, position: { x: number; y: number }) => {
    onMeasurementClick?.(measurementKey, currentValue, position);
  }, [readonly]);

  // Get selected fabric and color for visual representation
  const selectedFabric = FABRICS.find(f => f.id === config.fabricType);
  const selectedColor = selectedFabric?.colors.find(c => c.name === config.fabricColor);

  // Calculate turnbuckle dimensions based on view type
  const cornerRadius = isMobile ? 18 : 10;
  const turnbuckleOffset = compact ? 5 : (isMobile ? 8 : 10);

  // Calculate centroid for label positioning
  const centroid = useMemo(() => {
    if (config.points.length === 0) return { x: 300, y: 250 };
    
    const sumX = config.points.reduce((sum, point) => sum + point.x, 0);
    const sumY = config.points.reduce((sum, point) => sum + point.y, 0);
    
    return {
      x: sumX / config.points.length,
      y: sumY / config.points.length
    };
  }, [config.points]);

  // Calculate sail attachment points (where the sail fabric actually starts)
  const sailAttachmentPoints = useMemo(() => {
    if (config.measurementOption !== 'adjust' || config.points.length === 0) {
      return config.points; // No offset for exact measurements
    }
    
    return config.points.map(point => {
      const dx = centroid.x - point.x;
      const dy = centroid.y - point.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      if (length === 0) return point;
      
      const normalizedX = dx / length;
      const normalizedY = dy / length;
      
      return {
        x: point.x + normalizedX * (cornerRadius + turnbuckleOffset),
        y: point.y + normalizedY * (cornerRadius + turnbuckleOffset)
      };
    });
  }, [config.points, config.measurementOption, centroid, cornerRadius, turnbuckleOffset]);

  // Get selected color for outline and fallback
  const getSelectedColor = useCallback(() => {
    if (selectedColor?.textColor === '#FFFFFF') {
      return '#1f2937'; // Dark fabric, use a dark outline
    } else {
      return '#0f172a'; // Light fabric, use a darker outline for contrast
    }
  }, [selectedColor?.textColor]);

  // Helper function to calculate outward position for labels
  const getOutwardPosition = useCallback((point: Point, offset: number = compact ? 20 : (isMobile ? 40 : 25)) => {
    // Use smaller offset for PDF capture to ensure labels stay within viewBox
    if (forPdfCapture) {
      offset = 15;
    }
    
    const dx = point.x - centroid.x;
    const dy = point.y - centroid.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return { x: point.x + offset, y: point.y - offset };
    
    const normalizedX = dx / length;
    const normalizedY = dy / length;
    
    const position = {
      x: point.x + normalizedX * offset,
      y: point.y + normalizedY * offset
    };
    
    // For PDF capture, ensure labels stay within viewBox bounds (0-600)
    if (forPdfCapture) {
      position.x = Math.max(20, Math.min(580, position.x));
      position.y = Math.max(20, Math.min(580, position.y));
    }
    
    return position;
  }, [centroid, compact, isMobile, forPdfCapture]);

  // Helper function to get outward perpendicular position for edge labels
  const getEdgeLabelPosition = useCallback((fromPoint: Point, toPoint: Point, offset: number = compact ? 25 : (isMobile ? 45 : 35)) => {
    // Use smaller offset for PDF capture to ensure labels stay within viewBox
    if (forPdfCapture) {
      offset = 18;
    }
    
    const midX = (fromPoint.x + toPoint.x) / 2;
    const midY = (fromPoint.y + toPoint.y) / 2;
    
    // Calculate edge vector
    const edgeX = toPoint.x - fromPoint.x;
    const edgeY = toPoint.y - fromPoint.y;
    
    // Calculate perpendicular vector (rotate 90 degrees)
    const perpX = -edgeY;
    const perpY = edgeX;
    
    // Normalize perpendicular vector
    const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
    if (perpLength === 0) return { x: midX, y: midY - offset };
    
    const normalizedPerpX = perpX / perpLength;
    const normalizedPerpY = perpY / perpLength;
    
    // Determine which direction points away from centroid
    const toCentroidX = centroid.x - midX;
    const toCentroidY = centroid.y - midY;
    
    // Use dot product to determine direction
    const dotProduct = normalizedPerpX * toCentroidX + normalizedPerpY * toCentroidY;
    const direction = dotProduct > 0 ? -1 : 1;
    
    const position = {
      x: midX + normalizedPerpX * offset * direction,
      y: midY + normalizedPerpY * offset * direction
    };
    
    // For PDF capture, ensure labels stay within viewBox bounds (0-600)
    if (forPdfCapture) {
      position.x = Math.max(20, Math.min(580, position.x));
      position.y = Math.max(20, Math.min(580, position.y));
    }
    
    return position;
  }, [centroid, compact, isMobile, forPdfCapture]);

  // Load fabric image as Base64 when color changes
  useEffect(() => {
    if (selectedColor?.imageUrl) {
      const loadImage = async () => {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          
          img.onload = () => {
            // Create a canvas to convert the image to base64
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx?.drawImage(img, 0, 0);
            
            // Convert to base64
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setFabricImageBase64(dataUrl);
          };
          
          img.onerror = (error) => {
            setFabricImageBase64(null);
          };
          
          img.src = selectedColor.imageUrl;
        } catch (error) {
          setFabricImageBase64(null);
        }
      };
      loadImage();
    } else {
      setFabricImageBase64(null);
    }
  }, [selectedColor?.imageUrl]);

  // Generate curved path for realistic sail shape
  const generateSailPath = useCallback((points: Point[]) => {
    if (points.length < 3) return '';
    
    let path = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      
      // Calculate control point for slight inward curve
      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;
      
      // Small inward curve for realistic sail sag
      const distance = Math.sqrt(Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2));
      const curvature = Math.min(25, distance * 0.08);
      const angle = Math.atan2(next.y - current.y, next.x - current.x);
      const perpAngle = angle + Math.PI / 2;
      
      const controlX = midX + Math.cos(perpAngle) * curvature;
      const controlY = midY + Math.sin(perpAngle) * curvature;
      
      path += ` Q ${controlX},${controlY} ${next.x},${next.y}`;
    }
    
    return path;
  }, []);

  // Get edge measurements to show
  const getEdgeMeasurements = useCallback(() => {
    const measurements = [];
    for (let i = 0; i < config.corners; i++) {
      const nextIndex = (i + 1) % config.corners;
      const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
      measurements.push({
        key: edgeKey,
        from: i,
        to: nextIndex,
        hasValue: !!config.measurements[edgeKey]
      });
    }
    return measurements;
  }, [config.corners, config.measurements]);

  // Get diagonal measurements to show
  const getDiagonalMeasurements = useCallback(() => {
    const diagonals = [];
    
    if (config.corners === 4) {
      diagonals.push(
        { key: 'AC', from: 0, to: 2, hasValue: !!config.measurements['AC'] },
        { key: 'BD', from: 1, to: 3, hasValue: !!config.measurements['BD'] }
      );
    } else if (config.corners === 5) {
      diagonals.push(
        { key: 'AC', from: 0, to: 2, hasValue: !!config.measurements['AC'] },
        { key: 'AD', from: 0, to: 3, hasValue: !!config.measurements['AD'] },
        { key: 'CE', from: 2, to: 4, hasValue: !!config.measurements['CE'] },
        { key: 'BD', from: 1, to: 3, hasValue: !!config.measurements['BD'] },
        { key: 'BE', from: 1, to: 4, hasValue: !!config.measurements['BE'] }
      );
    } else if (config.corners === 6) {
      diagonals.push(
        { key: 'AC', from: 0, to: 2, hasValue: !!config.measurements['AC'] },
        { key: 'AD', from: 0, to: 3, hasValue: !!config.measurements['AD'] },
        { key: 'AE', from: 0, to: 4, hasValue: !!config.measurements['AE'] },
        { key: 'BD', from: 1, to: 3, hasValue: !!config.measurements['BD'] },
        { key: 'BE', from: 1, to: 4, hasValue: !!config.measurements['BE'] },
        { key: 'BF', from: 1, to: 5, hasValue: !!config.measurements['BF'] },
        { key: 'CE', from: 2, to: 4, hasValue: !!config.measurements['CE'] },
        { key: 'CF', from: 2, to: 5, hasValue: !!config.measurements['CF'] },
        { key: 'DF', from: 3, to: 5, hasValue: !!config.measurements['DF'] }
      );
    }
    
    return diagonals;
  }, [config.corners, config.measurements]);

  const edgeMeasurements = useMemo(() => getEdgeMeasurements(), [getEdgeMeasurements]);
  const diagonalMeasurements = useMemo(() => getDiagonalMeasurements(), [getDiagonalMeasurements]);

  // Dynamic clickable area dimensions for mobile
  const rectWidth = isMobile ? 80 : 50;
  const rectHeight = isMobile ? 30 : 16;

  const height = compact ? 180 : 300;
  const viewBoxHeight = compact ? 240 : 600;

  return (
    <svg
      ref={ref}
      width="100%"
      height="100%"
      viewBox={`0 0 600 600`}
      className="absolute inset-0"
      style={{ userSelect: 'none' }}
    >
      {/* White background for PDF capture */}
      {forPdfCapture && (
        <rect width="100%" height="100%" fill="white" />
      )}
      
      {/* Grid */}
      <defs>
        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.5"/>
        </pattern>
        <pattern id="majorGrid" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#94a3b8" strokeWidth="1"/>
        </pattern>
        
        {/* Arrow markers for diagonal lines */}
        <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#3B82F6" />
        </marker>
        <marker id="arrowhead-highlighted" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#EF4444" />
        </marker>
        <marker id="arrowhead-white" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#FFFFFF" stroke="#000000" strokeWidth="0.5" />
        </marker>
        <marker id="arrowhead-black" markerWidth="10" markerHeight="7" 
                refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#000000" />
        </marker>
        
        {/* Fabric texture pattern */}
        {fabricImageBase64 && (
          <pattern id="fabricTexture" patternUnits="userSpaceOnUse" x="0" y="0" width="600" height="600">
            <image 
              href={fabricImageBase64} 
              x="0" 
              y="0" 
              width="600" 
              height="600" 
              preserveAspectRatio="xMidYMid slice"
            />
          </pattern>
        )}
      </defs>
      {!forPdfCapture && (
        <>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <rect width="100%" height="100%" fill="url(#majorGrid)" />
        </>
      )}

      {/* Shape */}
      {sailAttachmentPoints.length > 2 && (
        <path
          d={generateSailPath(sailAttachmentPoints)}
          fill={fabricImageBase64 ? "url(#fabricTexture)" : forPdfCapture ? getSelectedColor() : `${getSelectedColor()}20`}
          stroke={getSelectedColor()}
          strokeWidth="2"
          className="drop-shadow-sm"
        />
      )}

      {/* Edge lines */}
      {edgeMeasurements.map((measurement) => {
        const fromPoint = config.points[measurement.from];
        const toPoint = config.points[measurement.to];
        const isHighlighted = highlightedMeasurement === measurement.key || editingMeasurementKey === measurement.key;
        const labelPosition = getEdgeLabelPosition(fromPoint, toPoint);
        
        return (
          <g key={`edge-${measurement.key}`}>
            {/* Measurement line - always shows the full distance between corner points */}
            <line
              x1={fromPoint.x}
              y1={fromPoint.y}
              x2={toPoint.x}
              y2={toPoint.y}
              stroke={isHighlighted ? "#EF4444" : measurement.hasValue ? "#059669" : "#94A3B8"}
              strokeWidth={isHighlighted ? "5" : measurement.hasValue ? "4" : "2"}
              strokeDasharray={measurement.hasValue ? "none" : "8,4"}
              className="transition-all duration-200"
              onMouseEnter={() => onMeasurementHover?.(measurement.key)}
              onMouseLeave={() => onMeasurementHover?.(null)}
              style={{ cursor: readonly || !onMeasurementClick ? 'default' : 'pointer' }}
            />
            
            {/* Measurement annotation - shows this is fixing point to fixing point */}
            {config.measurementOption === 'adjust' && measurement.hasValue && (
              <g>
                {/* Small arrows at each end to indicate measurement points */}
                <circle
                  cx={fromPoint.x}
                  cy={fromPoint.y}
                  r="3"
                  fill={isHighlighted ? "#EF4444" : "#059669"}
                  stroke="white"
                  strokeWidth="1"
                  className="pointer-events-none"
                />
                <circle
                  cx={toPoint.x}
                  cy={toPoint.y}
                  r="3"
                  fill={isHighlighted ? "#EF4444" : "#059669"}
                  stroke="white"
                  strokeWidth="1"
                  className="pointer-events-none"
                />
              </g>
            )}
            
            {/* Edge label with click area */}
            <g>
              {/* Invisible click area */}
              <rect
                x={labelPosition.x - rectWidth / 2}
                y={labelPosition.y - rectHeight / 2}
                width={rectWidth}
                height={rectHeight}
                fill="transparent"
                style={{ pointerEvents: 'all' }}
                className={readonly || !onMeasurementClick ? '' : 'cursor-pointer'}
                onMouseEnter={() => onMeasurementHover?.(measurement.key)}
                onMouseLeave={() => onMeasurementHover?.(null)}
                onClick={() => {
                  handleMeasurementClick(measurement.key, config.measurements[measurement.key] || 0, labelPosition);
                }}
              />
              
              {/* Text label */}
              <text
                x={labelPosition.x}
                y={labelPosition.y}
                fontSize={compact ? "11" : (isMobile ? "16" : "12")}
                className={`font-semibold pointer-events-none select-none transition-all duration-200 ${
                  isHighlighted ? 'fill-red-600' : measurement.hasValue ? 'fill-emerald-600' : 'fill-slate-500'
                }`}
                textAnchor="middle"
                style={{ 
                  filter: 'drop-shadow(0 1px 2px rgba(255,255,255,0.8))'
                }}
              >
                {measurement.hasValue 
                  ? formatMeasurement(config.measurements[measurement.key], config.unit)
                  : measurement.key
                }
              </text>
              
              {/* Additional label for "adjust" mode to clarify measurement type */}
              {config.measurementOption === 'adjust' && measurement.hasValue && !compact && (
                <text
                  x={labelPosition.x}
                  y={labelPosition.y + (isMobile ? 18 : 14)}
                  fontSize={isMobile ? "11" : "9"}
                  className="fill-slate-500 pointer-events-none select-none font-medium"
                  textAnchor="middle"
                  style={{ 
                    filter: 'drop-shadow(0 1px 2px rgba(255,255,255,0.8))'
                  }}
                >
                  (fixing point to fixing point)
                </text>
              )}
            </g>
          </g>
        );
      })}

      {/* Diagonal lines */}
      {diagonalMeasurements.map((diagonal) => {
        const fromPoint = config.points[diagonal.from];
        const toPoint = config.points[diagonal.to];
        const isHighlighted = highlightedMeasurement === diagonal.key || editingMeasurementKey === diagonal.key;
        const labelPosition = getEdgeLabelPosition(fromPoint, toPoint, compact ? 25 : (isMobile ? 45 : 30));
        
        return (
          <g key={`diagonal-${diagonal.key}`}>
            <line
              x1={fromPoint.x}
              y1={fromPoint.y}
              x2={toPoint.x}
              y2={toPoint.y}
              stroke={isHighlighted ? "#EF4444" : diagonal.hasValue ? (selectedColor?.textColor || "#10B981") : (selectedColor?.textColor || "#F59E0B")}
              strokeWidth={isHighlighted ? "4" : diagonal.hasValue ? "3" : "2"}
              strokeDasharray="8,4"
              markerEnd={isHighlighted ? "url(#arrowhead-highlighted)" : diagonal.hasValue ? `url(#arrowhead-${selectedColor?.textColor === '#FFFFFF' ? 'white' : 'black'})` : "url(#arrowhead)"}
              className="transition-all duration-200"
              onMouseEnter={() => onMeasurementHover?.(diagonal.key)}
              onMouseLeave={() => onMeasurementHover?.(null)}
              style={{ cursor: readonly || !onMeasurementClick ? 'default' : 'pointer' }}
            />
            
            {/* Diagonal label with click area */}
            <g>
              {/* Invisible click area */}
              <rect
                x={labelPosition.x - rectWidth / 2}
                y={labelPosition.y - rectHeight / 2}
                width={rectWidth}
                height={rectHeight}
                fill="transparent"
                style={{ pointerEvents: 'all' }}
                className={readonly || !onMeasurementClick ? '' : 'cursor-pointer'}
                onMouseEnter={() => onMeasurementHover?.(diagonal.key)}
                onMouseLeave={() => onMeasurementHover?.(null)}
                onClick={() => {
                  handleMeasurementClick(diagonal.key, config.measurements[diagonal.key] || 0, labelPosition);
                }}
              />
              
              {/* Text label */}
              <text
                x={labelPosition.x}
                y={labelPosition.y}
                fontSize={compact ? "11" : (isMobile ? "16" : "12")}
                className={`font-semibold pointer-events-none select-none transition-all duration-200 ${
                  isHighlighted ? 'fill-red-600' : 'font-bold'
                }`}
                fill={isHighlighted ? "#EF4444" : (selectedColor?.textColor || "#F59E0B")}
                textAnchor="middle"
                style={{ 
                  filter: selectedColor?.textColor === '#FFFFFF' 
                    ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' 
                    : 'drop-shadow(0 1px 2px rgba(255,255,255,0.8))'
                }}
              >
                {diagonal.hasValue 
                  ? formatMeasurement(config.measurements[diagonal.key], config.unit)
                  : diagonal.key
                }
              </text>
            </g>
          </g>
        );
      })}

      {/* Editing input overlay */}
      {!forPdfCapture && editingMeasurementKey && editingPosition && (
        <foreignObject
          x={editingPosition.x - 35}
          y={editingPosition.y - (isMobile ? 12 : 10)}
          width="70"
          height={isMobile ? "24" : "20"}
        >
          <input
            type="number"
            value={editingValue || ''}
            onChange={(e) => onEditingValueChange?.(e.target.value)}
            onBlur={onEditCommit}
            onKeyDown={onEditKeyDown}
            autoFocus
            className="w-full h-full px-2 py-1 text-xs font-semibold text-center border-2 border-blue-500 rounded bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            width="600" 
            height="400" 
            min="0"
          />
        </foreignObject>
      )}

      {/* Turnbuckles - only show for "adjust to fit" option - drawn last to appear on top */}
      {config.measurementOption === 'adjust' && config.points.map((point, index) => {
        const sailAttachmentPoint = sailAttachmentPoints[index];

        // Calculate direction from corner to sail attachment point
        const dx = centroid.x - point.x;
        const dy = centroid.y - point.y;
        const length = Math.sqrt(dx * dx + dy * dy);

        if (length === 0) return null;

        const normalizedX = dx / length;
        const normalizedY = dy / length;

        // Start turnbuckle at edge of corner circle
        const lineStartX = point.x + normalizedX * cornerRadius;
        const lineStartY = point.y + normalizedY * cornerRadius;

        // End turnbuckle at sail attachment point
        const lineEndX = sailAttachmentPoint.x;
        const lineEndY = sailAttachmentPoint.y;

        return (
          <g key={`turnbuckle-${index}`}>
            {/* Turnbuckle line - red to indicate hardware connection */}
            <line
              x1={lineStartX}
              y1={lineStartY}
              x2={lineEndX}
              y2={lineEndY}
              stroke="#DC2626"
              strokeWidth={compact ? "2.5" : (isMobile ? "4.5" : "3.5")}
              strokeLinecap="round"
              className="drop-shadow-sm"
            />

            {/* Turnbuckle body (wider rectangle) */}
            <rect
              x={lineEndX - (compact ? 2.25 : (isMobile ? 4.5 : 3.75))}
              y={lineEndY - (compact ? 0.8 : (isMobile ? 1.5 : 1.2))}
              width={compact ? "4.5" : (isMobile ? "9" : "7.5")}
              height={compact ? "1.6" : (isMobile ? "3" : "2.4")}
              fill="#DC2626"
              stroke="#B91C1C"
              strokeWidth="0.5"
              rx="0.5"
              className="drop-shadow-sm"
            />
          </g>
        );
      })}

      {/* Custom children (e.g., corner points) */}
      {children}
    </svg>
  );
});
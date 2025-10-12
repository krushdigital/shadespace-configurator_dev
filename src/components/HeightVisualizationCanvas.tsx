import React from 'react';
import { ConfiguratorState } from '../types';
import { formatMeasurement } from '../utils/geometry';

interface HeightVisualizationCanvasProps {
  config: ConfiguratorState;
  compact?: boolean;
}

export function HeightVisualizationCanvas({ 
  config, 
  compact = false 
}: HeightVisualizationCanvasProps) {
  const height = compact ? 200 : 300;
  const viewBoxHeight = compact ? 300 : 400;
  
  // Calculate positions for anchor points in a side view
  const getAnchorPositions = () => {
    const positions = [];
    const spacing = 500 / (config.corners + 1); // Distribute points across width
    
    for (let i = 0; i < config.corners; i++) {
      const x = spacing * (i + 1);
      const groundY = viewBoxHeight - 50; // Ground level
      const anchorHeight = config.fixingHeights[i] || 0;
      
      // Scale height for visualization (max height = 200px on canvas)
      const maxHeightMM = Math.max(...config.fixingHeights.filter(h => h > 0), 3000);
      const scaledHeight = anchorHeight > 0 ? (anchorHeight / maxHeightMM) * 150 : 0;
      const anchorY = groundY - scaledHeight;
      
      positions.push({
        x,
        groundY,
        anchorY,
        height: anchorHeight,
        scaledHeight,
        label: String.fromCharCode(65 + i),
        type: config.fixingTypes?.[i] || 'post',
        orientation: config.eyeOrientations?.[i] || 'horizontal'
      });
    }
    
    return positions;
  };

  const anchorPositions = getAnchorPositions();

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden w-full">
      <div className={`relative w-full bg-gradient-to-b from-sky-100 to-green-100`} style={{ height: `${height}px` }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 600 ${viewBoxHeight}`}
          className="absolute inset-0"
          style={{ userSelect: 'none' }}
        >
          {/* SVG Markers for arrows */}
          <defs>
            <marker id="arrowUp" markerWidth="8" markerHeight="10" 
                    refX="4" refY="2" orient="auto">
              <polygon points="0 8, 4 0, 8 8" fill="#059669" />
            </marker>
            <marker id="arrowDown" markerWidth="8" markerHeight="10" 
                    refX="4" refY="8" orient="auto">
              <polygon points="0 0, 4 8, 8 0" fill="#059669" />
            </marker>
          </defs>

          {/* Ground line */}
          <line
            x1="50"
            y1={viewBoxHeight - 50}
            x2="550"
            y2={viewBoxHeight - 50}
            stroke="#8B5CF6"
            strokeWidth="3"
            strokeDasharray="5,5"
          />
          <text
            x="60"
            y={viewBoxHeight - 30}
            fontSize="12"
            className="fill-purple-700 font-medium"
          >
            Ground/Datum Level
          </text>

          {/* Anchor points and posts */}
          {anchorPositions.map((pos, index) => (
            <g key={index}>
              {/* Post/Building representation */}
              {pos.type === 'post' ? (
                // Angled Post (10-15 degree lean away from center)
                <g>
                  {/* Calculate angle - posts lean away from center */}
                  {(() => {
                    const centerX = 300;
                    const leanAngle = pos.x < centerX ? -12 : 12; // Lean away from center
                    const postWidth = 16;
                    const postHeight = pos.scaledHeight;
                    
                    // Calculate angled post coordinates
                    const angleRad = (leanAngle * Math.PI) / 180;
                    const topOffsetX = Math.sin(angleRad) * postHeight;
                    
                    return (
                      <>
                        {/* Main post body - angled */}
                        <polygon
                          points={`
                            ${pos.x - postWidth/2},${pos.groundY}
                            ${pos.x + postWidth/2},${pos.groundY}
                            ${pos.x + postWidth/2 + topOffsetX},${pos.anchorY}
                            ${pos.x - postWidth/2 + topOffsetX},${pos.anchorY}
                          `}
                          fill="#64748B"
                          stroke="#475569"
                          strokeWidth="1"
                        />
                        
                        {/* Post cap */}
                        <ellipse
                          cx={pos.x + topOffsetX}
                          cy={pos.anchorY}
                          rx="8"
                          ry="3"
                          fill="#475569"
                        />
                        
                        {/* Angle indicator line */}
                        <line
                          x1={pos.x}
                          y1={pos.groundY}
                          x2={pos.x}
                          y2={pos.anchorY}
                          stroke="#94A3B8"
                          strokeWidth="1"
                          strokeDasharray="2,2"
                          opacity="0.6"
                        />
                        
                        {/* Angle arc */}
                        <path
                          d={`M ${pos.x} ${pos.groundY - 30} A 30 30 0 0 ${leanAngle > 0 ? 1 : 0} ${pos.x + (leanAngle > 0 ? 15 : -15)} ${pos.groundY - 26}`}
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="2"
                        />
                        
                        {/* Angle text */}
                        <text
                          x={pos.x + (leanAngle > 0 ? 35 : -35)}
                          y={pos.groundY - 35}
                          fontSize="9"
                          className="fill-amber-600 font-semibold"
                          textAnchor="middle"
                        >
                          12°
                        </text>
                      </>
                    );
                  })()}
                </g>
              ) : (
                // Building (simplified wall representation)
                <g>
                  <rect
                    x={pos.x - 15}
                    y={pos.anchorY - 20}
                    width="30"
                    height={pos.scaledHeight + 20}
                    fill="#E2E8F0"
                    stroke="#94A3B8"
                    strokeWidth="2"
                    rx="3"
                  />
                  <rect
                    x={pos.x - 12}
                    y={pos.anchorY - 15}
                    width="24"
                    height="10"
                    fill="#CBD5E1"
                    rx="1"
                  />
                </g>
              )}

              {/* Anchor point (eye bolt) */}
              <circle
                cx={pos.type === 'post' ? (() => {
                  const centerX = 300;
                  const leanAngle = pos.x < centerX ? -12 : 12;
                  const angleRad = (leanAngle * Math.PI) / 180;
                  return pos.x + Math.sin(angleRad) * pos.scaledHeight;
                })() : pos.x}
                cy={pos.anchorY}
                r="6"
                fill="#EF4444"
                stroke="white"
                strokeWidth="2"
              />

              {/* Eye orientation indicator */}
              {pos.orientation === 'horizontal' ? (
                <ellipse
                  cx={pos.type === 'post' ? (() => {
                    const centerX = 300;
                    const leanAngle = pos.x < centerX ? -12 : 12;
                    const angleRad = (leanAngle * Math.PI) / 180;
                    return pos.x + Math.sin(angleRad) * pos.scaledHeight;
                  })() : pos.x}
                  cy={pos.anchorY}
                  rx="8"
                  ry="3"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="2"
                />
              ) : (
                <ellipse
                  cx={pos.type === 'post' ? (() => {
                    const centerX = 300;
                    const leanAngle = pos.x < centerX ? -12 : 12;
                    const angleRad = (leanAngle * Math.PI) / 180;
                    return pos.x + Math.sin(angleRad) * pos.scaledHeight;
                  })() : pos.x}
                  cy={pos.anchorY}
                  rx="3"
                  ry="8"
                  fill="none"
                  stroke="#DC2626"
                  strokeWidth="2"
                />
              )}

              {/* Height measurement line */}
              {pos.height > 0 && (
                <g>
                  <line
                    x1={pos.x + 40}
                    y1={pos.groundY}
                    x2={pos.x + 40}
                    y2={pos.anchorY}
                    stroke="#059669"
                    strokeWidth="2"
                    markerEnd="url(#arrowUp)"
                    markerStart="url(#arrowDown)"
                  />
                  <text
                    x={pos.x + 50}
                    y={(pos.groundY + pos.anchorY) / 2}
                    fontSize="11"
                    className="fill-emerald-700 font-semibold"
                    dominantBaseline="middle"
                  >
                    {formatMeasurement(pos.height, config.unit)}
                  </text>
                </g>
              )}

              {/* Corner label */}
              <text
                x={pos.type === 'post' ? (() => {
                  const centerX = 300;
                  const leanAngle = pos.x < centerX ? -12 : 12;
                  const angleRad = (leanAngle * Math.PI) / 180;
                  return pos.x + Math.sin(angleRad) * pos.scaledHeight;
                })() : pos.x}
                y={pos.anchorY - 15}
                fontSize="14"
                className="fill-slate-900 font-bold"
                textAnchor="middle"
                style={{ 
                  filter: 'drop-shadow(0 1px 2px rgba(255,255,255,0.8))'
                }}
              >
                {pos.label}
              </text>

              {/* Type label */}
              <text
                x={pos.x}
                y={pos.groundY + 25}
                fontSize="10"
                className="fill-slate-600 font-medium"
                textAnchor="middle"
              >
                {pos.type}
              </text>
            </g>
          ))}
        </svg>
      </div>
      
      {/* Legend moved outside and to the side */}
      {!compact && (
        <div className="mt-3 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-slate-600">Anchor points</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-500 rounded"></div>
              <span className="text-slate-600">Angled posts (12°)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-300 rounded border border-slate-400"></div>
              <span className="text-slate-600">Buildings</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-purple-600 border-dashed border-t-2"></div>
              <span className="text-slate-600">Ground/Datum Level</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-amber-600"></div>
              <span className="text-slate-600">Post lean angle</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-emerald-600"></div>
              <span className="text-slate-600">Height measurements</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
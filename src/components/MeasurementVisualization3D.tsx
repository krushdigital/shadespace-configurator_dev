import React, { useMemo } from 'react';

interface MeasurementVisualization3DProps {
  corners: number;
  measurementType: 'adjust' | 'exact' | null;
  fabricColor: string;
  isHovered?: boolean;
}

export function MeasurementVisualization3D({
  corners,
  measurementType,
  fabricColor,
  isHovered = false
}: MeasurementVisualization3DProps) {
  const shapePoints = useMemo(() => {
    const centerX = 200;
    const centerY = 200;
    const radius = 120;

    const points: Array<{ x: number; y: number; z: number }> = [];

    for (let i = 0; i < corners; i++) {
      const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
      points.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        z: 0
      });
    }

    return points;
  }, [corners]);

  const fixingPoints = useMemo(() => {
    return shapePoints.map(p => ({
      x: p.x,
      y: p.y,
      z: -20
    }));
  }, [shapePoints]);

  const sailPoints = useMemo(() => {
    if (measurementType === 'exact') {
      return shapePoints.map((p, i) => {
        const nextP = shapePoints[(i + 1) % shapePoints.length];
        const dx = nextP.x - p.x;
        const dy = nextP.y - p.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const inset = 15;

        return {
          x: p.x + (dx / length) * (inset / 2),
          y: p.y + (dy / length) * (inset / 2),
          z: 0
        };
      });
    }
    return shapePoints;
  }, [shapePoints, measurementType]);

  const measurementLines = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number; dashArray: string }> = [];

    if (measurementType === 'adjust') {
      for (let i = 0; i < fixingPoints.length; i++) {
        const p1 = fixingPoints[i];
        const p2 = fixingPoints[(i + 1) % fixingPoints.length];
        lines.push({
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          dashArray: '5,5'
        });
      }
    } else if (measurementType === 'exact') {
      for (let i = 0; i < sailPoints.length; i++) {
        const p1 = sailPoints[i];
        const p2 = sailPoints[(i + 1) % sailPoints.length];
        lines.push({
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          dashArray: '5,5'
        });
      }
    }

    return lines;
  }, [fixingPoints, sailPoints, measurementType]);

  const sailPath = useMemo(() => {
    if (sailPoints.length === 0) return '';
    return sailPoints.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ') + ' Z';
  }, [sailPoints]);

  const fixingPointsPath = useMemo(() => {
    if (fixingPoints.length === 0) return '';
    return fixingPoints.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ') + ' Z';
  }, [fixingPoints]);

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg overflow-hidden border border-slate-200">
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          perspective: '1000px',
          perspectiveOrigin: '50% 30%'
        }}
      >
        <svg
          width="400"
          height="400"
          viewBox="0 0 400 400"
          className="w-full h-full transition-transform duration-500"
          style={{
            transform: 'rotateX(45deg) rotateZ(0deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
              <feOffset dx="2" dy="4" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <g opacity="0.2">
            <circle cx="200" cy="320" r="140" fill="#94a3b8" />
          </g>

          {fixingPoints.map((point, i) => (
            <g key={`fixing-${i}`}>
              <line
                x1={point.x}
                y1={point.y}
                x2={point.x}
                y2={320}
                stroke="#64748b"
                strokeWidth="4"
                opacity="0.6"
              />
              <circle
                cx={point.x}
                cy={320}
                r="6"
                fill="#475569"
                opacity="0.8"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="#1e293b"
                stroke="#fff"
                strokeWidth="2"
              />
            </g>
          ))}

          <path
            d={sailPath}
            fill={fabricColor || '#caee41'}
            fillOpacity="0.7"
            stroke="#01312D"
            strokeWidth="2"
            filter="url(#shadow)"
          />

          {measurementType && measurementLines.map((line, i) => (
            <g key={`line-${i}`}>
              <line
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeDasharray={line.dashArray}
                opacity={isHovered ? 1 : 0}
                className="transition-opacity duration-300"
              />
              <circle
                cx={line.x1}
                cy={line.y1}
                r="4"
                fill="#ef4444"
                opacity={isHovered ? 1 : 0}
                className="transition-opacity duration-300"
              />
            </g>
          ))}

          {measurementType === 'adjust' && (
            <text
              x="200"
              y="380"
              textAnchor="middle"
              className="fill-slate-700 text-xs font-semibold"
              opacity={isHovered ? 1 : 0}
              style={{ transition: 'opacity 0.3s' }}
            >
              Fixing Point to Fixing Point
            </text>
          )}
          {measurementType === 'exact' && (
            <text
              x="200"
              y="380"
              textAnchor="middle"
              className="fill-slate-700 text-xs font-semibold"
              opacity={isHovered ? 1 : 0}
              style={{ transition: 'opacity 0.3s' }}
            >
              Sail Edge to Sail Edge
            </text>
          )}
        </svg>
      </div>

      <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 border border-slate-200">
        Elevated View
      </div>
    </div>
  );
}

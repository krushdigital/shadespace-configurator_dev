import React from 'react';

interface ShadeSail3DModelProps {
  corners: number;
  measurementType: 'space' | 'sail' | null;
  fabricColor: string;
}

export function ShadeSail3DModel({ corners, measurementType, fabricColor }: ShadeSail3DModelProps) {
  const getFixingPoints = () => {
    const radius = 120;
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i < corners; i++) {
      const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
      points.push({
        x: 200 + radius * Math.cos(angle),
        y: 200 + radius * Math.sin(angle)
      });
    }

    return points;
  };

  const getSailPolygon = () => {
    const radius = 90;
    const points: string[] = [];

    for (let i = 0; i < corners; i++) {
      const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
      const x = 200 + radius * Math.cos(angle);
      const y = 200 + radius * Math.sin(angle);
      points.push(`${x},${y}`);
    }

    return points.join(' ');
  };

  const fixingPoints = getFixingPoints();
  const sailColor = fabricColor || '#94C973';

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full"
      >
        <defs>
          <filter id="dropShadow">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.2"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <g className="scene">
          <polygon
            points={getSailPolygon()}
            fill={sailColor}
            fillOpacity="0.85"
            stroke="#307C31"
            strokeWidth="3"
            filter="url(#dropShadow)"
            style={{
              transition: 'all 0.4s ease-in-out',
              opacity: measurementType ? 1 : 0.5
            }}
          />

          {measurementType === 'space' && fixingPoints.map((point, index) => (
            <g key={`fixing-point-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="#64748b"
                stroke="#475569"
                strokeWidth="2"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="10"
                fill="#ef4444"
                stroke="white"
                strokeWidth="2.5"
                className="animate-pulse-subtle"
              />
              <text
                x={point.x}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="10"
                fontWeight="bold"
              >
                {String.fromCharCode(65 + index)}
              </text>
            </g>
          ))}

          {measurementType === 'sail' && (() => {
            const radius = 90;
            const sailPoints: { x: number; y: number }[] = [];

            for (let i = 0; i < corners; i++) {
              const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
              sailPoints.push({
                x: 200 + radius * Math.cos(angle),
                y: 200 + radius * Math.sin(angle)
              });
            }

            return sailPoints.map((point, index) => (
              <g key={`sail-point-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="9"
                  fill="#ef4444"
                  stroke="white"
                  strokeWidth="2.5"
                  className="animate-pulse-subtle"
                />
                <text
                  x={point.x}
                  y={point.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="9"
                  fontWeight="bold"
                >
                  {String.fromCharCode(65 + index)}
                </text>
              </g>
            ));
          })()}
        </g>
      </svg>

      {measurementType && (
        <div
          className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg shadow-md border-2 border-[#ef4444] animate-slide-in-left"
        >
          <p className="text-xs font-bold text-[#01312D] mb-0.5">
            {measurementType === 'space' ? 'Space Measurements' : 'Sail Dimensions'}
          </p>
          <p className="text-[10px] text-slate-600">
            {measurementType === 'space'
              ? 'Between fixing points'
              : 'Finished sail edges'}
          </p>
        </div>
      )}
    </div>
  );
}

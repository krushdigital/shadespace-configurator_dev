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
        y: 215 + radius * Math.sin(angle)
      });
    }

    return points;
  };

  const getSailPath = () => {
    const radius = 90;
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i < corners; i++) {
      const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
      const x = 200 + radius * Math.cos(angle);
      const y = 215 + radius * Math.sin(angle);
      points.push({ x, y });
    }

    if (points.length < 3) return '';

    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];

      const midX = (current.x + next.x) / 2;
      const midY = (current.y + next.y) / 2;

      const distance = Math.sqrt(Math.pow(next.x - current.x, 2) + Math.pow(next.y - current.y, 2));
      const curvature = Math.min(15, distance * 0.10);
      const angle = Math.atan2(next.y - current.y, next.x - current.x);
      const perpAngle = angle + Math.PI / 2;

      const controlX = midX + Math.cos(perpAngle) * curvature;
      const controlY = midY + Math.sin(perpAngle) * curvature;

      path += ` Q ${controlX},${controlY} ${next.x},${next.y}`;
    }

    return path;
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
          <path
            d={getSailPath()}
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

          {measurementType === 'space' && (() => {
            const sailRadius = 90;
            const sailPoints: { x: number; y: number }[] = [];
            for (let i = 0; i < corners; i++) {
              const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
              sailPoints.push({
                x: 200 + sailRadius * Math.cos(angle),
                y: 215 + sailRadius * Math.sin(angle)
              });
            }

            return fixingPoints.map((point, index) => {
              const sailPoint = sailPoints[index];
              const dx = point.x - sailPoint.x;
              const dy = point.y - sailPoint.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const turnbuckleLength = 12;
              const turnbuckleX = sailPoint.x + (dx / length) * (length / 2);
              const turnbuckleY = sailPoint.y + (dy / length) * (length / 2);

              return (
                <g key={`fixing-point-${index}`}>
                  {/* Tensioning line from sail corner to turnbuckle */}
                  <line
                    x1={sailPoint.x}
                    y1={sailPoint.y}
                    x2={turnbuckleX - (dx / length) * (turnbuckleLength / 2)}
                    y2={turnbuckleY - (dy / length) * (turnbuckleLength / 2)}
                    stroke="#64748b"
                    strokeWidth="2.5"
                    opacity="0.8"
                  />

                  {/* Turnbuckle representation */}
                  <g>
                    <rect
                      x={turnbuckleX - (turnbuckleLength / 2)}
                      y={turnbuckleY - 2.5}
                      width={turnbuckleLength}
                      height={5}
                      fill="#475569"
                      stroke="#1e293b"
                      strokeWidth="1"
                      rx="1"
                    />
                    <line
                      x1={turnbuckleX - 3}
                      y1={turnbuckleY - 2.5}
                      x2={turnbuckleX - 3}
                      y2={turnbuckleY + 2.5}
                      stroke="#94a3b8"
                      strokeWidth="0.5"
                    />
                    <line
                      x1={turnbuckleX + 3}
                      y1={turnbuckleY - 2.5}
                      x2={turnbuckleX + 3}
                      y2={turnbuckleY + 2.5}
                      stroke="#94a3b8"
                      strokeWidth="0.5"
                    />
                  </g>

                  {/* Tensioning line from turnbuckle to fixing point */}
                  <line
                    x1={turnbuckleX + (dx / length) * (turnbuckleLength / 2)}
                    y1={turnbuckleY + (dy / length) * (turnbuckleLength / 2)}
                    x2={point.x}
                    y2={point.y}
                    stroke="#64748b"
                    strokeWidth="2.5"
                    opacity="0.8"
                  />

                  {/* Corner hardware on sail */}
                  <g>
                    <circle
                      cx={sailPoint.x}
                      cy={sailPoint.y}
                      r="6"
                      fill="#475569"
                      stroke="#1e293b"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={sailPoint.x}
                      cy={sailPoint.y}
                      r="3"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1"
                    />
                  </g>

                  {/* Fixing point */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="8"
                    fill="#ef4444"
                    stroke="white"
                    strokeWidth="2.5"
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
              );
            });
          })()}

          {measurementType === 'sail' && (() => {
            const radius = 90;
            const sailPoints: { x: number; y: number }[] = [];

            for (let i = 0; i < corners; i++) {
              const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
              sailPoints.push({
                x: 200 + radius * Math.cos(angle),
                y: 215 + radius * Math.sin(angle)
              });
            }

            return sailPoints.map((point, index) => (
              <g key={`sail-point-${index}`}>
                {/* Corner hardware on sail */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  fill="#475569"
                  stroke="#1e293b"
                  strokeWidth="1.5"
                />
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1"
                />
                <text
                  x={point.x + 12}
                  y={point.y - 12}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#1e293b"
                  fontSize="11"
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

import React from 'react';

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface MeasurementLinesProps {
  measurementType: 'space' | 'sail';
  corners: number;
  isActive: boolean;
}

export function MeasurementLines({ measurementType, corners, isActive }: MeasurementLinesProps) {
  const getFixingPoints = (): Point3D[] => {
    const radius = 180;
    const points: Point3D[] = [];

    for (let i = 0; i < corners; i++) {
      const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
      points.push({
        x: 300 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle),
        z: 0
      });
    }

    return points;
  };

  const getSailPoints = (): Point3D[] => {
    const radius = 140;
    const points: Point3D[] = [];

    for (let i = 0; i < corners; i++) {
      const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
      points.push({
        x: 300 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle),
        z: 10
      });
    }

    return points;
  };

  const points = measurementType === 'space' ? getFixingPoints() : getSailPoints();

  const renderMeasurementLine = (start: Point3D, end: Point3D, index: number) => {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const distance = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));

    const measurementLabel = measurementType === 'space'
      ? `${Math.round(distance * 2)}mm (space)`
      : `${Math.round(distance * 2)}mm (sail)`;

    return (
      <g key={`line-${index}`} className={isActive ? 'animate-fade-in' : ''}>
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke="#ef4444"
          strokeWidth="3"
          strokeDasharray="8,8"
          strokeLinecap="round"
          className={isActive ? 'animate-dash' : ''}
          style={{
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isActive ? 1 : 0
          }}
        />

        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke="white"
          strokeWidth="6"
          opacity="0.3"
          style={{
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isActive ? 0.3 : 0
          }}
        />

        {isActive && (
          <>
            <circle
              cx={start.x}
              cy={start.y}
              r="6"
              fill="#ef4444"
              stroke="white"
              strokeWidth="2"
              className="animate-pulse-subtle"
            />
            <circle
              cx={end.x}
              cy={end.y}
              r="6"
              fill="#ef4444"
              stroke="white"
              strokeWidth="2"
              className="animate-pulse-subtle"
            />

            <g transform={`translate(${midX}, ${midY})`}>
              <rect
                x="-60"
                y="-15"
                width="120"
                height="30"
                fill="white"
                rx="6"
                stroke="#ef4444"
                strokeWidth="2"
                className="drop-shadow-lg"
              />
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#1e293b"
                fontSize="11"
                fontWeight="600"
                className="select-none"
              >
                {measurementLabel}
              </text>
            </g>
          </>
        )}
      </g>
    );
  };

  const renderArrow = (start: Point3D, end: Point3D, index: number) => {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const arrowSize = 10;

    return (
      <g key={`arrow-${index}`}>
        <polygon
          points={`0,0 ${-arrowSize},${arrowSize/2} ${-arrowSize},${-arrowSize/2}`}
          fill="#ef4444"
          transform={`translate(${end.x}, ${end.y}) rotate(${angle * 180 / Math.PI})`}
          style={{
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isActive ? 1 : 0
          }}
        />
      </g>
    );
  };

  return (
    <g className="measurement-lines">
      {points.map((point, index) => {
        const nextPoint = points[(index + 1) % points.length];
        return (
          <React.Fragment key={index}>
            {renderMeasurementLine(point, nextPoint, index)}
            {renderArrow(point, nextPoint, index)}
          </React.Fragment>
        );
      })}
    </g>
  );
}

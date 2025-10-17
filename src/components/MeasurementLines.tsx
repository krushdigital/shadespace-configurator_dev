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
  const getPoints = (): Point3D[] => {
    const radius = measurementType === 'space' ? 120 : 90;
    const points: Point3D[] = [];

    for (let i = 0; i < corners; i++) {
      const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
      points.push({
        x: 200 + radius * Math.cos(angle),
        y: 200 + radius * Math.sin(angle),
        z: 0
      });
    }

    return points;
  };

  const points = getPoints();

  const renderMeasurementLine = (start: Point3D, end: Point3D, index: number) => {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    return (
      <g key={`line-${index}`} className={isActive ? 'animate-fade-in' : ''}>
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke="white"
          strokeWidth="5"
          opacity="0.5"
          style={{
            transition: 'all 0.4s ease-in-out',
            opacity: isActive ? 0.5 : 0
          }}
        />

        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke="#ef4444"
          strokeWidth="2.5"
          strokeDasharray="6,6"
          strokeLinecap="round"
          style={{
            transition: 'all 0.4s ease-in-out',
            opacity: isActive ? 1 : 0
          }}
        />

        {/* Point on measurement line */}
        <circle
          cx={midX}
          cy={midY}
          r="4"
          fill="#ef4444"
          stroke="white"
          strokeWidth="1.5"
          style={{
            transition: 'opacity 0.4s ease-in-out',
            opacity: isActive ? 1 : 0
          }}
        />
      </g>
    );
  };

  const renderDiagonalLine = (start: Point3D, end: Point3D, key: string) => {
    return (
      <g key={key} className={isActive ? 'animate-fade-in' : ''}>
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke="white"
          strokeWidth="4"
          opacity="0.2"
          style={{
            transition: 'all 0.4s ease-in-out',
            opacity: isActive ? 0.2 : 0
          }}
        />

        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke="#ef4444"
          strokeWidth="2"
          strokeDasharray="6,6"
          strokeLinecap="round"
          style={{
            transition: 'all 0.4s ease-in-out',
            opacity: isActive ? 0.4 : 0
          }}
        />
      </g>
    );
  };


  return (
    <g className="measurement-lines">
      {/* Render diagonal lines first (behind edge lines) */}
      {points.map((point, index) => {
        return points.slice(index + 2, points.length - (index === 0 ? 1 : 0)).map((otherPoint, otherIndex) => {
          const actualOtherIndex = index + 2 + otherIndex;
          return renderDiagonalLine(point, otherPoint, `diagonal-${index}-${actualOtherIndex}`);
        });
      })}

      {/* Render edge measurement lines */}
      {points.map((point, index) => {
        const nextPoint = points[(index + 1) % points.length];
        return (
          <React.Fragment key={index}>
            {renderMeasurementLine(point, nextPoint, index)}
            {/* Point at each corner */}
            {isActive && (
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill="#ef4444"
                stroke="white"
                strokeWidth="2"
              />
            )}
          </React.Fragment>
        );
      })}
    </g>
  );
}

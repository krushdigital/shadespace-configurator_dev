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
    const radius = 120;
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

  const getSailPoints = (): Point3D[] => {
    const radius = 90;
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

  const points = measurementType === 'space' ? getFixingPoints() : getSailPoints();

  const renderMeasurementLine = (start: Point3D, end: Point3D, index: number) => {
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
          </React.Fragment>
        );
      })}
    </g>
  );
}

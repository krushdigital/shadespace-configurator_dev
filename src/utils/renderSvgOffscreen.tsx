import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfiguratorState, Point } from '../types';
import { ShadeSVGCore } from '../components/ShadeSVGCore';
import { getOutwardPosition, getSelectedColor } from './svgHelpers';
import { captureSvgToBase64Png } from './svgCapture';

function OffscreenSailSvg({ config }: { config: ConfiguratorState }) {
  const centroid = config.points.length > 0 ? {
    x: config.points.reduce((sum: number, p: Point) => sum + p.x, 0) / config.points.length,
    y: config.points.reduce((sum: number, p: Point) => sum + p.y, 0) / config.points.length
  } : { x: 300, y: 300 };

  return (
    <ShadeSVGCore
      config={config}
      readonly={true}
      compact={false}
      forPdfCapture={true}
      isMobile={false}
    >
      {config.points.map((point, index) => {
        const offset = 25;
        const labelPosition = getOutwardPosition(point, centroid, offset);
        const cornerColor = getSelectedColor(config.fabricType, config.fabricColor);
        const label = String.fromCharCode(65 + index);

        return (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r="10"
              fill={cornerColor}
              stroke="white"
              strokeWidth="3"
            />
            <text
              x={labelPosition.x}
              y={labelPosition.y}
              fontSize="16"
              fontWeight="bold"
              fill="#0f172a"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {label}
            </text>
          </g>
        );
      })}
    </ShadeSVGCore>
  );
}

export async function renderSailSvgOffscreen(
  config: ConfiguratorState,
  width: number = 800,
  height: number = 800
): Promise<string> {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '600px';
  container.style.height = '600px';
  document.body.appendChild(container);

  const root = createRoot(container);

  return new Promise((resolve, reject) => {
    root.render(
      <div style={{ width: '600px', height: '600px', position: 'relative' }}>
        <OffscreenSailSvg config={config} />
      </div>
    );

    setTimeout(async () => {
      try {
        const svgEl = container.querySelector('svg');
        if (!svgEl) {
          throw new Error('SVG element not found in offscreen render');
        }

        await new Promise(r => setTimeout(r, 500));

        const pngBase64 = await captureSvgToBase64Png(svgEl as SVGSVGElement, width, height);
        resolve(pngBase64);
      } catch (error) {
        reject(error);
      } finally {
        root.unmount();
        document.body.removeChild(container);
      }
    }, 1000);
  });
}

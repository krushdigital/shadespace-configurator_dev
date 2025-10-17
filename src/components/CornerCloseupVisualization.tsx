import React from 'react';

interface CornerCloseupVisualizationProps {
  measurementType: 'adjust' | 'exact' | null;
  fabricColor: string;
  isHovered?: boolean;
}

export function CornerCloseupVisualization({
  measurementType,
  fabricColor,
  isHovered = false
}: CornerCloseupVisualizationProps) {
  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg overflow-hidden border border-slate-200">
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          perspective: '800px',
          perspectiveOrigin: '50% 40%'
        }}
      >
        <svg
          width="400"
          height="300"
          viewBox="0 0 400 300"
          className="w-full h-full"
          style={{
            transform: 'rotateX(20deg)',
            transformStyle: 'preserve-3d'
          }}
        >
          <defs>
            <linearGradient id="metalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <filter id="hardwareShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="1" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.4"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="230" width="400" height="70" fill="#e2e8f0" opacity="0.3" />

          <line x1="80" y1="230" x2="80" y2="150" stroke="#475569" strokeWidth="6" opacity="0.7" />
          <rect x="70" y="220" width="20" height="20" fill="#334155" rx="2" />

          <g>
            <path
              d="M 80 150 L 280 100"
              stroke={fabricColor || '#caee41'}
              strokeWidth="20"
              fill="none"
              opacity="0.8"
            />
            <path
              d="M 80 150 L 280 100"
              stroke="#01312D"
              strokeWidth="2"
              fill="none"
              opacity="0.6"
            />
          </g>

          <g filter="url(#hardwareShadow)">
            <rect x="65" y="138" width="30" height="18" fill="url(#metalGradient)" rx="3" />
            <rect x="100" y="142" width="40" height="10" fill="url(#metalGradient)" rx="2" />
            <circle cx="145" cy="147" r="6" fill="url(#metalGradient)" stroke="#475569" strokeWidth="1.5" />
          </g>

          <circle cx="80" cy="150" r="10" fill="#1e293b" stroke="#fff" strokeWidth="2" />

          {measurementType === 'adjust' && (
            <>
              <line
                x1="80"
                y1="75"
                x2="280"
                y2="75"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeDasharray="5,5"
                opacity={isHovered ? 1 : 0}
                className="transition-all duration-300"
                style={{
                  transform: isHovered ? 'translateY(0)' : 'translateY(10px)',
                }}
              />
              <circle cx="80" cy="75" r="5" fill="#ef4444" opacity={isHovered ? 1 : 0} className="transition-opacity duration-300" />
              <circle cx="280" cy="75" r="5" fill="#ef4444" opacity={isHovered ? 1 : 0} className="transition-opacity duration-300" />

              <g opacity={isHovered ? 1 : 0} className="transition-opacity duration-300">
                <line x1="80" y1="75" x2="80" y2="150" stroke="#ef4444" strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
                <line x1="280" y1="75" x2="280" y2="100" stroke="#ef4444" strokeWidth="1" strokeDasharray="2,2" opacity="0.5" />
              </g>

              <text
                x="180"
                y="60"
                textAnchor="middle"
                className="fill-slate-700 text-sm font-bold"
                opacity={isHovered ? 1 : 0}
                style={{ transition: 'opacity 0.3s' }}
              >
                Fixing Point Distance
              </text>

              <g opacity={isHovered ? 1 : 0} className="transition-opacity duration-300">
                <rect x="125" y="155" width="100" height="30" fill="white" opacity="0.95" rx="4" />
                <text x="175" y="172" textAnchor="middle" className="fill-slate-600 text-xs font-medium">
                  Hardware
                </text>
                <text x="175" y="182" textAnchor="middle" className="fill-slate-500 text-xs">
                  Deduction Zone
                </text>
              </g>
            </>
          )}

          {measurementType === 'exact' && (
            <>
              <line
                x1="145"
                y1="130"
                x2="280"
                y2="100"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeDasharray="5,5"
                opacity={isHovered ? 1 : 0}
                className="transition-all duration-300"
                style={{
                  transform: isHovered ? 'translateY(0)' : 'translateY(-10px)',
                }}
              />
              <circle cx="145" cy="130" r="5" fill="#ef4444" opacity={isHovered ? 1 : 0} className="transition-opacity duration-300" />
              <circle cx="280" cy="100" r="5" fill="#ef4444" opacity={isHovered ? 1 : 0} className="transition-opacity duration-300" />

              <text
                x="210"
                y="105"
                textAnchor="middle"
                className="fill-slate-700 text-sm font-bold"
                opacity={isHovered ? 1 : 0}
                style={{ transition: 'opacity 0.3s' }}
              >
                Sail Edge Length
              </text>

              <g opacity={isHovered ? 1 : 0} className="transition-opacity duration-300">
                <rect x="125" y="155" width="100" height="30" fill="white" opacity="0.95" rx="4" />
                <text x="175" y="172" textAnchor="middle" className="fill-slate-600 text-xs font-medium">
                  Hardware
                </text>
                <text x="175" y="182" textAnchor="middle" className="fill-slate-500 text-xs">
                  Added Separately
                </text>
              </g>
            </>
          )}

          <circle cx="280" cy="100" r="8" fill="#1e293b" stroke="#fff" strokeWidth="2" />
        </svg>
      </div>

      <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-slate-700 border border-slate-200">
        Corner Detail
      </div>
    </div>
  );
}

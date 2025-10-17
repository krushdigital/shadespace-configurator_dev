import React from 'react';

interface ShadeSail3DModelProps {
  corners: number;
  measurementType: 'space' | 'sail' | null;
  fabricColor: string;
}

export function ShadeSail3DModel({ corners, measurementType, fabricColor }: ShadeSail3DModelProps) {
  const getFixingPosts = () => {
    const radius = 180;
    const posts: { x: number; y: number }[] = [];

    for (let i = 0; i < corners; i++) {
      const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
      posts.push({
        x: 300 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle)
      });
    }

    return posts;
  };

  const getSailPolygon = () => {
    const radius = 140;
    const points: string[] = [];

    for (let i = 0; i < corners; i++) {
      const angle = (i * 2 * Math.PI) / corners - Math.PI / 2;
      const x = 300 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);
      points.push(`${x},${y}`);
    }

    return points.join(' ');
  };

  const getBuildingWall = () => {
    return {
      x: 100,
      y: 100,
      width: 400,
      height: 8
    };
  };

  const posts = getFixingPosts();
  const wall = getBuildingWall();
  const sailColor = fabricColor || '#94C973';

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox="0 0 600 600"
        className="w-full h-full"
        style={{
          filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))'
        }}
      >
        <defs>
          <linearGradient id="wallGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          <linearGradient id="postGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          <linearGradient id="sailGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={sailColor} stopOpacity="0.9" />
            <stop offset="50%" stopColor={sailColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor={sailColor} stopOpacity="0.85" />
          </linearGradient>

          <filter id="shadow">
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

          <pattern id="fabricTexture" patternUnits="userSpaceOnUse" width="20" height="20">
            <rect width="20" height="20" fill={sailColor} opacity="0.1"/>
            <line x1="0" y1="0" x2="20" y2="20" stroke={sailColor} strokeWidth="0.5" opacity="0.1"/>
            <line x1="20" y1="0" x2="0" y2="20" stroke={sailColor} strokeWidth="0.5" opacity="0.1"/>
          </pattern>
        </defs>

        <g className="scene" transform="translate(0, 50)">
          <rect
            x={wall.x}
            y={wall.y}
            width={wall.width}
            height={wall.height}
            fill="url(#wallGradient)"
            rx="2"
          />

          <rect
            x={wall.x}
            y={wall.y + wall.height}
            width={wall.width}
            height="3"
            fill="#475569"
            opacity="0.4"
          />

          {posts.map((post, index) => (
            <g key={`post-${index}`}>
              <ellipse
                cx={post.x}
                cy={post.y + 140}
                rx="18"
                ry="6"
                fill="#1e293b"
                opacity="0.2"
              />

              <rect
                x={post.x - 8}
                y={post.y}
                width="16"
                height="140"
                fill="url(#postGradient)"
                rx="2"
                filter="url(#shadow)"
              />

              {measurementType === 'space' && (
                <>
                  <circle
                    cx={post.x}
                    cy={post.y}
                    r="12"
                    fill="#ef4444"
                    stroke="white"
                    strokeWidth="2"
                    className="animate-pulse-subtle"
                  />
                  <text
                    x={post.x}
                    y={post.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {String.fromCharCode(65 + index)}
                  </text>
                </>
              )}
            </g>
          ))}

          <polygon
            points={getSailPolygon()}
            fill="url(#sailGradient)"
            stroke="#307C31"
            strokeWidth="2"
            filter="url(#shadow)"
            style={{
              transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: measurementType ? 'scale(1)' : 'scale(0.95)',
              transformOrigin: 'center',
              opacity: measurementType ? 1 : 0.6
            }}
          />

          <polygon
            points={getSailPolygon()}
            fill="url(#fabricTexture)"
            pointerEvents="none"
          />

          {measurementType === 'sail' && posts.map((post, index) => {
            const radius = 140;
            const angle = (index * 2 * Math.PI) / corners - Math.PI / 2;
            const sailX = 300 + radius * Math.cos(angle);
            const sailY = 300 + radius * Math.sin(angle);

            return (
              <g key={`sail-point-${index}`}>
                <circle
                  cx={sailX}
                  cy={sailY}
                  r="10"
                  fill="#ef4444"
                  stroke="white"
                  strokeWidth="2"
                  className="animate-pulse-subtle"
                />
                <text
                  x={sailX}
                  y={sailY}
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
          })}
        </g>

        <g className="ground">
          <ellipse
            cx="300"
            cy="520"
            rx="250"
            ry="40"
            fill="#1e293b"
            opacity="0.1"
          />
        </g>
      </svg>

      {measurementType && (
        <div
          className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border-2 border-[#ef4444] animate-slide-in-left"
        >
          <p className="text-sm font-bold text-[#01312D] mb-1">
            {measurementType === 'space' ? 'Space Measurements' : 'Sail Dimensions'}
          </p>
          <p className="text-xs text-slate-600">
            {measurementType === 'space'
              ? 'Between fixing points'
              : 'Finished sail edges'}
          </p>
        </div>
      )}
    </div>
  );
}

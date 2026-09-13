import React from 'react';

/**
 * Animated placeholder shown in the viewer panel until a shape is chosen.
 * Pure CSS/SVG loop (9 s). No props, no state, no dependencies.
 *
 * Usage:
 *   {config.shapeType ? <ShadeSail3DViewer ... /> : <SailBuildPlaceholder />}
 */
const KEYFRAMES = `
@keyframes sbp-scene { 0%, 90% { opacity: 1; } 97%, 100% { opacity: 0; } }
@keyframes sbp-ground { 0%, 2% { stroke-dashoffset: 190; } 10%, 100% { stroke-dashoffset: 0; } }
@keyframes sbp-post1 { 0%, 6% { transform: scaleY(0); } 13%, 100% { transform: scaleY(1); } }
@keyframes sbp-post2 { 0%, 10% { transform: scaleY(0); } 17%, 100% { transform: scaleY(1); } }
@keyframes sbp-post3 { 0%, 14% { transform: scaleY(0); } 21%, 100% { transform: scaleY(1); } }
@keyframes sbp-post4 { 0%, 18% { transform: scaleY(0); } 25%, 100% { transform: scaleY(1); } }
@keyframes sbp-pt1 { 0%, 24% { transform: scale(0); } 28% { transform: scale(1.5); } 30%, 100% { transform: scale(1); } }
@keyframes sbp-pt2 { 0%, 26% { transform: scale(0); } 30% { transform: scale(1.5); } 32%, 100% { transform: scale(1); } }
@keyframes sbp-pt3 { 0%, 28% { transform: scale(0); } 32% { transform: scale(1.5); } 34%, 100% { transform: scale(1); } }
@keyframes sbp-pt4 { 0%, 30% { transform: scale(0); } 34% { transform: scale(1.5); } 36%, 100% { transform: scale(1); } }
@keyframes sbp-edges { 0%, 34% { stroke-dashoffset: 190; } 50%, 100% { stroke-dashoffset: 0; } }
@keyframes sbp-sail { 0%, 48% { fill-opacity: 0; fill: #E7F2EA; } 56%, 62% { fill-opacity: 0.95; fill: #E7F2EA; } 68% { fill: #1F4A34; } 74% { fill: #2b62c9; } 80% { fill: #e4531a; } 86%, 100% { fill: #1F4A34; fill-opacity: 0.95; } }
@keyframes sbp-chipSize { 0%, 5% { background: rgba(255,255,255,0.1); color: #9fc4ad; } 8%, 30% { background: #b5e853; color: #01312d; } 34%, 100% { background: rgba(255,255,255,0.1); color: #9fc4ad; } }
@keyframes sbp-chipShape { 0%, 32% { background: rgba(255,255,255,0.1); color: #9fc4ad; } 35%, 49% { background: #b5e853; color: #01312d; } 53%, 100% { background: rgba(255,255,255,0.1); color: #9fc4ad; } }
@keyframes sbp-chipFabric { 0%, 50% { background: rgba(255,255,255,0.1); color: #9fc4ad; } 53%, 61% { background: #b5e853; color: #01312d; } 65%, 100% { background: rgba(255,255,255,0.1); color: #9fc4ad; } }
@keyframes sbp-chipColor { 0%, 62% { background: rgba(255,255,255,0.1); color: #9fc4ad; } 65%, 86% { background: #b5e853; color: #01312d; } 90%, 100% { background: rgba(255,255,255,0.1); color: #9fc4ad; } }
`;

const SAIL_PATH = 'M11.9,29.1 Q48.6,36.1 85.3,37.1 Q85.1,42.4 92.9,47.6 Q54.5,49.6 16,57.5 Q18,43.3 11.9,29.1 Z';
const post = (n: number, origin: string): React.CSSProperties => ({ transformBox: 'fill-box', transformOrigin: origin, animation: `sbp-post${n} 9s cubic-bezier(.2,.8,.2,1) infinite` });
const pt = (n: number): React.CSSProperties => ({ transformBox: 'fill-box', transformOrigin: '50% 50%', animation: `sbp-pt${n} 9s ease-out infinite` });
const chip = (name: string): React.CSSProperties => ({ fontSize: 12, fontWeight: 700, borderRadius: 999, padding: '5px 11px', background: 'rgba(255,255,255,0.1)', color: '#9fc4ad', animation: `sbp-chip${name} 9s ease-in-out infinite` });

export default function SailBuildPlaceholder() {
  return (
    <div style={{ background: '#01312d', color: '#fff', borderRadius: 16, padding: '22px 22px 20px', display: 'flex', flexDirection: 'column', gap: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{KEYFRAMES}</style>
      <div style={{ background: 'radial-gradient(ellipse at 50% 60%, rgba(181,232,83,0.14), rgba(181,232,83,0) 65%)', borderRadius: 12 }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', display: 'block' }} aria-hidden="true">
          <g style={{ animation: 'sbp-scene 9s ease-in-out infinite' }}>
            <polygon points="14.8,63.4 83.4,61.4 89.6,87.2 18.3,85.2" fill="none" stroke="#5f8f74" strokeWidth={1.2} strokeLinejoin="round" style={{ strokeDasharray: 190, animation: 'sbp-ground 9s ease-in-out infinite' }} />
            <line x1={14.8} y1={63.4} x2={11.9} y2={29.1} stroke="#b5e853" strokeWidth={2.5} strokeLinecap="round" style={post(1, '100% 100%')} />
            <line x1={83.4} y1={61.4} x2={85.3} y2={37.1} stroke="#b5e853" strokeWidth={2.5} strokeLinecap="round" style={post(2, '0% 100%')} />
            <line x1={89.6} y1={87.2} x2={92.9} y2={47.6} stroke="#b5e853" strokeWidth={2.5} strokeLinecap="round" style={post(3, '0% 100%')} />
            <line x1={18.3} y1={85.2} x2={16} y2={57.5} stroke="#b5e853" strokeWidth={2.5} strokeLinecap="round" style={post(4, '100% 100%')} />
            <path d={SAIL_PATH} stroke="none" style={{ animation: 'sbp-sail 9s ease-in-out infinite' }} />
            <path d={SAIL_PATH} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinejoin="round" style={{ strokeDasharray: 190, animation: 'sbp-edges 9s ease-in-out infinite' }} />
            <circle cx={11.9} cy={29.1} r={3.6} fill="#01312d" stroke="#fff" strokeWidth={2} style={pt(1)} />
            <circle cx={85.3} cy={37.1} r={3.6} fill="#01312d" stroke="#fff" strokeWidth={2} style={pt(2)} />
            <circle cx={92.9} cy={47.6} r={3.6} fill="#01312d" stroke="#fff" strokeWidth={2} style={pt(3)} />
            <circle cx={16} cy={57.5} r={3.6} fill="#01312d" stroke="#fff" strokeWidth={2} style={pt(4)} />
          </g>
        </svg>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>Your shade sail builds here</div>
        <div style={{ fontSize: 14, color: '#cfe3d4', lineHeight: 1.5, marginTop: 6 }}>Every choice you make appears in this preview as you go. Choose a shape to see your sail.</div>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={chip('Size')}>Size</div>
        <div style={chip('Shape')}>Shape</div>
        <div style={chip('Fabric')}>Fabric</div>
        <div style={chip('Color')}>Color</div>
      </div>
    </div>
  );
}

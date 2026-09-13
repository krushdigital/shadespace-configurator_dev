import React from 'react';
import MeasureComparison, { Shape } from './steps/MeasureComparison';

/** Presentation-only replacement for the existing switch confirmation modal. Wire the callbacks to the existing handlers; no logic lives here.
 *  direction "toCustom": fixed → custom.  "toFixed": custom → fixed.
 *  shape: the user's current fixed shape (or the target fixed shape when switching back; 'square' for 4 points, 'triangle' for 3). */
type Props = { open: boolean; direction: 'toCustom' | 'toFixed'; shape: Shape; hasMeasurements: boolean; onStartFresh: () => void; onKeep: () => void; onCancel: () => void };

const C = { green: '#01312d', mid: '#2e7d4f', soft: '#eef5ef', border: '#dfe7e1', muted: '#6b8478', text: '#4c6b60', lime: '#b5e853' };
const SAIL = { title: 'Measure the sail', sub: 'Along the fabric edge' };
const POSTS = { title: 'Measure the fixing points', sub: 'Post to post, or wall to wall' };

function Panel({ tag, after, shape, mode }: { tag: string; after?: boolean; shape: Shape; mode: 'sail' | 'posts' }) {
  const copy = mode === 'sail' ? SAIL : POSTS;
  return (
    <div style={{ border: `2px solid ${after ? C.mid : C.border}`, background: after ? C.soft : '#fff', borderRadius: 16, padding: 'clamp(10px, 3vw, 14px) clamp(8px, 2.5vw, 12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: after ? C.mid : C.muted, letterSpacing: '0.12em' }}>{tag}</div>
      <MeasureComparison shape={shape} mode={mode} className="sw-svg" />
      <div style={{ fontSize: 'clamp(13px, 3.8vw, 15px)', fontWeight: 800, textAlign: 'center', lineHeight: 1.25, textWrap: 'balance' } as React.CSSProperties}>{copy.title}</div>
      <div style={{ fontSize: 'clamp(11px, 3.3vw, 13px)', color: C.text, textAlign: 'center', lineHeight: 1.35 }}>{copy.sub}</div>
    </div>
  );
}

/** Reusable explainer strip — also drop under the custom "How to measure" animation and on Review (custom only). */
export function WeDoTheMaths({ dark = false, title = 'You measure the space. We do the maths.', guarantee = 'Fit Guarantee: if it doesn\u2019t fit perfectly, we replace it.' }: { dark?: boolean; title?: string; guarantee?: string }) {
  const fg = dark ? '#fff' : C.green, body = dark ? '#cfe3d4' : '#23503f';
  const Row = ({ children }: { children: React.ReactNode }) => <div style={{ display: 'flex', gap: 10 }}><span style={{ color: C.lime, fontWeight: 800 }}>✓</span><span>{children}</span></div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: dark ? C.green : C.soft, color: fg, borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, lineHeight: 1.4, color: body }}>
        <Row>We deduct the length of the hardware you pick for <strong style={{ color: fg }}>each corner</strong></Row>
        <Row>We allow for the stretch of <strong style={{ color: fg }}>your chosen fabric</strong></Row>
        <Row>Your sail arrives sized to pull up <strong style={{ color: fg }}>snug and tight</strong></Row>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: dark ? C.lime : C.mid, marginTop: 2 }}>{guarantee}</div>
    </div>
  );
}

export default function SwitchModeModal({ open, direction, shape, hasMeasurements, onStartFresh, onKeep, onCancel }: Props) {
  if (!open) return null;
  const toCustom = direction === 'toCustom';
  const btn: React.CSSProperties = { borderRadius: 14, padding: 15, fontWeight: 700, fontSize: 16, textAlign: 'center', cursor: 'pointer', border: 0, width: '100%', fontFamily: 'inherit' };
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(1,49,45,0.72)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" style={{ background: '#fff', borderRadius: 20, width: 'min(520px, 100%)', maxHeight: '100%', overflow: 'auto', boxSizing: 'border-box', padding: 'clamp(18px, 5vw, 24px) clamp(16px, 5vw, 24px) 18px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 30px 80px rgba(0,0,0,0.35)', position: 'relative', color: C.green, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <button onClick={onCancel} aria-label="Close" style={{ position: 'absolute', top: 14, right: 14, width: 40, height: 40, borderRadius: '50%', border: `2px solid ${C.border}`, background: '#fff', fontSize: 22, cursor: 'pointer', color: C.muted }}>×</button>
        <div>
          <div style={{ fontSize: 'clamp(19px, 5.5vw, 22px)', fontWeight: 800, letterSpacing: '-0.02em', paddingRight: 52, lineHeight: 1.15 }}>{toCustom ? 'Switch to custom made-to-measure?' : 'Switch to standard shape and size?'}</div>
          <div style={{ fontSize: 15, color: C.text, marginTop: 8, lineHeight: 1.45 }}>Same sail. Only <strong>where you measure</strong> changes.</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 20px minmax(0,1fr)', gap: 4, alignItems: 'center' }}>
          <Panel tag="NOW" shape={shape} mode={toCustom ? 'sail' : 'posts'} />
          <div style={{ textAlign: 'center', fontSize: 20, color: C.muted }}>→</div>
          <Panel tag="AFTER" after shape={shape} mode={toCustom ? 'posts' : 'sail'} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontSize: 13, color: C.text }}><span style={{ display: 'inline-block', width: 18, height: 5, borderRadius: 3, background: C.lime, flexShrink: 0 }} />The green tape shows where to measure</div>
        {toCustom && <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: C.soft, borderRadius: 12, padding: '12px 14px', fontSize: 14, lineHeight: 1.45, color: '#23503f' }}><span style={{ color: C.mid, fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>✓</span><span>We work out the exact sail size for your hardware and fabric so it pulls up snug and tight. <strong style={{ color: C.green }}>If it doesn’t fit, we replace it.</strong></span></div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={onStartFresh} style={{ ...btn, background: C.green, color: '#fff' }}>Start fresh</button>
          {hasMeasurements && <button onClick={onKeep} style={{ ...btn, background: '#fff', color: C.green, border: `2px solid ${C.green}`, padding: 13 }}>Keep my measurements</button>}
          <button onClick={onCancel} style={{ ...btn, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: 15, padding: 6 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

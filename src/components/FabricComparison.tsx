import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowRight, ArrowLeft, ChevronLeft, ChevronRight, Check, GitCompare } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Fabric, FabricSpec } from '../types';

type ViewKey = 'lifestyle' | 'swatch' | 'macro';

const VIEW_LABELS: Record<ViewKey, string> = {
  lifestyle: 'In Use',
  swatch: 'Swatch',
  macro: 'Macro',
};

const VIEW_BADGE: Record<ViewKey, string> = {
  lifestyle: 'Lifestyle',
  swatch: '20 cm',
  macro: '10x',
};

const VIEW_SUBTITLE: Record<ViewKey, string> = {
  lifestyle: 'As a shade sail',
  swatch: '~20 cm away',
  macro: 'Microscopic close-up',
};

const COMPARE_VIEWS: ViewKey[] = ['macro', 'lifestyle', 'swatch'];

interface FabricComparisonProps {
  fabrics: Fabric[];
  open: boolean;
  onClose: () => void;
  initialFabricId?: string;
  onSelectFabric?: (fabricId: string) => void;
}

interface FabricData extends Fabric {
  _images: Record<ViewKey, string>;
  _specs: FabricSpec[];
  _chip: string;
  _short: string;
}

function enrich(f: Fabric): FabricData {
  const swatch = f.imageSwatchUrl || f.colors?.[0]?.imageUrl || '';
  return {
    ...f,
    _images: {
      lifestyle: f.imageLifestyleUrl || swatch,
      swatch,
      macro: f.imageMacroUrl || swatch,
    },
    _specs: (f.specExtras && f.specExtras.length > 0)
      ? f.specExtras
      : [
          { label: 'Weight', value: `${f.weightPerSqm} GSM`, numeric: f.weightPerSqm, higherBetter: true },
          { label: 'UV Block', value: f.uvProtection, numeric: parseFloat(f.uvProtection) || 0, higherBetter: true },
          { label: 'Warranty', value: `${f.warrantyYears} years`, numeric: f.warrantyYears, higherBetter: true, featured: true },
        ],
    _chip: f.chipColor || '#307C31',
    _short: f.shortName || f.label,
  };
}

export function FabricComparison({ fabrics, open, onClose, initialFabricId, onSelectFabric }: FabricComparisonProps) {
  const data = useMemo(() => fabrics.map(enrich), [fabrics]);
  const [currentId, setCurrentId] = useState<string>(initialFabricId || data[0]?.id || '');
  const [mode, setMode] = useState<'single' | 'compare'>('single');
  const [compareId, setCompareId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewKey>('lifestyle');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (open && initialFabricId) {
      setCurrentId(initialFabricId);
      setMode('single');
      setCompareId(null);
      setShowPicker(false);
      setActiveView('lifestyle');
    }
  }, [open, initialFabricId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useBodyScrollLock(open);

  if (!open) return null;

  const current = data.find(f => f.id === currentId) || data[0];
  if (!current) return null;
  const compareWith = compareId ? data.find(f => f.id === compareId) : null;

  const switchFabric = (id: string) => {
    setCurrentId(id);
    setMode('single');
    setCompareId(null);
    setShowPicker(false);
    setActiveView('lifestyle');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-stretch md:items-center justify-center bg-black/70 md:p-5"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-[1100px] h-[100dvh] md:h-auto md:max-h-[92vh] overflow-hidden md:rounded-xl bg-white shadow-2xl flex flex-col">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2 right-2 md:top-3 md:right-3 z-30 w-8 h-8 md:w-9 md:h-9 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center hover:rotate-90 transition-transform"
        >
          <X className="w-4 h-4 text-[#01312D]" />
        </button>

        {mode === 'single' ? (
          <SingleView
            current={current}
            data={data}
            activeView={activeView}
            setActiveView={setActiveView}
            onSwitch={switchFabric}
            onSelectFabric={onSelectFabric}
            onClose={onClose}
            showPicker={showPicker}
            setShowPicker={setShowPicker}
            onCompare={(otherId) => {
              setCompareId(otherId);
              setMode('compare');
            }}
          />
        ) : compareWith ? (
          <CompareView
            a={current}
            b={compareWith}
            onBack={() => { setMode('single'); setCompareId(null); }}
          />
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

// ===== Single fabric view =====

interface SingleViewProps {
  current: FabricData;
  data: FabricData[];
  activeView: ViewKey;
  setActiveView: (v: ViewKey) => void;
  onSwitch: (id: string) => void;
  onSelectFabric?: (id: string) => void;
  onClose: () => void;
  showPicker: boolean;
  setShowPicker: (v: boolean) => void;
  onCompare: (otherId: string) => void;
}

function SingleView({ current, data, activeView, setActiveView, onSwitch, onSelectFabric, onClose, showPicker, setShowPicker, onCompare }: SingleViewProps) {
  const others = data.filter(d => d.id !== current.id);
  const heroSrc = current._images[activeView];
  const featured = current._specs.find(s => s.featured);
  const regular = current._specs.filter(s => !s.featured).slice(0, 4);

  return (
    <div className="flex flex-col md:grid md:grid-cols-[1.05fr_1fr] overflow-hidden h-full min-h-0">
      {/* Fabric tabs - top on mobile */}
      <div className="md:hidden sticky top-0 z-20 px-3 pt-3 pb-2 pr-9 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="flex gap-1 p-1 bg-[#F3FFE3] rounded-full overflow-x-auto snap-x flex-nowrap scroll-pl-1 scroll-pr-2">
          {data.map(f => (
            <button
              key={f.id}
              onClick={() => onSwitch(f.id)}
              className={`snap-start flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                f.id === current.id
                  ? 'bg-[#01312D] text-white font-semibold'
                  : 'text-[#01312D]/70'
              }`}
            >
              <span className="w-2 h-2 rounded-sm border border-black/10 flex-shrink-0" style={{ background: f._chip }} />
              {f._short}
            </button>
          ))}
        </div>
      </div>

      {/* Left: hero + thumbnails */}
      <div className="bg-[#F3FFE3]/60 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 flex items-center justify-center p-2 md:p-4">
          <img
            key={heroSrc}
            src={heroSrc}
            alt={`${current.label} ${VIEW_LABELS[activeView]}`}
            className="w-full max-h-[32vh] md:max-h-[60vh] object-cover rounded-lg md:rounded-xl transition-opacity duration-200"
          />
        </div>
        {/* Compact pill-style view switcher on mobile */}
        <div className="md:hidden px-3 pb-2">
          <div className="flex gap-1 p-1 bg-white rounded-full border border-slate-200">
            {(['lifestyle', 'swatch', 'macro'] as ViewKey[]).map(v => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                className={`flex-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                  activeView === v ? 'bg-[#01312D] text-white' : 'text-[#01312D]/70'
                }`}
              >
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
        </div>
        {/* Full thumbnails on desktop */}
        <div className="hidden md:grid grid-cols-3 gap-2 p-3">
          {(['lifestyle', 'swatch', 'macro'] as ViewKey[]).map(v => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`p-2 rounded-lg border-2 transition-all bg-white ${
                activeView === v ? 'border-[#307C31] shadow-sm' : 'border-transparent hover:border-gray-200'
              }`}
            >
              <img
                src={current._images[v]}
                alt={`${current.label} ${VIEW_LABELS[v]}`}
                className="w-full aspect-square object-cover rounded"
              />
              <div className="text-[11px] font-medium text-center mt-1 text-[#01312D]">{VIEW_LABELS[v]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: details */}
      <div className="px-4 pt-3 pb-24 md:p-7 md:pb-7 overflow-y-auto overscroll-contain flex flex-col min-h-0 flex-1">
        {/* Fabric tabs - desktop */}
        <div className="hidden md:block sticky top-0 z-20 -mx-7 -mt-7 px-7 pt-7 pb-3 mb-4 pr-12 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
          <div className="flex gap-1 p-1 bg-[#F3FFE3] rounded-full overflow-x-auto snap-x flex-nowrap">
            {data.map(f => (
              <button
                key={f.id}
                onClick={() => onSwitch(f.id)}
                className={`snap-start flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                  f.id === current.id
                    ? 'bg-[#01312D] text-white font-semibold'
                    : 'text-[#01312D]/70 hover:text-[#01312D]'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-sm border border-black/10 flex-shrink-0" style={{ background: f._chip }} />
                {f._short}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div className="flex items-baseline gap-2 flex-wrap mb-1 min-w-0">
          <h3 className="text-lg md:text-2xl lg:text-3xl font-bold text-[#01312D] leading-tight break-words">
            {current._short}
          </h3>
          {current.tag && (
            <span className="text-[11px] md:text-xs font-medium text-[#01312D]/60 bg-[#F3FFE3] px-2 py-0.5 rounded">
              {current.tag}
            </span>
          )}
          {current.isFireRetardant && (
            <span className="bg-orange-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded shadow-sm">
              FR
            </span>
          )}
        </div>
        {current.tagline && (
          <p className="italic text-[#01312D] text-sm md:text-base mb-2 md:mb-3">{current.tagline}</p>
        )}
        {current.description && (
          <p className="text-[#01312D]/70 text-xs md:text-sm leading-relaxed mb-3 md:mb-4">{current.description}</p>
        )}

        {/* Spec list: single column slim rows on mobile, grid on desktop */}
        <div className="bg-[#F3FFE3] rounded-xl p-2 md:p-3 mb-3 md:mb-4 md:grid md:grid-cols-2 md:gap-1.5 divide-y divide-white md:divide-y-0">
          {regular.map(s => (
            <div key={s.label} className="flex items-center justify-between px-2 md:px-3 py-1.5 md:py-2 rounded-md">
              <span className="text-[10px] md:text-[11px] uppercase tracking-wider font-semibold text-[#01312D]/60">{s.label}</span>
              <span className="text-xs md:text-sm font-bold text-[#01312D]">{s.value}</span>
            </div>
          ))}
          {featured && (
            <div className="md:col-span-2 flex items-center justify-between px-3 py-2 md:py-2.5 rounded-md bg-[#01312D] text-white mt-1 md:mt-0">
              <span className="text-[10px] md:text-[11px] uppercase tracking-wider font-semibold text-white/70">{featured.label}</span>
              <span className="text-sm md:text-base font-bold">{featured.value}</span>
            </div>
          )}
        </div>

        {/* Best for */}
        {current.bestFor && current.bestFor.length > 0 && (
          <>
            <div className="text-[10px] md:text-[11px] uppercase tracking-wider font-bold text-[#01312D]/60 mb-1.5 md:mb-2">Best for</div>
            <ul className="space-y-1 md:space-y-1.5 mb-3 md:mb-4">
              {current.bestFor.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-xs md:text-sm text-[#01312D]">
                  <Check className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#307C31] mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Highlights */}
        {current.highlights && current.highlights.length > 0 && (
          <>
            <div className="text-[10px] md:text-[11px] uppercase tracking-wider font-bold text-[#01312D]/60 mb-1.5 md:mb-2">Highlights</div>
            <ul className="list-disc pl-5 space-y-0.5 md:space-y-1 mb-3 md:mb-4 marker:text-[#307C31]">
              {current.highlights.map((h, i) => (
                <li key={i} className="text-xs md:text-sm text-[#01312D]">{h}</li>
              ))}
            </ul>
          </>
        )}

        {showPicker && others.length > 0 && (
          <div className="p-3 bg-[#F3FFE3] rounded-xl mb-3">
            <div className="text-xs md:text-sm font-semibold text-[#01312D] mb-2">Compare against:</div>
            <div className="flex flex-wrap gap-2">
              {others.map(o => (
                <button
                  key={o.id}
                  onClick={() => onCompare(o.id)}
                  className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-[#01312D] hover:text-white hover:border-[#01312D] text-[#01312D] text-xs md:text-sm font-medium px-3 py-1.5 rounded-full transition-colors"
                >
                  <span className="w-3 h-3 rounded-sm border border-black/10" style={{ background: o._chip }} />
                  {o._short}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Desktop inline actions */}
        <div className="hidden md:block mt-auto pt-2 space-y-2">
          {onSelectFabric && (
            <button
              onClick={() => { onSelectFabric(current.id); onClose(); }}
              className="w-full flex items-center justify-center gap-2 bg-[#307C31] hover:bg-[#01312D] text-white font-semibold py-3 px-5 rounded-full transition-colors"
            >
              Select {current._short}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {others.length > 0 && !showPicker && (
            <button
              onClick={() => setShowPicker(true)}
              className="w-full flex items-center justify-between gap-2 bg-[#01312D] hover:bg-[#307C31] text-white font-semibold py-3 px-5 rounded-full transition-colors"
            >
              <span>Compare with another fabric</span>
              <GitCompare className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile sticky footer with actions */}
      <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-3 space-y-2 z-20">
        {onSelectFabric && (
          <button
            onClick={() => { onSelectFabric(current.id); onClose(); }}
            className="w-full flex items-center justify-center gap-2 bg-[#307C31] hover:bg-[#01312D] text-white font-semibold py-2.5 px-4 rounded-full transition-colors text-sm"
          >
            Select {current._short}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
        {others.length > 0 && !showPicker && (
          <button
            onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-between gap-2 bg-[#01312D] hover:bg-[#307C31] text-white font-semibold py-2.5 px-4 rounded-full transition-colors text-sm"
          >
            <span>Compare with another fabric</span>
            <GitCompare className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ===== Compare view =====

interface CompareViewProps {
  a: FabricData;
  b: FabricData;
  onBack: () => void;
}

function CompareView({ a, b, onBack }: CompareViewProps) {
  const [view, setView] = useState<ViewKey>('macro');
  const [splitPct, setSplitPct] = useState(50);

  const cycleView = (dir: 1 | -1) => {
    const i = COMPARE_VIEWS.indexOf(view);
    const next = (i + dir + COMPARE_VIEWS.length) % COMPARE_VIEWS.length;
    setView(COMPARE_VIEWS[next]);
  };

  // Build union of spec labels
  const labels: string[] = [];
  const seen = new Set<string>();
  [...a._specs, ...b._specs].forEach(s => {
    if (!seen.has(s.label)) { seen.add(s.label); labels.push(s.label); }
  });

  const findSpec = (f: FabricData, label: string) => f._specs.find(s => s.label.toLowerCase() === label.toLowerCase());

  const diff = (aSpec?: FabricSpec, bSpec?: FabricSpec) => {
    if (!aSpec || !bSpec) return { tie: true, aWins: false, bWins: false, delta: 0, higher: true };
    const an = typeof aSpec.numeric === 'number' ? aSpec.numeric : parseFloat(String(aSpec.value)) || 0;
    const bn = typeof bSpec.numeric === 'number' ? bSpec.numeric : parseFloat(String(bSpec.value)) || 0;
    if (an === bn) return { tie: true, aWins: false, bWins: false, delta: 0, higher: true };
    const higher = aSpec.higherBetter !== false;
    const aWins = higher ? an > bn : an < bn;
    return { tie: false, aWins, bWins: !aWins, delta: Math.abs(an - bn), higher };
  };

  // Split-pane drag
  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const updateFromEvent = useCallback((clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSplitPct(pct);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-arrow]')) return;
    e.stopPropagation();
    draggingRef.current = true;
    try { frameRef.current?.setPointerCapture(e.pointerId); } catch {}
    updateFromEvent(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    updateFromEvent(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    try { frameRef.current?.releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <div className="p-3 md:p-7 overflow-y-auto overscroll-contain pb-20 md:pb-7">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3 md:mb-4 pr-10">
        <h3 className="text-base md:text-2xl font-bold text-[#01312D]">Side-by-side comparison</h3>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 border border-gray-200 hover:bg-[#F3FFE3] text-[#01312D] text-sm font-medium px-4 py-2 rounded-full transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {a._short}
        </button>
      </div>

      {/* Desktop: two columns */}
      <div className="hidden md:grid grid-cols-2 gap-3 mb-4">
        {[a, b].map(f => (
          <div key={f.id} className="bg-[#F3FFE3] rounded-xl p-3 text-center">
            <div className="relative rounded-lg overflow-hidden bg-white">
              <span className="absolute top-2 left-2 z-10 bg-white/95 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-[#01312D]">
                {VIEW_LABELS[view]}
              </span>
              <button
                data-arrow
                onClick={() => cycleView(-1)}
                aria-label="Previous view"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center"
              >
                <ChevronLeft className="w-4 h-4 text-[#01312D]" />
              </button>
              <button
                data-arrow
                onClick={() => cycleView(1)}
                aria-label="Next view"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center"
              >
                <ChevronRight className="w-4 h-4 text-[#01312D]" />
              </button>
              <img
                key={`${f.id}-${view}`}
                src={f._images[view]}
                alt={`${f.label} ${VIEW_LABELS[view]}`}
                className="w-full aspect-square object-cover"
              />
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-base font-bold text-[#01312D]">
              <span className="w-3 h-3 rounded-sm border border-black/10" style={{ background: f._chip }} />
              {f._short}
            </div>
            {f.tag && (
              <div className="text-[11px] uppercase tracking-wider text-[#01312D]/60 mt-1 font-semibold">{f.tag}</div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: split-pane */}
      <div className="md:hidden mb-4">
        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ touchAction: 'none' }}
          className="relative aspect-[4/3] bg-white rounded-xl overflow-hidden select-none cursor-ew-resize"
        >
          <span className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-[#01312D] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full pointer-events-none">
            {VIEW_LABELS[view]}
          </span>
          <span className="absolute top-2 left-2 z-20 bg-white/95 px-2 py-0.5 rounded-full text-[10px] font-bold text-[#01312D] flex items-center gap-1 pointer-events-none max-w-[45%] truncate">
            <span className="w-2 h-2 rounded-sm" style={{ background: a._chip }} />
            {a._short}
          </span>
          <span className="absolute top-2 right-2 z-20 bg-white/95 px-2 py-0.5 rounded-full text-[10px] font-bold text-[#01312D] flex items-center gap-1 pointer-events-none max-w-[45%] truncate">
            <span className="w-2 h-2 rounded-sm" style={{ background: b._chip }} />
            {b._short}
          </span>

          <div className="absolute inset-0 pointer-events-none">
            <img src={a._images[view]} alt={`${a.label} ${VIEW_LABELS[view]}`} draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" />
          </div>
          <div className="absolute inset-0 z-10 pointer-events-none" style={{ clipPath: `inset(0 0 0 ${splitPct}%)`, WebkitClipPath: `inset(0 0 0 ${splitPct}%)` }}>
            <img src={b._images[view]} alt={`${b.label} ${VIEW_LABELS[view]}`} draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" />
          </div>
          <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.15)] z-20 pointer-events-none" style={{ left: `${splitPct}%` }} />
          <div className="absolute top-1/2 z-20 w-11 h-11 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full shadow-lg flex items-center justify-center pointer-events-none" style={{ left: `${splitPct}%` }}>
            <div className="flex items-center text-[#01312D]">
              <ChevronLeft className="w-4 h-4 -mr-1" />
              <ChevronRight className="w-4 h-4 -ml-1" />
            </div>
          </div>

          <button
            data-arrow
            onClick={(e) => { e.stopPropagation(); cycleView(-1); }}
            aria-label="Previous view"
            className="absolute left-2 bottom-2 z-30 w-9 h-9 rounded-full bg-white/95 shadow flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4 text-[#01312D]" />
          </button>
          <button
            data-arrow
            onClick={(e) => { e.stopPropagation(); cycleView(1); }}
            aria-label="Next view"
            className="absolute right-2 bottom-2 z-30 w-9 h-9 rounded-full bg-white/95 shadow flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4 text-[#01312D]" />
          </button>
        </div>
      </div>

      {/* View switcher */}
      <div className="flex items-center justify-center gap-1 p-1 bg-[#F3FFE3] rounded-full w-fit mx-auto mb-5 max-w-full overflow-x-auto">
        {COMPARE_VIEWS.map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all ${
              view === v ? 'bg-[#01312D] text-white font-semibold' : 'text-[#01312D]/70 hover:text-[#01312D]'
            }`}
          >
            {VIEW_LABELS[v]}
          </button>
        ))}
      </div>

      {/* Diff table */}
      <div className="rounded-xl overflow-hidden border border-gray-200">
        <div className="grid grid-cols-[1.4fr_1fr_1fr] md:grid-cols-[1fr_1.1fr_1fr] bg-[#F3FFE3] text-[11px] uppercase tracking-wider font-bold text-[#01312D]/60">
          <div className="px-3 md:px-4 py-3 text-left">Specification</div>
          <div className="px-3 md:px-4 py-3 text-center text-[#01312D]">{a._short}</div>
          <div className="px-3 md:px-4 py-3 text-center text-[#01312D]">{b._short}</div>
        </div>
        {labels.map((label, i) => {
          const aS = findSpec(a, label);
          const bS = findSpec(b, label);
          const d = diff(aS, bS);
          const deltaWord = label.toLowerCase().includes('warranty') ? 'longer' :
            label.toLowerCase().includes('weight') ? 'heavier' :
            d.higher ? 'more' : 'less';
          const deltaStr = Number.isInteger(d.delta) ? d.delta : d.delta.toFixed(1);
          return (
            <div key={label} className={`grid grid-cols-[1.4fr_1fr_1fr] md:grid-cols-[1fr_1.1fr_1fr] items-center text-xs md:text-base ${i > 0 ? 'border-t border-gray-200' : ''}`}>
              <div className="px-2 md:px-4 py-2 md:py-3 text-left text-[10px] md:text-xs uppercase tracking-wider font-semibold text-[#01312D] bg-[#F3FFE3]/50">
                {label}
              </div>
              <div className={`px-2 md:px-4 py-2 md:py-3 text-center font-semibold ${d.aWins ? 'bg-[#F3FFE3] text-[#01312D]' : 'text-[#01312D]'}`}>
                <div>{aS ? aS.value : '-'}</div>
                {d.aWins && !d.tie && (
                  <div className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold text-[#307C31] mt-0.5 md:mt-1">
                    {d.higher ? '+' : '-'}{deltaStr} {deltaWord}
                  </div>
                )}
                {d.tie && aS && (
                  <div className="hidden md:block text-[10px] uppercase tracking-wider font-bold text-[#01312D]/50 mt-1">Equal</div>
                )}
              </div>
              <div className={`px-2 md:px-4 py-2 md:py-3 text-center font-semibold ${d.bWins ? 'bg-[#F3FFE3] text-[#01312D]' : 'text-[#01312D]'}`}>
                <div>{bS ? bS.value : '-'}</div>
                {d.bWins && !d.tie && (
                  <div className="text-[9px] md:text-[10px] uppercase tracking-wider font-bold text-[#307C31] mt-0.5 md:mt-1">
                    {d.higher ? '+' : '-'}{deltaStr} {deltaWord}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

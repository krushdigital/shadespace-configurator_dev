import {
  BLOCK_LABELS,
  PdfBlock,
  escapeHtml,
  getBlockColumn,
  sanitizeCustomHtml,
} from './pdfBlocks';
import { ConfiguratorState, ShadeCalculations } from '../types';
import { getDiagonalKeysForCorners } from './geometry';

export interface PdfTemplateConfig {
  brand: {
    primaryColor: string;
    accentColor: string;
    accentDark: string;
    textColor: string;
    mutedColor: string;
    backgroundColor: string;
    logoUrl: string;
    fontFamily: string;
  };
  header: { title: string; tagline: string };
  footer: { line1: string; line2: string };
  sections: {
    showSummary: boolean;
    showMeasurements: boolean;
    showAnchorPoints: boolean;
    showHardwareBreakdown: boolean;
    showPriceBreakdown: boolean;
    showGuarantee: boolean;
    showPricingCallout: boolean;
  };
  paper: 'A4' | 'Letter';
  layout?: {
    density: 'comfortable' | 'compact' | 'ultra';
    columns: 1 | 2;
    columnGap?: number;
  };
}

export interface PreviewLiveData {
  id?: string;
  quote_reference?: string | null;
  quote_name?: string | null;
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_email?: string | null;
  customer_reference?: string | null;
  access_token?: string | null;
  diagram_public_url?: string | null;
  diagram_3d_url?: string | null;
  created_at?: string | null;
  config_data?: ConfiguratorState | null;
  calculations_data?: ShadeCalculations | null;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NZD: 'NZ$', USD: 'US$', AUD: 'AU$', GBP: '\u00a3', EUR: '\u20ac', CAD: 'CA$',
};

function formatCurrencyPreview(amount: number, code: string): string {
  const symbol = CURRENCY_SYMBOLS[code] || code;
  return `${symbol}${(amount || 0).toFixed(2)}`;
}

function formatMeasurementPreview(mm: number, unit: 'metric' | 'imperial'): string {
  if (!mm || !isFinite(mm)) return 'Not provided';
  if (unit === 'imperial') {
    const inches = mm * 0.0393701;
    let imperial: string;
    if (inches >= 12) {
      const feet = Math.floor(inches / 12);
      const rem = inches % 12;
      imperial = parseFloat(rem.toFixed(1)) > 0 ? `${feet}'${rem.toFixed(1)}"` : `${feet}'`;
    } else {
      imperial = `${inches.toFixed(1)}"`;
    }
    return `${imperial} (${Math.round(mm)}mm)`;
  }
  return `${Math.round(mm)}mm`;
}

function formatAreaPreview(mm2: number, unit: 'metric' | 'imperial'): string {
  if (unit === 'imperial') {
    const sqft = mm2 * (0.0393701 * 0.0393701) / 144;
    const m2 = mm2 / 1000000;
    return `${sqft.toFixed(1)} ft\u00b2 (${m2.toFixed(2)} m\u00b2)`;
  }
  return `${(mm2 / 1000000).toFixed(2)} m\u00b2`;
}

type HtmlDensityPreset = {
  body: number;
  title: number;
  tagline: number;
  h2: number;
  row: number;
  rowPad: number;
  small: number;
  priceLg: number;
  sectionMargin: number;
  twoColGap: number;
};

const HTML_DENSITY_PRESETS: Record<'comfortable' | 'compact' | 'ultra', HtmlDensityPreset> = {
  comfortable: { body: 14, title: 22, tagline: 12, h2: 16, row: 13, rowPad: 6, small: 11, priceLg: 22, sectionMargin: 20, twoColGap: 16 },
  compact:     { body: 13, title: 18, tagline: 11, h2: 14, row: 12, rowPad: 4, small: 10, priceLg: 18, sectionMargin: 14, twoColGap: 12 },
  ultra:       { body: 12, title: 16, tagline: 10, h2: 12, row: 11, rowPad: 3, small: 9,  priceLg: 16, sectionMargin: 10, twoColGap: 8 },
};

function densityCss(scope: string, p: HtmlDensityPreset, brand: PdfTemplateConfig['brand']): string {
  return `
    ${scope} { font-size:${p.body}px; }
    ${scope} h2 { font-size:${p.h2}px; color:${brand.primaryColor}; border-bottom:2px solid ${brand.accentColor}; padding-bottom:${Math.max(2, Math.round(p.rowPad - 1))}px; margin:${p.sectionMargin}px 0 ${Math.max(6, Math.round(p.sectionMargin / 2))}px; }
    ${scope} .row { display:flex; justify-content:space-between; align-items:flex-start; padding:${p.rowPad}px 0; border-bottom:1px solid #E5E7EB; font-size:${p.row}px; gap:10px; }
    ${scope} .row > .muted, ${scope} .row > .val { min-width:0; overflow-wrap:anywhere; word-break:break-word; }
    ${scope} .row > .muted { flex:1 1 auto; }
    ${scope} .row > .val { flex:0 1 auto; max-width:60%; }
    ${scope} .callout { margin-top:${p.sectionMargin}px; padding:${Math.max(10, p.rowPad * 2 + 6)}px; border-radius:12px; background:${brand.primaryColor}; color:#fff; text-align:center; }
    ${scope} .callout .price { font-size:${p.priceLg}px; font-weight:700; color:${brand.accentColor}; }
    ${scope} .guarantee { margin-top:${p.sectionMargin}px; padding:${Math.max(10, p.rowPad * 2 + 6)}px; border-radius:12px; background:linear-gradient(135deg, #F3FFE3 0%, ${brand.accentColor} 20%); border:2px solid ${brand.accentDark}; color:${brand.primaryColor}; font-size:${p.row}px; }
  `;
}

function densityForBlock(block: PdfBlock, cfg: PdfTemplateConfig): 'comfortable' | 'compact' | 'ultra' {
  const o = (block.props?.densityOverride as string | undefined) || undefined;
  if (o === 'comfortable' || o === 'compact' || o === 'ultra') return o;
  return (cfg.layout?.density || 'comfortable') as 'comfortable' | 'compact' | 'ultra';
}

function wrapBlock(block: PdfBlock, cfg: PdfTemplateConfig, live: PreviewLiveData | null): string {
  const d = densityForBlock(block, cfg);
  const attrs: string[] = [
    `class="block-wrap density-${d}"`,
    `data-block-type="${escapeHtml(block.type)}"`,
  ];
  if (block.type === 'pageBreak') {
    attrs.push('data-pagebreak="1"');
  }
  if (block.type === 'spacer') {
    const h = Number((block.props || {}).height) || 16;
    attrs.push(`data-spacer-height="${h}"`);
  }
  return `<div ${attrs.join(' ')}>${renderBlockHtml(block, cfg, live)}</div>`;
}

function renderGroupedBlocks(blocks: PdfBlock[], cfg: PdfTemplateConfig, live: PreviewLiveData | null): string {
  const out: string[] = [];
  let leftBuf: PdfBlock[] = [];
  let rightBuf: PdfBlock[] = [];
  const flush = () => {
    if (leftBuf.length === 0 && rightBuf.length === 0) return;
    const leftHtml = leftBuf.map((x) => wrapBlock(x, cfg, live)).join('');
    const rightHtml = rightBuf.map((x) => wrapBlock(x, cfg, live)).join('');
    out.push(`<div class="two-col"><div class="col">${leftHtml}</div><div class="col">${rightHtml}</div></div>`);
    leftBuf = [];
    rightBuf = [];
  };
  for (const block of blocks) {
    const col = getBlockColumn(block);
    if (col === 'full') {
      flush();
      out.push(wrapBlock(block, cfg, live));
    } else if (col === 'left') {
      leftBuf.push(block);
    } else {
      rightBuf.push(block);
    }
  }
  flush();
  return out.join('');
}

function renderBlockHtml(block: PdfBlock, cfg: PdfTemplateConfig, live: PreviewLiveData | null): string {
  const p = block.props || {};
  const title = (p.title as string) || BLOCK_LABELS[block.type];
  const cfgData = live?.config_data || null;
  const calc = live?.calculations_data || null;
  const currency = cfgData?.currency || 'NZD';
  const total = calc?.totalPrice ?? 650;
  const fabricLabel = cfgData?.fabricType || 'Monotec 370';
  const fabricColor = cfgData?.fabricColor || 'Domino Black';
  const corners = cfgData?.corners ?? 4;
  const unit: 'metric' | 'imperial' = cfgData?.unit || 'metric';
  switch (block.type) {
    case 'summary':
      return `<h2>${escapeHtml(title)}</h2>
        <div class="row"><span class="muted">Fabric Material</span><span class="val">${escapeHtml(fabricLabel)}</span></div>
        <div class="row"><span class="muted">Fabric Color</span><span class="val">${escapeHtml(fabricColor)}</span></div>
        <div class="row"><span class="muted">Corners</span><span class="val">${corners}</span></div>
        <div class="row"><span class="muted">Total Area</span><span class="val">${formatAreaPreview((calc?.area || 12.5) * 1000000, unit)}</span></div>
        <div class="row"><span class="muted">Edge Reinforcement</span><span class="val">${cfgData?.edgeType === 'webbing' ? 'Webbing Reinforced' : cfgData?.edgeType === 'cabled' ? 'Cabled Edge' : 'Webbing Reinforced'}</span></div>
        <div class="row"><span class="muted">Thread</span><span class="val">Sewn with SolarFix\u00AE PTFE thread</span></div>`;
    case 'measurements': {
      if (cfgData && cfgData.measurements) {
        const edges: string[] = [];
        for (let i = 0; i < corners; i++) {
          const next = (i + 1) % corners;
          const key = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + next)}`;
          const mm = cfgData.measurements[key];
          if (mm) edges.push(`<div class="row"><span class="muted">Edge ${key.charAt(0)} to ${key.charAt(1)}</span><span class="val">${formatMeasurementPreview(mm, unit)}</span></div>`);
        }
        const diagonalRows: string[] = [];
        for (const key of getDiagonalKeysForCorners(corners)) {
          const mm = cfgData.measurements[key];
          if (mm) diagonalRows.push(`<div class="row"><span class="muted">Diagonal ${key.charAt(0)} to ${key.charAt(1)}</span><span class="val">${formatMeasurementPreview(mm, unit)}</span></div>`);
        }
        const edgesBlock = `<div style="margin-bottom:10px;"><div style="font-weight:700;color:${cfg.brand.accentDark};font-size:12px;margin-bottom:4px;">Edge Lengths</div>${edges.join('') || '<div class="row"><span class="muted">No edge measurements</span></div>'}</div>`;
        const diagonalsBlock = diagonalRows.length > 0
          ? `<div><div style="font-weight:700;color:${cfg.brand.accentDark};font-size:12px;margin-bottom:4px;">Diagonal Lengths</div>${diagonalRows.join('')}</div>`
          : '';
        return `<h2>${escapeHtml(title)}</h2>${edgesBlock}${diagonalsBlock}`;
      }
      return `<h2>${escapeHtml(title)}</h2>
        <div style="font-weight:700;color:${cfg.brand.accentDark};font-size:12px;margin-bottom:4px;">Edge Lengths</div>
        <div class="row"><span class="muted">Edge A to B</span><span class="val">4000mm</span></div>
        <div class="row"><span class="muted">Edge B to C</span><span class="val">3500mm</span></div>
        <div class="row"><span class="muted">Edge C to D</span><span class="val">4200mm</span></div>
        <div class="row"><span class="muted">Edge D to A</span><span class="val">3300mm</span></div>
        <div style="font-weight:700;color:${cfg.brand.accentDark};font-size:12px;margin:10px 0 4px;">Diagonal Lengths</div>
        <div class="row"><span class="muted">Diagonal A to C</span><span class="val">5400mm</span></div>
        <div class="row"><span class="muted">Diagonal B to D</span><span class="val">5200mm</span></div>`;
    }
    case 'anchorPoints': {
      if (cfgData && Array.isArray(cfgData.fixingHeights)) {
        const rows = cfgData.fixingHeights.slice(0, corners).map((h, i) => {
          const letter = String.fromCharCode(65 + i);
          const t = cfgData.fixingTypes?.[i] || 'post';
          const o = cfgData.eyeOrientations?.[i] || 'horizontal';
          return `<div class="row"><span class="muted">Corner ${letter}</span><span class="val">${formatMeasurementPreview(h || 0, unit)}, ${t}, ${o} eye</span></div>`;
        }).join('');
        return `<h2>${escapeHtml(title)}</h2>${rows}`;
      }
      return `<h2>${escapeHtml(title)}</h2>
        <div class="row"><span class="muted">Corner A</span><span class="val">2400mm, post</span></div>`;
    }
    case 'hardwareBreakdown': {
      const hwMode: 'standard' | 'manual' | 'none' =
        cfgData?.hardwareSelectionMode ?? (cfgData?.measurementOption === 'adjust' ? 'standard' : 'none');
      if (hwMode === 'none') {
        return `<h2>${escapeHtml(title)}</h2><div class="row"><span class="muted">No tensioning hardware included with this order.</span></div>`;
      }
      if (hwMode === 'standard') {
        return `<h2>${escapeHtml(title)}</h2>
          <div class="row"><span class="muted">Hardware Tensioning Kit (${corners}-corner pack)</span><span class="val" style="color:#307C31;">Included</span></div>
          <div style="font-size:11px;color:${cfg.brand.mutedColor};padding:4px 0 0;">Pack contents are listed in the Bill of Materials block.</div>`;
      }
      const cornerHw = (cfgData as { cornerHardware?: Record<number, Array<{ name: string; sku?: string; qty: number; livePrice?: number; livePriceCurrency?: string }>> })?.cornerHardware;
      if (cornerHw) {
        const rows: string[] = [];
        for (let i = 0; i < corners; i++) {
          const letter = String.fromCharCode(65 + i);
          const lines = cornerHw[i] || [];
          const cornerTotal = lines.reduce((sum, l) => {
            const liveP = l.livePriceCurrency === currency && l.livePrice != null ? l.livePrice : 0;
            return sum + liveP * l.qty;
          }, 0);
          rows.push(`<div style="padding:8px 0;border-bottom:1px solid #E5E7EB;">
            <div style="display:flex;justify-content:space-between;font-weight:700;">
              <span>Corner ${letter}</span><span>${formatCurrencyPreview(cornerTotal, currency)}</span>
            </div>
            ${lines.length === 0 ? `<div style="padding-left:12px;font-size:11px;color:${cfg.brand.mutedColor};">No hardware selected</div>` : lines.map(l => {
              const skuPart = l.sku ? ` (${l.sku})` : '';
              const lineLive = l.livePriceCurrency === currency && l.livePrice != null ? l.livePrice * l.qty : 0;
              return `<div style="display:flex;justify-content:space-between;padding-left:12px;font-size:11px;color:${cfg.brand.mutedColor};">
                <span>${escapeHtml(l.qty)}x ${escapeHtml(l.name)}${escapeHtml(skuPart)}</span>
                <span>${formatCurrencyPreview(lineLive, currency)}</span>
              </div>`;
            }).join('')}
          </div>`);
        }
        return `<h2>${escapeHtml(title)}</h2>${rows.join('')}`;
      }
      return `<h2>${escapeHtml(title)}</h2>
        <div style="padding:8px 0;border-bottom:1px solid #E5E7EB;">
          <div style="display:flex;justify-content:space-between;font-weight:700;"><span>Corner A</span><span>${formatCurrencyPreview(0, currency)}</span></div>
          <div style="padding-left:12px;font-size:11px;color:${cfg.brand.mutedColor};">No hardware selected</div>
        </div>`;
    }
    case 'priceBreakdown': {
      const hb = calc?.hardwareBreakdown;
      const isManualHardware = hb?.mode === 'manual' && hb?.liveCurrency === currency && hb?.hardwareOnlyLivePrice != null && hb.hardwareOnlyLivePrice > 0;
      const rows: string[] = [];
      if (isManualHardware) {
        const hwLive = hb!.hardwareOnlyLivePrice!;
        rows.push(`<div class="row"><span class="muted">Shade sail</span><span class="val">${formatCurrencyPreview(total - hwLive, currency)}</span></div>`);
        rows.push(`<div class="row"><span class="muted">Hardware</span><span class="val">${formatCurrencyPreview(hwLive, currency)}</span></div>`);
        rows.push(`<div class="row"><span class="val">Total</span><span class="val">${formatCurrencyPreview(total, currency)}</span></div>`);
      } else {
        rows.push(`<div class="row"><span class="muted">Shade sail</span><span class="val">${formatCurrencyPreview(total, currency)}</span></div>`);
        rows.push(`<div class="row"><span class="val">Total</span><span class="val">${formatCurrencyPreview(total, currency)}</span></div>`);
      }
      return `<h2>${escapeHtml(title)}</h2>${rows.join('')}`;
    }
    case 'guarantee':
      return `<div class="guarantee"><div style="font-weight:700;margin-bottom:6px;">${escapeHtml(title)}</div>
        <div style="font-size:12px;">15-year Fabric &amp; Workmanship Warranty &middot; Weather-resistant materials &middot; Free worldwide shipping</div></div>`;
    case 'pricingCallout':
      return `<div class="callout"><div style="font-size:12px;opacity:.85;">${escapeHtml(title)}</div><div class="price">${formatCurrencyPreview(total, currency)}</div></div>`;
    case 'quoteMeta': {
      const fullName = [live?.customer_first_name, live?.customer_last_name].filter(Boolean).join(' ').trim();
      const name = fullName || 'See Shopify Order';
      const email = live?.customer_email || 'See Shopify Order';
      const ref = live?.quote_reference || 'Pending';
      const date = live?.created_at
        ? new Date(live.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const cfgAny = cfgData as Record<string, unknown> | null | undefined;
      const custRef = live?.customer_reference || (cfgAny?.customerReference as string | undefined);
      const quoteName = live?.quote_name || (cfgAny?.quoteName as string | undefined);
      return `<h2>${escapeHtml(title)}</h2>
        <div class="row"><span class="muted">Customer Name</span><span class="val">${escapeHtml(name)}</span></div>
        <div class="row"><span class="muted">Email</span><span class="val">${escapeHtml(email)}</span></div>
        <div class="row"><span class="muted">Quote Reference</span><span class="val">${escapeHtml(ref)}</span></div>
        ${quoteName ? `<div class="row"><span class="muted">Quote Name</span><span class="val">${escapeHtml(quoteName)}</span></div>` : ''}
        ${custRef ? `<div class="row"><span class="muted">Customer Reference</span><span class="val">${escapeHtml(custRef)}</span></div>` : ''}
        <div class="row"><span class="muted">Date</span><span class="val">${escapeHtml(date)}</span></div>`;
    }
    case 'stepSelections': {
      const manufacturing = cfgData?.measurementOption === 'exact'
        ? 'Manufacture Shade Sail to the Exact Dimensions I provide'
        : 'Manufacture Shade Sail to fit my Space';
      const hwMode = cfgData?.hardwareSelectionMode || (cfgData?.measurementOption === 'adjust' ? 'standard' : 'none');
      const hwLabel = hwMode === 'standard' ? `Standard tensioning kit included (${corners}-corner pack)` : hwMode === 'manual' ? 'Manual hardware per corner' : 'No tensioning hardware';
      const fixingLabel = cfgData?.fixingPointsInstalled === true ? 'Already installed' : cfgData?.fixingPointsInstalled === false ? 'Planning installation' : 'Not specified';
      const edgeLabel = cfgData?.edgeType === 'webbing' ? 'Webbing reinforced' : cfgData?.edgeType === 'cabled' ? 'Cabled edge' : 'Webbing reinforced';
      const rows: Array<[string, string]> = [
        ['Manufacturing Approach', manufacturing],
        ['Number of Corners', `${corners}-corner shade sail`],
        ['Measurement Units', unit === 'metric' ? 'Metric (mm / m)' : 'Imperial (in / ft)'],
        ['Fabric', `${fabricLabel}${fabricColor ? ` - ${fabricColor}` : ''}`],
        ['Edge Reinforcement', edgeLabel],
        ['Tensioning Hardware', hwLabel],
        ['Fixing Points', fixingLabel],
      ];
      return `<h2>${escapeHtml(title)}</h2>${rows.map(([label, value], idx) => `<div class="row"><span class="muted">Step ${idx + 1} - ${escapeHtml(label)}</span><span class="val">${escapeHtml(value)}</span></div>`).join('')}`;
    }
    case 'diagramImage': {
      const mw = Number(p.maxWidth) || 520;
      if (live?.diagram_public_url && live?.diagram_3d_url) {
        const halfW = Math.floor(mw / 2) - 8;
        return `<h2>${escapeHtml(title)}</h2>
          <div style="display:flex;gap:16px;justify-content:center;align-items:flex-start;flex-wrap:wrap;">
            <div style="flex:1;min-width:200px;max-width:${halfW}px;text-align:center;">
              <img src="${escapeHtml(live.diagram_public_url)}" alt="Plan view" style="width:100%;border:1px solid #E2E8F0;border-radius:8px;padding:8px;background:#fff;" />
              <div style="font-size:11px;color:${cfg.brand.mutedColor};margin-top:6px;">Plan View</div>
            </div>
            <div style="flex:1;min-width:200px;max-width:${halfW}px;text-align:center;">
              <img src="${escapeHtml(live.diagram_3d_url)}" alt="3D view" style="width:100%;border:1px solid #E2E8F0;border-radius:8px;padding:8px;background:#fff;" />
              <div style="font-size:11px;color:${cfg.brand.mutedColor};margin-top:6px;">3D View</div>
            </div>
          </div>`;
      }
      if (live?.diagram_public_url) {
        return `<h2>${escapeHtml(title)}</h2>
          <div style="text-align:center;"><img src="${escapeHtml(live.diagram_public_url)}" alt="Shade sail diagram" style="max-width:${mw}px;width:100%;border:1px solid #E2E8F0;border-radius:8px;padding:10px;background:#fff;" /></div>`;
      }
      return `<h2>${escapeHtml(title)}</h2>
        <div style="text-align:center;padding:16px;border:1px dashed ${cfg.brand.mutedColor};border-radius:8px;color:${cfg.brand.mutedColor};font-size:12px;max-width:${mw}px;margin:0 auto;">Shade sail diagram appears here. The PDF will use the live diagram captured when the quote was created.</div>`;
    }
    case 'diagram3D': {
      const mw3d = Number(p.maxWidth) || 520;
      if (live?.diagram_3d_url) {
        return `<h2>${escapeHtml(title)}</h2>
          <div style="text-align:center;"><img src="${escapeHtml(live.diagram_3d_url)}" alt="3D shade sail render" style="max-width:${mw3d}px;width:100%;border:1px solid #E2E8F0;border-radius:8px;padding:10px;background:#fff;" /></div>`;
      }
      return `<h2>${escapeHtml(title)}</h2>
        <div style="text-align:center;padding:16px;border:1px dashed ${cfg.brand.mutedColor};border-radius:8px;color:${cfg.brand.mutedColor};font-size:12px;max-width:${mw3d}px;margin:0 auto;">3D shade sail render appears here. The PDF will use the 3D screenshot captured when the quote was created.</div>`;
    }
    case 'billOfMaterials':
      return `<h2>${escapeHtml(title)}</h2>
        <div class="row"><span class="muted">${escapeHtml(fabricLabel)} - ${escapeHtml(fabricColor)} (${formatAreaPreview((calc?.area || 12.5) * 1000000, unit)})</span><span class="val">${formatCurrencyPreview(total - 70, currency)}</span></div>
        <div class="row"><span class="muted">Edge reinforcement</span><span class="val">Included</span></div>
        <div class="row"><span class="muted">Hardware Tensioning Kit (${corners}-corner pack)</span><span class="val">Included</span></div>
        <div class="row"><span class="val">Total (all-inclusive)</span><span class="val">${formatCurrencyPreview(total, currency)}</span></div>`;
    case 'resumeButton': {
      const label = (p.label as string) || 'Open My Saved Quote';
      const url = live?.id && live?.access_token
        ? `https://shadespace.com/pages/shade-sail-configurator?quote=${live.id}&token=${encodeURIComponent(live.access_token)}`
        : (live as Record<string, unknown> | null)?.resumeUrl as string | null ?? null;
      return `<div data-link-url="${url ? escapeHtml(url) : ''}" style="margin:16px 0;text-align:center;padding:20px;border-radius:10px;background:${cfg.brand.primaryColor};color:#fff;">
        <div style="font-weight:700;margin-bottom:6px;">${escapeHtml(title)}</div>
        <div style="font-size:12px;opacity:.85;margin-bottom:12px;">Pick up exactly where you left off and add this configuration to your cart.</div>
        <span style="display:inline-block;background:${cfg.brand.accentColor};color:${cfg.brand.primaryColor};padding:10px 24px;border-radius:6px;font-weight:700;font-size:13px;">${escapeHtml(label)}</span>
        ${url ? `<div style="font-size:10px;margin-top:10px;opacity:0.7;word-break:break-all;">${escapeHtml(url)}</div>` : ''}
      </div>`;
    }
    case 'customText': {
      const align = (p.align as string) || 'left';
      const heading = p.heading ? `<div style="font-weight:700;margin-bottom:6px;color:${cfg.brand.primaryColor};">${escapeHtml(p.heading)}</div>` : '';
      return `<div style="margin:12px 0;text-align:${align};font-size:13px;">${heading}<div>${escapeHtml(p.body || '')}</div></div>`;
    }
    case 'customImage':
      return p.url ? `<div style="margin:12px 0;text-align:center;"><img src="${escapeHtml(p.url)}" alt="${escapeHtml(p.alt || '')}" style="max-width:${Number(p.width) || 400}px;width:100%;" /></div>` : '';
    case 'customHtml':
      return `<div style="margin:12px 0;font-size:13px;">${sanitizeCustomHtml(String(p.html || ''))}</div>`;
    case 'divider':
      return `<hr style="border:none;border-top:${Number(p.thickness) || 1}px solid ${cfg.brand.mutedColor};opacity:0.4;margin:8px 0;" />`;
    case 'spacer':
      return `<div style="height:${Number(p.height) || 16}px;"></div>`;
    case 'pageBreak':
      return `<div data-pagebreak="1" style="margin:16px 0;height:1px;"></div>`;
    default:
      return '';
  }
}

export interface BuildPreviewOptions {
  /**
   * Render in "page" mode (used by the PDF capture pipeline) — fixed body width
   * matching A4 content width, no extra outer padding so html2canvas can paginate.
   */
  pageMode?: boolean;
}

export function buildQuotePreviewHtml(
  cfg: PdfTemplateConfig,
  blocks: PdfBlock[],
  live: PreviewLiveData | null,
  options: BuildPreviewOptions = {},
): string {
  const b = cfg.brand;
  const baseDensity = (cfg.layout?.density || 'comfortable') as 'comfortable' | 'compact' | 'ultra';
  const basePreset = HTML_DENSITY_PRESETS[baseDensity];
  const overrideStyles: string[] = [];
  for (const d of ['comfortable', 'compact', 'ultra'] as const) {
    overrideStyles.push(densityCss(`.density-${d}`, HTML_DENSITY_PRESETS[d], b));
  }
  const bodySizing = options.pageMode
    ? `width:688px; margin:0; padding:0;`
    : `margin:0; padding:24px;`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    body { ${bodySizing} background:${b.backgroundColor}; font-family:${b.fontFamily}; color:${b.textColor}; font-size:${basePreset.body}px; line-height:1.45; box-sizing:border-box; overflow-wrap:anywhere; }
    *, *::before, *::after { box-sizing:border-box; }
    .header { display:flex; align-items:center; gap:12px; padding:16px; border-radius:12px; background:linear-gradient(135deg, #F3FFE3 0%, ${b.accentColor} 100%); border:2px solid ${b.accentDark}; margin-bottom:16px; }
    .header .meta { flex:1; }
    .logo-img { max-height:40px; max-width:180px; object-fit:contain; }
    .title { font-size:${basePreset.title}px; font-weight:700; color:${b.primaryColor}; margin:0; }
    .tagline { font-size:${basePreset.tagline}px; color:${b.accentDark}; margin:4px 0 0 0; }
    h2 { font-size:${basePreset.h2}px; color:${b.primaryColor}; border-bottom:2px solid ${b.accentColor}; padding-bottom:${Math.max(2, basePreset.rowPad - 1)}px; margin:${basePreset.sectionMargin}px 0 ${Math.max(6, Math.round(basePreset.sectionMargin / 2))}px; }
    .row { display:flex; justify-content:space-between; align-items:flex-start; padding:${basePreset.rowPad}px 0; border-bottom:1px solid #E5E7EB; font-size:${basePreset.row}px; gap:10px; }
    .row > .muted, .row > .val { min-width:0; overflow-wrap:anywhere; word-break:break-word; }
    .row > .muted { flex:1 1 auto; }
    .row > .val { flex:0 1 auto; min-width:0; }
    .muted { color:${b.mutedColor}; }
    .val { color:${b.textColor}; font-weight:600; text-align:right; }
    .callout { margin-top:${basePreset.sectionMargin}px; padding:${Math.max(10, basePreset.rowPad * 2 + 6)}px; border-radius:12px; background:${b.primaryColor}; color:#fff; text-align:center; }
    .callout .price { font-size:${basePreset.priceLg}px; font-weight:700; color:${b.accentColor}; }
    .guarantee { margin-top:${basePreset.sectionMargin}px; padding:${Math.max(10, basePreset.rowPad * 2 + 6)}px; border-radius:12px; background:linear-gradient(135deg, #F3FFE3 0%, ${b.accentColor} 20%); border:2px solid ${b.accentDark}; color:${b.primaryColor}; font-size:${basePreset.row}px; }
    .footer { margin-top:24px; text-align:center; font-size:${basePreset.small}px; color:${b.mutedColor}; }
    hr { border:none; border-top:1px solid ${b.mutedColor}; margin:8px 0; opacity:0.4; }
    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:${cfg.layout?.columnGap ?? basePreset.twoColGap}px; align-items:start; margin-top:4px; }
    .two-col > .col { min-width:0; overflow-wrap:anywhere; }
    .two-col h2 { margin-top:8px; }
    .block-wrap { display:block; }
    img { display:inline-block; max-width:100%; }
    ${overrideStyles.join('\n')}
  </style></head><body>
    <div class="header">
      ${b.logoUrl ? `<img class="logo-img" src="${escapeHtml(b.logoUrl)}" alt="logo" />` : ''}
      <div class="meta">
        <h1 class="title">${escapeHtml(cfg.header.title)}</h1>
        <p class="tagline">${escapeHtml(cfg.header.tagline)}</p>
      </div>
    </div>
    ${renderGroupedBlocks(blocks.filter((x) => x.visible), cfg, live)}
    <div class="footer">
      <div>${escapeHtml(cfg.footer.line1)}</div>
      <div>${escapeHtml(cfg.footer.line2)}</div>
    </div>
  </body></html>`;
}

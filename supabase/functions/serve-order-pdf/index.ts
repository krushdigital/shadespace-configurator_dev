import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// --- Ported from pdfBlocks.ts ---
type BlockType =
  | "summary" | "measurements" | "anchorPoints" | "hardwareBreakdown"
  | "priceBreakdown" | "guarantee" | "pricingCallout" | "quoteMeta"
  | "stepSelections" | "diagramImage" | "diagram3D" | "billOfMaterials"
  | "resumeButton" | "customText" | "customImage" | "customHtml"
  | "divider" | "spacer" | "pageBreak";

interface PdfBlock {
  id: string;
  type: BlockType;
  visible: boolean;
  props: Record<string, unknown>;
}

const BLOCK_LABELS: Record<BlockType, string> = {
  summary: "Shade Sail Summary",
  measurements: "Precise Measurements",
  anchorPoints: "Anchor Point Configuration",
  hardwareBreakdown: "Corner Hardware Breakdown",
  priceBreakdown: "Price Breakdown",
  guarantee: "Premium Quality Guarantee",
  pricingCallout: "Pricing Callout",
  quoteMeta: "Quote Details (Customer + Reference)",
  stepSelections: "Configurator Step Selections",
  diagramImage: "Shade Sail Diagram",
  diagram3D: "3D Shade Sail Render",
  billOfMaterials: "Itemised Bill of Materials",
  resumeButton: "Resume Quote Button",
  customText: "Custom Text",
  customImage: "Custom Image",
  customHtml: "Custom HTML",
  divider: "Divider",
  spacer: "Spacer",
  pageBreak: "Page Break",
};

const DEFAULT_BLOCKS: PdfBlock[] = [
  { id: "b-quoteMeta", type: "quoteMeta", visible: true, props: { title: "Quote Details" } },
  { id: "b-steps", type: "stepSelections", visible: true, props: { title: "Your Configurator Selections" } },
  { id: "b-diagram", type: "diagramImage", visible: true, props: { title: "Shade Sail Diagram", maxWidth: 520 } },
  { id: "b-summary", type: "summary", visible: true, props: { title: "Shade Sail Summary" } },
  { id: "b-measurements", type: "measurements", visible: true, props: { title: "Precise Measurements" } },
  { id: "b-anchor", type: "anchorPoints", visible: true, props: { title: "Anchor Point Configuration" } },
  { id: "b-hardware", type: "hardwareBreakdown", visible: true, props: { title: "Corner Hardware Breakdown" } },
  { id: "b-bom", type: "billOfMaterials", visible: true, props: { title: "Itemised Bill of Materials" } },
  { id: "b-price", type: "priceBreakdown", visible: true, props: { title: "Price Breakdown" } },
  { id: "b-guarantee", type: "guarantee", visible: true, props: { title: "Premium Quality Guarantee" } },
  { id: "b-callout", type: "pricingCallout", visible: true, props: { title: "All-Inclusive Price to Your Door" } },
];

function escapeHtml(s: unknown): string {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string
  ));
}

// --- Ported from pdfHtmlPreview.ts ---
const CURRENCY_SYMBOLS: Record<string, string> = {
  NZD: "NZ$", USD: "US$", AUD: "AU$", GBP: "\u00A3", EUR: "\u20AC", CAD: "CA$",
};

function formatCurrency(amount: number, code: string): string {
  const symbol = CURRENCY_SYMBOLS[code] || code;
  return `${symbol}${(amount || 0).toFixed(2)}`;
}

function formatMeasurement(mm: number, unit: "metric" | "imperial"): string {
  if (!mm || !isFinite(mm)) return "Not provided";
  if (unit === "imperial") {
    const totalInches = mm * 0.0393701;
    const feet = Math.floor(totalInches / 12);
    const inches = totalInches % 12;
    if (feet > 0) return `${feet}'${inches.toFixed(1)}"`;
    return `${inches.toFixed(1)}"`;
  }
  if (mm >= 1000) return `${(mm / 1000).toFixed(2)}m`;
  return `${Math.round(mm)}mm`;
}

function formatArea(mm2: number, unit: "metric" | "imperial"): string {
  if (unit === "imperial") {
    const sqft = mm2 * (0.0393701 * 0.0393701) / 144;
    const m2 = mm2 / 1000000;
    return `${sqft.toFixed(1)} ft\u00B2 (${m2.toFixed(2)} m\u00B2)`;
  }
  return `${(mm2 / 1000000).toFixed(2)} m\u00B2`;
}

function getDiagonalKeysForCorners(corners: number): string[] {
  if (corners === 4) return ["AC", "BD"];
  if (corners === 5) return ["AC", "AD", "CE", "BD", "BE"];
  if (corners === 6) return ["AC", "AD", "AE", "BD", "BE", "BF", "CE", "CF", "DF"];
  if (corners === 7) return ["AC", "AD", "AE", "AF", "BD", "BE", "BF", "BG", "CE", "CF", "CG", "DF", "DG", "EG"];
  if (corners === 8) return ["AC", "AD", "AE", "AF", "AG", "BD", "BE", "BF", "BG", "BH", "CE", "CF", "CG", "CH", "DF", "DG", "DH", "EG", "EH", "FH"];
  return [];
}

interface QuoteData {
  id: string;
  quote_reference: string | null;
  quote_name: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
  customer_reference: string | null;
  access_token: string | null;
  diagram_public_url: string | null;
  diagram_3d_public_url: string | null;
  created_at: string | null;
  config_data: Record<string, any> | null;
  calculations_data: Record<string, any> | null;
}

interface TemplateConfig {
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
  paper: "A4" | "Letter";
  layout: { density: "comfortable" | "compact" | "ultra"; columns: 1 | 2; columnGap?: number };
}

const DEFAULT_CONFIG: TemplateConfig = {
  brand: {
    primaryColor: "#01312D",
    accentColor: "#BFF102",
    accentDark: "#307C31",
    textColor: "#01312D",
    mutedColor: "#64748B",
    backgroundColor: "#FFFFFF",
    logoUrl: "",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  header: { title: "Custom Shade Sail Quote", tagline: "Where Cool Spaces Begin" },
  footer: { line1: "Generated by ShadeSpace Professional Configurator", line2: "Visit shadespace.com for more information" },
  paper: "A4",
  layout: { density: "comfortable", columns: 1 },
};

const DENSITY = {
  comfortable: { body: 14, title: 22, tagline: 12, h2: 16, row: 13, rowPad: 6, small: 11, priceLg: 22, sectionMargin: 20, twoColGap: 16 },
  compact: { body: 13, title: 18, tagline: 11, h2: 14, row: 12, rowPad: 4, small: 10, priceLg: 18, sectionMargin: 14, twoColGap: 12 },
  ultra: { body: 12, title: 16, tagline: 10, h2: 12, row: 11, rowPad: 3, small: 9, priceLg: 16, sectionMargin: 10, twoColGap: 8 },
};

function renderBlock(block: PdfBlock, cfg: TemplateConfig, quote: QuoteData): string {
  const p = block.props || {};
  const title = (p.title as string) || BLOCK_LABELS[block.type];
  const cfgData = quote.config_data;
  const calc = quote.calculations_data;
  const currency = cfgData?.currency || "NZD";
  const total = calc?.totalPrice ?? 0;
  const fabricLabel = cfgData?.fabricType || "";
  const fabricColor = cfgData?.fabricColor || "";
  const corners = cfgData?.corners ?? 4;
  const unit: "metric" | "imperial" = cfgData?.unit || "metric";

  switch (block.type) {
    case "summary":
      return `<h2>${escapeHtml(title)}</h2>
        <div class="row"><span class="muted">Fabric Material</span><span class="val">${escapeHtml(fabricLabel)}</span></div>
        <div class="row"><span class="muted">Fabric Color</span><span class="val">${escapeHtml(fabricColor)}</span></div>
        <div class="row"><span class="muted">Corners</span><span class="val">${corners}</span></div>
        <div class="row"><span class="muted">Total Area</span><span class="val">${formatArea((calc?.area || 0) * 1000000, unit)}</span></div>
        <div class="row"><span class="muted">Edge Reinforcement</span><span class="val">${cfgData?.edgeType === "webbing" ? "Webbing Reinforced" : "Cabled Edge"}</span></div>
        <div class="row"><span class="muted">Thread</span><span class="val">Sewn with SolarFix\u00AE PTFE thread</span></div>`;

    case "measurements": {
      if (cfgData?.measurements) {
        const edges: string[] = [];
        for (let i = 0; i < corners; i++) {
          const next = (i + 1) % corners;
          const key = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + next)}`;
          const mm = cfgData.measurements[key];
          if (mm) edges.push(`<div class="row"><span class="muted">Edge ${key[0]} to ${key[1]}</span><span class="val">${formatMeasurement(mm, unit)}</span></div>`);
        }
        const diagonalRows: string[] = [];
        for (const key of getDiagonalKeysForCorners(corners)) {
          const mm = cfgData.measurements[key];
          if (mm) diagonalRows.push(`<div class="row"><span class="muted">Diagonal ${key[0]} to ${key[1]}</span><span class="val">${formatMeasurement(mm, unit)}</span></div>`);
        }
        const edgesBlock = `<div style="margin-bottom:10px;"><div style="font-weight:700;color:${cfg.brand.accentDark};font-size:12px;margin-bottom:4px;">Edge Lengths</div>${edges.join("") || '<div class="row"><span class="muted">No edge measurements</span></div>'}</div>`;
        const diagonalsBlock = diagonalRows.length > 0
          ? `<div><div style="font-weight:700;color:${cfg.brand.accentDark};font-size:12px;margin-bottom:4px;">Diagonal Lengths</div>${diagonalRows.join("")}</div>`
          : "";
        return `<h2>${escapeHtml(title)}</h2>${edgesBlock}${diagonalsBlock}`;
      }
      return `<h2>${escapeHtml(title)}</h2><div class="row"><span class="muted">No measurements recorded</span></div>`;
    }

    case "anchorPoints": {
      if (cfgData && Array.isArray(cfgData.fixingHeights)) {
        const rows = cfgData.fixingHeights.slice(0, corners).map((h: number, i: number) => {
          const letter = String.fromCharCode(65 + i);
          const t = cfgData.fixingTypes?.[i] || "post";
          const o = cfgData.eyeOrientations?.[i] || "horizontal";
          return `<div class="row"><span class="muted">Corner ${letter}</span><span class="val">${formatMeasurement(h || 0, unit)}, ${t}, ${o} eye</span></div>`;
        }).join("");
        return `<h2>${escapeHtml(title)}</h2>${rows}`;
      }
      return `<h2>${escapeHtml(title)}</h2><div class="row"><span class="muted">No anchor points configured</span></div>`;
    }

    case "hardwareBreakdown": {
      const hwMode = cfgData?.hardwareSelectionMode ?? (cfgData?.measurementOption === "adjust" ? "standard" : "none");
      if (hwMode === "none") {
        return `<h2>${escapeHtml(title)}</h2><div class="row"><span class="muted">No tensioning hardware included with this order.</span></div>`;
      }
      if (hwMode === "standard") {
        return `<h2>${escapeHtml(title)}</h2>
          <div class="row"><span class="muted">Hardware Tensioning Kit (${corners}-corner pack)</span><span class="val" style="color:#307C31;">Included</span></div>`;
      }
      const cornerHw = cfgData?.cornerHardware;
      if (cornerHw) {
        const rows: string[] = [];
        for (let i = 0; i < corners; i++) {
          const letter = String.fromCharCode(65 + i);
          const lines = cornerHw[i] || [];
          const cornerTotal = lines.reduce((sum: number, l: any) => {
            const liveP = l.livePriceCurrency === currency && l.livePrice != null ? l.livePrice : 0;
            return sum + liveP * l.qty;
          }, 0);
          rows.push(`<div style="padding:8px 0;border-bottom:1px solid #E5E7EB;">
            <div style="display:flex;justify-content:space-between;font-weight:700;"><span>Corner ${letter}</span><span>${formatCurrency(cornerTotal, currency)}</span></div>
            ${lines.length === 0 ? `<div style="padding-left:12px;font-size:11px;color:${cfg.brand.mutedColor};">No hardware selected</div>` : lines.map((l: any) => {
              const skuPart = l.sku ? ` (${l.sku})` : "";
              const lineLive = l.livePriceCurrency === currency && l.livePrice != null ? l.livePrice * l.qty : 0;
              return `<div style="display:flex;justify-content:space-between;padding-left:12px;font-size:11px;color:${cfg.brand.mutedColor};"><span>${l.qty}x ${escapeHtml(l.name)}${escapeHtml(skuPart)}</span><span>${formatCurrency(lineLive, currency)}</span></div>`;
            }).join("")}
          </div>`);
        }
        return `<h2>${escapeHtml(title)}</h2>${rows.join("")}`;
      }
      return `<h2>${escapeHtml(title)}</h2><div class="row"><span class="muted">Hardware details not available</span></div>`;
    }

    case "priceBreakdown":
      return `<h2>${escapeHtml(title)}</h2>
        <div class="row"><span class="muted">Shade sail</span><span class="val">${formatCurrency(total - 70, currency)}</span></div>
        <div class="row"><span class="val">Total</span><span class="val">${formatCurrency(total, currency)}</span></div>`;

    case "guarantee":
      return `<div class="guarantee"><div style="font-weight:700;margin-bottom:6px;">${escapeHtml(title)}</div>
        <div style="font-size:12px;">15-year Fabric &amp; Workmanship Warranty &middot; Weather-resistant materials &middot; Free worldwide shipping</div></div>`;

    case "pricingCallout":
      return `<div class="callout"><div style="font-size:12px;opacity:.85;">${escapeHtml(title)}</div><div class="price">${formatCurrency(total, currency)}</div></div>`;

    case "quoteMeta": {
      const fullName = [quote.customer_first_name, quote.customer_last_name].filter(Boolean).join(" ").trim();
      const name = fullName || "See Shopify Order";
      const email = quote.customer_email || "See Shopify Order";
      const ref = quote.quote_reference || "Pending";
      const date = quote.created_at
        ? new Date(quote.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const custRef = quote.customer_reference || (cfgData?.customerReference as string | undefined);
      const quoteName = quote.quote_name || (cfgData?.quoteName as string | undefined);
      return `<h2>${escapeHtml(title)}</h2>
        <div class="row"><span class="muted">Customer Name</span><span class="val">${escapeHtml(name)}</span></div>
        <div class="row"><span class="muted">Email</span><span class="val">${escapeHtml(email)}</span></div>
        <div class="row"><span class="muted">Quote Reference</span><span class="val">${escapeHtml(ref)}</span></div>
        ${quoteName ? `<div class="row"><span class="muted">Quote Name</span><span class="val">${escapeHtml(quoteName)}</span></div>` : ""}
        ${custRef ? `<div class="row"><span class="muted">Customer Reference</span><span class="val">${escapeHtml(custRef)}</span></div>` : ""}
        <div class="row"><span class="muted">Date</span><span class="val">${escapeHtml(date)}</span></div>`;
    }

    case "stepSelections": {
      const manufacturing = cfgData?.measurementOption === "exact"
        ? "Manufacture Shade Sail to the Exact Dimensions I provide"
        : "Manufacture Shade Sail to fit my Space";
      const hwMode = cfgData?.hardwareSelectionMode || (cfgData?.measurementOption === "adjust" ? "standard" : "none");
      const hwLabel = hwMode === "standard" ? `Standard tensioning kit included (${corners}-corner pack)` : hwMode === "manual" ? "Manual hardware per corner" : "No tensioning hardware";
      const edgeLabel = cfgData?.edgeType === "webbing" ? "Webbing reinforced" : "Cabled edge";
      const rows: [string, string][] = [
        ["Manufacturing Approach", manufacturing],
        ["Number of Corners", `${corners}-corner shade sail`],
        ["Measurement Units", unit === "metric" ? "Metric (mm / m)" : "Imperial (in / ft)"],
        ["Fabric", `${fabricLabel}${fabricColor ? ` - ${fabricColor}` : ""}`],
        ["Edge Reinforcement", edgeLabel],
        ["Tensioning Hardware", hwLabel],
      ];
      return `<h2>${escapeHtml(title)}</h2>${rows.map(([label, value], idx) => `<div class="row"><span class="muted">Step ${idx + 1} - ${escapeHtml(label)}</span><span class="val">${escapeHtml(value)}</span></div>`).join("")}`;
    }

    case "diagramImage": {
      const mw = Number(p.maxWidth) || 520;
      if (quote.diagram_public_url && quote.diagram_3d_public_url) {
        const halfW = Math.floor(mw / 2) - 8;
        return `<h2>${escapeHtml(title)}</h2>
          <div style="display:flex;gap:16px;justify-content:center;align-items:flex-start;flex-wrap:wrap;">
            <div style="flex:1;min-width:200px;max-width:${halfW}px;text-align:center;">
              <img src="${escapeHtml(quote.diagram_public_url)}" alt="Plan view" style="width:100%;border:1px solid #E2E8F0;border-radius:8px;padding:8px;background:#fff;" />
              <div style="font-size:11px;color:${cfg.brand.mutedColor};margin-top:6px;">Plan View</div>
            </div>
            <div style="flex:1;min-width:200px;max-width:${halfW}px;text-align:center;">
              <img src="${escapeHtml(quote.diagram_3d_public_url)}" alt="3D view" style="width:100%;border:1px solid #E2E8F0;border-radius:8px;padding:8px;background:#fff;" />
              <div style="font-size:11px;color:${cfg.brand.mutedColor};margin-top:6px;">3D View</div>
            </div>
          </div>`;
      }
      if (quote.diagram_public_url) {
        return `<h2>${escapeHtml(title)}</h2>
          <div style="text-align:center;"><img src="${escapeHtml(quote.diagram_public_url)}" alt="Shade sail diagram" style="max-width:${mw}px;width:100%;border:1px solid #E2E8F0;border-radius:8px;padding:10px;background:#fff;" /></div>`;
      }
      return `<h2>${escapeHtml(title)}</h2><div style="text-align:center;padding:16px;color:${cfg.brand.mutedColor};font-size:12px;">No diagram available</div>`;
    }

    case "diagram3D": {
      const mw3d = Number(p.maxWidth) || 520;
      if (quote.diagram_3d_public_url) {
        return `<h2>${escapeHtml(title)}</h2>
          <div style="text-align:center;"><img src="${escapeHtml(quote.diagram_3d_public_url)}" alt="3D render" style="max-width:${mw3d}px;width:100%;border:1px solid #E2E8F0;border-radius:8px;padding:10px;background:#fff;" /></div>`;
      }
      return "";
    }

    case "billOfMaterials":
      return `<h2>${escapeHtml(title)}</h2>
        <div class="row"><span class="muted">${escapeHtml(fabricLabel)} - ${escapeHtml(fabricColor)} (${formatArea((calc?.area || 0) * 1000000, unit)})</span><span class="val">${formatCurrency(total - 70, currency)}</span></div>
        <div class="row"><span class="muted">Edge reinforcement</span><span class="val">Included</span></div>
        <div class="row"><span class="muted">Hardware Tensioning Kit (${corners}-corner pack)</span><span class="val">Included</span></div>
        <div class="row"><span class="val">Total (all-inclusive)</span><span class="val">${formatCurrency(total, currency)}</span></div>`;

    case "customText": {
      const heading = p.heading ? `<div style="font-weight:700;margin-bottom:6px;color:${cfg.brand.primaryColor};">${escapeHtml(p.heading)}</div>` : "";
      return `<div style="margin:12px 0;font-size:13px;">${heading}<div>${escapeHtml(p.body || "")}</div></div>`;
    }

    case "customImage":
      return p.url ? `<div style="margin:12px 0;text-align:center;"><img src="${escapeHtml(p.url)}" alt="${escapeHtml(p.alt || "")}" style="max-width:${Number(p.width) || 400}px;width:100%;" /></div>` : "";

    case "divider":
      return `<hr style="border:none;border-top:${Number(p.thickness) || 1}px solid ${cfg.brand.mutedColor};opacity:0.4;margin:8px 0;" />`;

    case "spacer":
      return `<div style="height:${Number(p.height) || 16}px;"></div>`;

    case "pageBreak":
      return `<div style="page-break-after:always;"></div>`;

    case "resumeButton":
      return "";

    default:
      return "";
  }
}

function buildFullHtml(cfg: TemplateConfig, blocks: PdfBlock[], quote: QuoteData): string {
  const b = cfg.brand;
  const d = DENSITY[cfg.layout.density];
  const blocksHtml = blocks
    .filter((x) => x.visible && x.type !== "resumeButton")
    .map((block) => `<div class="block-wrap">${renderBlock(block, cfg, quote)}</div>`)
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>ShadeSpace Quote - ${escapeHtml(quote.quote_reference || "PDF")}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { width:688px; margin:0 auto; padding:24px; background:${b.backgroundColor}; font-family:${b.fontFamily}; color:${b.textColor}; font-size:${d.body}px; line-height:1.45; box-sizing:border-box; }
  *, *::before, *::after { box-sizing:border-box; }
  .header { display:flex; align-items:center; gap:12px; padding:16px; border-radius:12px; background:linear-gradient(135deg, #F3FFE3 0%, ${b.accentColor} 100%); border:2px solid ${b.accentDark}; margin-bottom:16px; }
  .header .meta { flex:1; }
  .logo-img { max-height:40px; max-width:180px; object-fit:contain; }
  .title { font-size:${d.title}px; font-weight:700; color:${b.primaryColor}; margin:0; }
  .tagline { font-size:${d.tagline}px; color:${b.accentDark}; margin:4px 0 0 0; }
  h2 { font-size:${d.h2}px; color:${b.primaryColor}; border-bottom:2px solid ${b.accentColor}; padding-bottom:${Math.max(2, d.rowPad - 1)}px; margin:${d.sectionMargin}px 0 ${Math.max(6, Math.round(d.sectionMargin / 2))}px; }
  .row { display:flex; justify-content:space-between; align-items:flex-start; padding:${d.rowPad}px 0; border-bottom:1px solid #E5E7EB; font-size:${d.row}px; gap:10px; }
  .row > .muted { flex:1 1 auto; }
  .row > .val { flex:0 1 auto; min-width:0; }
  .muted { color:${b.mutedColor}; }
  .val { color:${b.textColor}; font-weight:600; text-align:right; }
  .callout { margin-top:${d.sectionMargin}px; padding:${Math.max(10, d.rowPad * 2 + 6)}px; border-radius:12px; background:${b.primaryColor}; color:#fff; text-align:center; }
  .callout .price { font-size:${d.priceLg}px; font-weight:700; color:${b.accentColor}; }
  .guarantee { margin-top:${d.sectionMargin}px; padding:${Math.max(10, d.rowPad * 2 + 6)}px; border-radius:12px; background:linear-gradient(135deg, #F3FFE3 0%, ${b.accentColor} 20%); border:2px solid ${b.accentDark}; color:${b.primaryColor}; font-size:${d.row}px; }
  .footer { margin-top:24px; text-align:center; font-size:${d.small}px; color:${b.mutedColor}; }
  .block-wrap { display:block; }
  img { display:inline-block; max-width:100%; }
  .print-bar { position:fixed; top:0; left:0; right:0; background:#01312D; color:#fff; padding:12px 24px; display:flex; align-items:center; justify-content:space-between; z-index:9999; font-family:system-ui; }
  .print-bar button { background:#BFF102; color:#01312D; border:none; padding:8px 20px; border-radius:6px; font-weight:700; cursor:pointer; font-size:14px; }
  .print-bar button:hover { background:#a8d400; }
  @media print { .print-bar { display:none !important; } body { padding-top:0 !important; } }
</style>
</head><body style="padding-top:60px;">
  <div class="print-bar">
    <span>ShadeSpace Quote PDF - ${escapeHtml(quote.quote_reference || "")}</span>
    <button onclick="window.print()">Download as PDF</button>
  </div>
  <div class="header">
    ${b.logoUrl ? `<img class="logo-img" src="${escapeHtml(b.logoUrl)}" alt="logo" />` : ""}
    <div class="meta">
      <h1 class="title">${escapeHtml(cfg.header.title)}</h1>
      <p class="tagline">${escapeHtml(cfg.header.tagline)}</p>
    </div>
  </div>
  ${blocksHtml}
  <div class="footer">
    <div>${escapeHtml(cfg.footer.line1)}</div>
    <div>${escapeHtml(cfg.footer.line2)}</div>
  </div>
</body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get("ref");
    const quoteId = url.searchParams.get("id");

    if (!ref && !quoteId) {
      return new Response(
        JSON.stringify({ error: "Query parameter 'ref' (quote reference) or 'id' (quote ID) is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SB_URL, SB_SERVICE);

    // Look up the quote
    let quote: QuoteData | null = null;
    if (quoteId) {
      const { data } = await supabase
        .from("saved_quotes")
        .select("id, quote_reference, quote_name, customer_first_name, customer_last_name, customer_email, customer_reference, access_token, diagram_public_url, diagram_3d_public_url, created_at, config_data, calculations_data")
        .eq("id", quoteId)
        .maybeSingle();
      quote = data;
    } else if (ref) {
      const { data } = await supabase
        .from("saved_quotes")
        .select("id, quote_reference, quote_name, customer_first_name, customer_last_name, customer_email, customer_reference, access_token, diagram_public_url, diagram_3d_public_url, created_at, config_data, calculations_data")
        .eq("quote_reference", ref.toUpperCase())
        .maybeSingle();
      quote = data;
    }

    if (!quote) {
      return new Response(
        JSON.stringify({ error: "Quote not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Load the active PDF template from DB (or use defaults)
    let templateConfig = DEFAULT_CONFIG;
    let blocks: PdfBlock[] = DEFAULT_BLOCKS;

    const { data: tpl } = await supabase
      .from("pdf_templates")
      .select("config, blocks")
      .eq("is_active", true)
      .maybeSingle();

    if (tpl) {
      const tplCfg = (tpl.config || {}) as Record<string, any>;
      templateConfig = {
        brand: { ...DEFAULT_CONFIG.brand, ...(tplCfg.brand || {}) },
        header: { ...DEFAULT_CONFIG.header, ...(tplCfg.header || {}) },
        footer: { ...DEFAULT_CONFIG.footer, ...(tplCfg.footer || {}) },
        paper: tplCfg.paper || DEFAULT_CONFIG.paper,
        layout: {
          density: tplCfg.layout?.density || DEFAULT_CONFIG.layout.density,
          columns: tplCfg.layout?.columns === 2 ? 2 : 1,
          columnGap: tplCfg.layout?.columnGap,
        },
      };
      if (Array.isArray(tpl.blocks) && tpl.blocks.length > 0) {
        blocks = tpl.blocks.filter((b: any) => b && typeof b === "object").map((b: any) => ({
          id: b.id || `b-${Math.random().toString(36).slice(2, 8)}`,
          type: b.type || "customText",
          visible: b.visible !== false,
          props: b.props || {},
        }));
      }
    }

    // Build the HTML
    const html = buildFullHtml(templateConfig, blocks, quote);

    return new Response(html, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("serve-order-pdf error:", msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

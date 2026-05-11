export type BlockType =
  | 'summary'
  | 'measurements'
  | 'anchorPoints'
  | 'hardwareBreakdown'
  | 'priceBreakdown'
  | 'guarantee'
  | 'pricingCallout'
  | 'quoteMeta'
  | 'stepSelections'
  | 'diagramImage'
  | 'billOfMaterials'
  | 'resumeButton'
  | 'customText'
  | 'customImage'
  | 'customHtml'
  | 'divider'
  | 'spacer';

export interface PdfBlock {
  id: string;
  type: BlockType;
  visible: boolean;
  props: Record<string, unknown>;
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  summary: 'Shade Sail Summary',
  measurements: 'Precise Measurements',
  anchorPoints: 'Anchor Point Configuration',
  hardwareBreakdown: 'Corner Hardware Breakdown',
  priceBreakdown: 'Price Breakdown',
  guarantee: 'Premium Quality Guarantee',
  pricingCallout: 'Pricing Callout',
  quoteMeta: 'Quote Details (Customer + Reference)',
  stepSelections: 'Configurator Step Selections',
  diagramImage: 'Shade Sail Diagram',
  billOfMaterials: 'Itemised Bill of Materials',
  resumeButton: 'Resume Quote Button',
  customText: 'Custom Text',
  customImage: 'Custom Image',
  customHtml: 'Custom HTML',
  divider: 'Divider',
  spacer: 'Spacer',
};

export const DYNAMIC_TYPES: BlockType[] = [
  'summary',
  'measurements',
  'anchorPoints',
  'hardwareBreakdown',
  'priceBreakdown',
  'guarantee',
  'pricingCallout',
  'quoteMeta',
  'stepSelections',
  'diagramImage',
  'billOfMaterials',
  'resumeButton',
];

export const DEFAULT_BLOCKS: PdfBlock[] = [
  { id: 'b-quoteMeta', type: 'quoteMeta', visible: true, props: { title: 'Quote Details' } },
  { id: 'b-steps', type: 'stepSelections', visible: true, props: { title: 'Your Configurator Selections' } },
  { id: 'b-diagram', type: 'diagramImage', visible: true, props: { title: 'Shade Sail Diagram', maxWidth: 520 } },
  { id: 'b-summary', type: 'summary', visible: true, props: { title: 'Shade Sail Summary' } },
  { id: 'b-measurements', type: 'measurements', visible: true, props: { title: 'Precise Measurements' } },
  { id: 'b-anchor', type: 'anchorPoints', visible: true, props: { title: 'Anchor Point Configuration' } },
  { id: 'b-hardware', type: 'hardwareBreakdown', visible: true, props: { title: 'Corner Hardware Breakdown' } },
  { id: 'b-bom', type: 'billOfMaterials', visible: true, props: { title: 'Itemised Bill of Materials' } },
  { id: 'b-price', type: 'priceBreakdown', visible: true, props: { title: 'Price Breakdown' } },
  { id: 'b-guarantee', type: 'guarantee', visible: true, props: { title: 'Premium Quality Guarantee' } },
  { id: 'b-callout', type: 'pricingCallout', visible: true, props: { title: 'All-Inclusive Price to Your Door' } },
  { id: 'b-resume', type: 'resumeButton', visible: true, props: { title: 'Resume Your Quote & Add to Cart', label: 'Open My Saved Quote' } },
];

export function makeDefaultProps(type: BlockType): Record<string, unknown> {
  switch (type) {
    case 'customText':
      return { heading: '', body: 'Add your custom text here.', align: 'left' };
    case 'customImage':
      return { url: '', alt: '', width: 400 };
    case 'customHtml':
      return { html: '<p>Custom HTML</p>' };
    case 'divider':
      return { thickness: 1 };
    case 'spacer':
      return { height: 16 };
    case 'diagramImage':
      return { title: 'Shade Sail Diagram', maxWidth: 520 };
    case 'resumeButton':
      return { title: 'Resume Your Quote & Add to Cart', label: 'Open My Saved Quote' };
    default:
      return { title: BLOCK_LABELS[type] };
  }
}

export function newBlockId(): string {
  return `b-${Math.random().toString(36).slice(2, 10)}`;
}

export function escapeHtml(s: unknown): string {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] as string));
}

/**
 * Allow a narrow set of HTML tags in customHtml blocks.
 * Strips <script>, <iframe>, event handlers, and javascript: URLs.
 */
export function sanitizeCustomHtml(html: string): string {
  if (!html) return '';
  let out = html;
  out = out.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, '');
  out = out.replace(/<\s*iframe[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi, '');
  out = out.replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, '');
  out = out.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  out = out.replace(/javascript:/gi, '');
  return out;
}

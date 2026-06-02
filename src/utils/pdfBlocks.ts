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
  | 'diagram3D'
  | 'billOfMaterials'
  | 'resumeButton'
  | 'orderDetails'
  | 'customText'
  | 'customImage'
  | 'customHtml'
  | 'divider'
  | 'spacer'
  | 'pageBreak';

export type BlockColumn = 'full' | 'left' | 'right';

export interface PdfBlock {
  id: string;
  type: BlockType;
  visible: boolean;
  props: Record<string, unknown>;
}

export function getBlockColumn(block: PdfBlock): BlockColumn {
  const v = block.props?.column;
  return v === 'left' || v === 'right' ? v : 'full';
}

function getBlockDensityOverride(block: PdfBlock): 'comfortable' | 'compact' | 'ultra' | undefined {
  const v = block.props?.densityOverride;
  return v === 'comfortable' || v === 'compact' || v === 'ultra' ? v : undefined;
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
  diagram3D: '3D Shade Sail Render',
  billOfMaterials: 'Itemised Bill of Materials',
  resumeButton: 'Resume Quote Button',
  orderDetails: 'Order Details (Fulfilment)',
  customText: 'Custom Text',
  customImage: 'Custom Image',
  customHtml: 'Custom HTML',
  divider: 'Divider',
  spacer: 'Spacer',
  pageBreak: 'Page Break',
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
  'diagram3D',
  'billOfMaterials',
  'resumeButton',
  'orderDetails',
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

export const DEFAULT_FULFILMENT_BLOCKS: PdfBlock[] = [
  { id: 'f-order', type: 'orderDetails', visible: true, props: { title: 'Order Details' } },
  { id: 'f-diagram', type: 'diagramImage', visible: true, props: { title: 'Shade Sail Diagram', maxWidth: 520 } },
  { id: 'f-summary', type: 'summary', visible: true, props: { title: 'Configuration Summary' } },
  { id: 'f-measurements', type: 'measurements', visible: true, props: { title: 'Measurements' } },
  { id: 'f-anchor', type: 'anchorPoints', visible: true, props: { title: 'Anchor Points' } },
  { id: 'f-hardware', type: 'hardwareBreakdown', visible: true, props: { title: 'Hardware Breakdown' } },
  { id: 'f-steps', type: 'stepSelections', visible: true, props: { title: 'Step-by-Step Selections' } },
];

export function makeDefaultProps(type: BlockType): Record<string, unknown> {
  const base = { column: 'full' as BlockColumn };
  switch (type) {
    case 'customText':
      return { ...base, heading: '', body: 'Add your custom text here.', align: 'left' };
    case 'customImage':
      return { ...base, url: '', alt: '', width: 400 };
    case 'customHtml':
      return { ...base, html: '<p>Custom HTML</p>' };
    case 'divider':
      return { ...base, thickness: 1 };
    case 'spacer':
      return { ...base, height: 16 };
    case 'pageBreak':
      return {};
    case 'diagramImage':
      return { ...base, title: 'Shade Sail Diagram', maxWidth: 520 };
    case 'diagram3D':
      return { ...base, title: '3D Shade Sail Render', maxWidth: 520 };
    case 'resumeButton':
      return { ...base, title: 'Resume Your Quote & Add to Cart', label: 'Open My Saved Quote' };
    case 'orderDetails':
      return { ...base, title: 'Order Details', showRows: { customerName: true, email: true, quoteReference: true, shopifyOrderNumber: true, shippingAddress: true, weight: true, orderNotes: true, date: true } };
    default:
      return { ...base, title: BLOCK_LABELS[type] };
  }
}

export function newBlockId(): string {
  return `b-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Defines which rows each dynamic block type can show/hide.
 * Used by PdfStudio to render row-level visibility toggles.
 */
export const BLOCK_ROW_DEFINITIONS: Partial<Record<BlockType, { key: string; label: string }[]>> = {
  orderDetails: [
    { key: 'customerName', label: 'Customer Name' },
    { key: 'email', label: 'Email' },
    { key: 'quoteReference', label: 'Quote Reference' },
    { key: 'shopifyOrderNumber', label: 'Shopify Order Number' },
    { key: 'shippingAddress', label: 'Shipping Address' },
    { key: 'weight', label: 'Estimated Weight' },
    { key: 'orderNotes', label: 'Order Notes' },
    { key: 'date', label: 'Date' },
  ],
  quoteMeta: [
    { key: 'customerName', label: 'Customer Name' },
    { key: 'email', label: 'Email' },
    { key: 'quoteReference', label: 'Quote Reference' },
    { key: 'quoteName', label: 'Quote Name' },
    { key: 'customerReference', label: 'Customer Reference' },
    { key: 'date', label: 'Date' },
  ],
  summary: [
    { key: 'fabricMaterial', label: 'Fabric Material' },
    { key: 'fabricColor', label: 'Fabric Color' },
    { key: 'corners', label: 'Corners' },
    { key: 'totalArea', label: 'Total Area' },
    { key: 'edgeReinforcement', label: 'Edge Reinforcement' },
    { key: 'thread', label: 'Thread' },
    { key: 'fabricationMethod', label: 'Fabrication Method' },
  ],
  stepSelections: [
    { key: 'manufacturing', label: 'Manufacturing Approach' },
    { key: 'fabrication', label: 'Fabrication Method' },
    { key: 'corners', label: 'Number of Corners' },
    { key: 'units', label: 'Measurement Units' },
    { key: 'fabric', label: 'Fabric' },
    { key: 'edge', label: 'Edge Reinforcement' },
    { key: 'hardware', label: 'Tensioning Hardware' },
    { key: 'fixingPoints', label: 'Fixing Points' },
  ],
  priceBreakdown: [
    { key: 'shadeSail', label: 'Shade Sail Cost' },
    { key: 'hardware', label: 'Hardware Cost' },
    { key: 'total', label: 'Total' },
  ],
};

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

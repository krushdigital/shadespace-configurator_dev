import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface RenderQuotePdfOptions {
  paper?: 'A4' | 'Letter';
  /** When true, returns blob URL via URL.createObjectURL. */
  returnBlobUrl?: boolean;
  /** When true, returns the data URI string (for email attachments). */
  returnDataUri?: boolean;
  /** Filename used when neither returnBlobUrl nor returnDataUri is set. */
  filename?: string;
}

const PAPER_DIMS_MM: Record<'A4' | 'Letter', { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
};

/**
 * Render an HTML string to a multipage PDF that visually matches the source HTML.
 * Captures the rendered DOM with html2canvas then slices the resulting bitmap into
 * page-height segments and pastes each onto a jsPDF page.
 */
export async function renderQuotePdfFromHtml(
  html: string,
  options: RenderQuotePdfOptions = {},
): Promise<string | void> {
  const paper: 'A4' | 'Letter' = options.paper === 'Letter' ? 'Letter' : 'A4';
  const dims = PAPER_DIMS_MM[paper];

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);
  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error('iframe contentDocument unavailable');
    doc.open();
    doc.write(html);
    doc.close();

    await waitForFonts(doc);
    await waitForImages(doc);

    const body = doc.body as HTMLElement;
    body.style.width = '794px';

    const canvas = await html2canvas(body, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      windowWidth: 794,
      windowHeight: body.scrollHeight,
      width: 794,
      height: body.scrollHeight,
    });

    const pxPerMm = canvas.width / dims.width;
    const FOOTER_RESERVE_MM = 12;
    const usableHeightMm = dims.height - FOOTER_RESERVE_MM;
    const pageHeightPx = Math.floor(usableHeightMm * pxPerMm);
    const cssScale = canvas.height / body.scrollHeight;

    const breaks = computePageBreaks(body, canvas.height, pageHeightPx, cssScale);

    const pdf = new jsPDF('p', 'mm', paper === 'Letter' ? 'letter' : 'a4');

    for (let i = 0; i < breaks.length; i++) {
      const start = breaks[i];
      const end = i + 1 < breaks.length ? breaks[i + 1] : canvas.height;
      const sliceHeight = Math.max(1, end - start);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeight;
      const sctx = sliceCanvas.getContext('2d');
      if (!sctx) throw new Error('canvas 2d context unavailable');
      sctx.fillStyle = '#ffffff';
      sctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      sctx.drawImage(canvas, 0, start, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      if (i > 0) pdf.addPage();
      const imgData = sliceCanvas.toDataURL('image/png');
      const sliceMmHeight = sliceHeight / pxPerMm;
      pdf.addImage(imgData, 'PNG', 0, 0, dims.width, Math.min(sliceMmHeight, usableHeightMm), undefined, 'FAST');
    }

    // Page numbers
    const total = pdf.getNumberOfPages();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    for (let p = 1; p <= total; p++) {
      pdf.setPage(p);
      pdf.text(`Page ${p} of ${total}`, dims.width - 12, dims.height - 6, { align: 'right' });
    }

    if (options.returnDataUri) {
      return pdf.output('datauristring');
    }
    if (options.returnBlobUrl) {
      const blob = pdf.output('blob');
      return URL.createObjectURL(blob);
    }
    pdf.save(options.filename || `ShadeSpace-Quote-${new Date().toISOString().slice(0, 10)}.pdf`);
    return undefined;
  } finally {
    iframe.remove();
  }
}

/**
 * Compute page-break Y offsets (in canvas pixels) using DOM-aware atomic units.
 * Walks top-level layout blocks plus their nested column children so that two-column
 * rows split cleanly when one column is much taller than the other.
 */
function computePageBreaks(
  body: HTMLElement,
  canvasHeight: number,
  pageHeightPx: number,
  cssScale: number,
): number[] {
  const atoms: Array<{ top: number; bottom: number; hardBreak?: boolean }> = [];

  const collectAtoms = (root: HTMLElement) => {
    const children = Array.from(root.children) as HTMLElement[];
    for (const el of children) {
      if (el.getAttribute('data-pagebreak') === '1') {
        atoms.push({
          top: el.offsetTop,
          bottom: el.offsetTop + el.offsetHeight,
          hardBreak: true,
        });
        continue;
      }
      if (el.classList.contains('two-col')) {
        const cols = Array.from(el.querySelectorAll(':scope > .col')) as HTMLElement[];
        const colChildren: HTMLElement[][] = cols.map((c) => Array.from(c.children) as HTMLElement[]);
        const maxLen = Math.max(...colChildren.map((c) => c.length), 0);
        for (let i = 0; i < maxLen; i++) {
          const tops: number[] = [];
          const bottoms: number[] = [];
          for (const list of colChildren) {
            const child = list[i];
            if (!child) continue;
            tops.push(child.offsetTop + (child.offsetParent === el ? 0 : child.offsetParent ? (child.offsetParent as HTMLElement).offsetTop : 0));
            bottoms.push(tops[tops.length - 1] + child.offsetHeight);
          }
          if (tops.length === 0) continue;
          // Use document-relative offsets via getBoundingClientRect for accuracy
          const rects = colChildren.map((list) => list[i]).filter(Boolean).map((c) => c!.getBoundingClientRect());
          const bodyRect = body.getBoundingClientRect();
          const top = Math.min(...rects.map((r) => r.top - bodyRect.top));
          const bottom = Math.max(...rects.map((r) => r.bottom - bodyRect.top));
          atoms.push({ top, bottom });
        }
        continue;
      }
      const rect = el.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      atoms.push({ top: rect.top - bodyRect.top, bottom: rect.bottom - bodyRect.top });
    }
  };

  collectAtoms(body);
  atoms.sort((a, b) => a.top - b.top);

  const breaksCss: number[] = [0];
  let pageStartCss = 0;
  for (const atom of atoms) {
    if (atom.hardBreak) {
      if (atom.top > pageStartCss + 1) {
        breaksCss.push(atom.top);
        pageStartCss = atom.top;
      }
      continue;
    }
    const atomHeight = atom.bottom - atom.top;
    const pageHeightCss = pageHeightPx / cssScale;
    if (atom.bottom - pageStartCss > pageHeightCss) {
      if (atomHeight > pageHeightCss) {
        // Atom itself exceeds a page; let it span — start a new page at its top if not already there.
        if (atom.top > pageStartCss + 1) {
          breaksCss.push(atom.top);
          pageStartCss = atom.top;
        }
        // Then advance page starts in pageHeightCss increments through this atom.
        while (atom.bottom - pageStartCss > pageHeightCss) {
          pageStartCss += pageHeightCss;
          breaksCss.push(pageStartCss);
        }
      } else {
        breaksCss.push(atom.top);
        pageStartCss = atom.top;
      }
    }
  }

  // Convert CSS px to canvas px and clamp
  const breaksCanvas = breaksCss
    .map((y) => Math.round(y * cssScale))
    .map((y) => Math.max(0, Math.min(canvasHeight, y)));
  // Deduplicate and ensure ascending
  const dedup: number[] = [];
  for (const b of breaksCanvas) {
    if (dedup.length === 0 || b > dedup[dedup.length - 1] + 1) dedup.push(b);
  }
  if (dedup.length === 0 || dedup[0] !== 0) dedup.unshift(0);
  return dedup;
}

async function waitForImages(doc: Document, timeoutMs = 8000): Promise<void> {
  const imgs = Array.from(doc.images || []);
  if (imgs.length === 0) return;
  const promises = imgs.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const done = () => resolve();
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
  });
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([Promise.all(promises).then(() => undefined), timeout]);
}

async function waitForFonts(doc: Document): Promise<void> {
  try {
    const fonts = (doc as Document & { fonts?: { ready: Promise<unknown> } }).fonts;
    if (fonts?.ready) {
      await Promise.race([
        fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
    }
  } catch {
    // ignore
  }
}

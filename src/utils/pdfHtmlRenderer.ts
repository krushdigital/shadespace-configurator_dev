import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface RenderQuotePdfOptions {
  paper?: 'A4' | 'Letter';
  returnBlobUrl?: boolean;
  returnDataUri?: boolean;
  filename?: string;
}

const PAPER_DIMS_MM: Record<'A4' | 'Letter', { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
};

const MARGIN_TOP_MM = 14;
const MARGIN_BOTTOM_MM = 16;
const MARGIN_LEFT_MM = 14;
const MARGIN_RIGHT_MM = 14;
const PX_PER_MM = 96 / 25.4;

/**
 * Render an HTML string into a multipage PDF. Each top-level block is captured
 * as its own bitmap, then bin-packed onto pages with consistent margins so a
 * block is never split across a page boundary.
 */
export async function renderQuotePdfFromHtml(
  html: string,
  options: RenderQuotePdfOptions = {},
): Promise<string | void> {
  const paper: 'A4' | 'Letter' = options.paper === 'Letter' ? 'Letter' : 'A4';
  const dims = PAPER_DIMS_MM[paper];
  const contentWidthMm = dims.width - MARGIN_LEFT_MM - MARGIN_RIGHT_MM;
  const contentHeightMm = dims.height - MARGIN_TOP_MM - MARGIN_BOTTOM_MM;
  const bodyWidthPx = Math.round(contentWidthMm * PX_PER_MM);

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${bodyWidthPx}px`;
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
    body.style.width = `${bodyWidthPx}px`;
    body.style.padding = '0';
    body.style.margin = '0';

    const blockEls = Array.from(body.children).filter(
      (n): n is HTMLElement => n.nodeType === 1,
    );

    const pdf = new jsPDF('p', 'mm', paper === 'Letter' ? 'letter' : 'a4');

    let cursorMm = 0;
    let pageStarted = false;

    const startNewPage = () => {
      if (pageStarted) pdf.addPage();
      pageStarted = true;
      cursorMm = 0;
    };

    startNewPage();

    for (const el of blockEls) {
      if (el.dataset.pagebreak === '1') {
        cursorMm = contentHeightMm;
        continue;
      }

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const blockCanvas = await html2canvas(el, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        windowWidth: bodyWidthPx,
        windowHeight: body.scrollHeight,
      });

      const blockHeightMm = (blockCanvas.height / blockCanvas.width) * contentWidthMm;

      if (blockHeightMm > contentHeightMm) {
        const childEls = Array.from(el.children) as HTMLElement[];
        if (childEls.length > 1) {
          if (cursorMm > 0) startNewPage();
          for (const child of childEls) {
            await placeElementWithBinPack(
              pdf,
              child,
              body,
              bodyWidthPx,
              contentWidthMm,
              contentHeightMm,
              () => cursorMm,
              (n) => { cursorMm = n; },
              startNewPage,
            );
          }
          continue;
        }
        if (cursorMm > 0) startNewPage();
        sliceCanvasAcrossPages(pdf, blockCanvas, contentWidthMm, contentHeightMm, startNewPage);
        cursorMm = contentHeightMm;
        continue;
      }

      if (cursorMm + blockHeightMm > contentHeightMm + 0.01) {
        startNewPage();
      }

      const imgData = blockCanvas.toDataURL('image/png');
      pdf.addImage(
        imgData,
        'PNG',
        MARGIN_LEFT_MM,
        MARGIN_TOP_MM + cursorMm,
        contentWidthMm,
        blockHeightMm,
        undefined,
        'FAST',
      );
      cursorMm += blockHeightMm;
    }

    const total = pdf.getNumberOfPages();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    for (let p = 1; p <= total; p++) {
      pdf.setPage(p);
      pdf.text(
        `Page ${p} of ${total}`,
        dims.width - MARGIN_RIGHT_MM,
        dims.height - MARGIN_BOTTOM_MM / 2,
        { align: 'right' },
      );
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

async function placeElementWithBinPack(
  pdf: jsPDF,
  el: HTMLElement,
  body: HTMLElement,
  bodyWidthPx: number,
  contentWidthMm: number,
  contentHeightMm: number,
  getCursor: () => number,
  setCursor: (n: number) => void,
  startNewPage: () => void,
) {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const canvas = await html2canvas(el, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    windowWidth: bodyWidthPx,
    windowHeight: body.scrollHeight,
  });
  const heightMm = (canvas.height / canvas.width) * contentWidthMm;
  if (heightMm > contentHeightMm) {
    if (getCursor() > 0) startNewPage();
    sliceCanvasAcrossPages(pdf, canvas, contentWidthMm, contentHeightMm, startNewPage);
    setCursor(contentHeightMm);
    return;
  }
  if (getCursor() + heightMm > contentHeightMm + 0.01) {
    startNewPage();
  }
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(
    imgData,
    'PNG',
    MARGIN_LEFT_MM,
    MARGIN_TOP_MM + getCursor(),
    contentWidthMm,
    heightMm,
    undefined,
    'FAST',
  );
  setCursor(getCursor() + heightMm);
}

function sliceCanvasAcrossPages(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  contentWidthMm: number,
  contentHeightMm: number,
  startNewPage: () => void,
) {
  const pxPerMm = canvas.width / contentWidthMm;
  const pageHeightPx = Math.floor(contentHeightMm * pxPerMm);
  let y = 0;
  let first = true;
  while (y < canvas.height) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - y);
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeight;
    const ctx = sliceCanvas.getContext('2d');
    if (!ctx) break;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    if (!first) startNewPage();
    first = false;
    const sliceMm = sliceHeight / pxPerMm;
    pdf.addImage(
      sliceCanvas.toDataURL('image/png'),
      'PNG',
      MARGIN_LEFT_MM,
      MARGIN_TOP_MM,
      contentWidthMm,
      sliceMm,
      undefined,
      'FAST',
    );
    y += sliceHeight;
  }
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

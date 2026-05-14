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
    const pageHeightPx = Math.floor(dims.height * pxPerMm);

    const pdf = new jsPDF('p', 'mm', paper === 'Letter' ? 'letter' : 'a4');

    let renderedY = 0;
    let pageIndex = 0;

    while (renderedY < canvas.height) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - renderedY);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeight;
      const sctx = sliceCanvas.getContext('2d');
      if (!sctx) throw new Error('canvas 2d context unavailable');
      sctx.fillStyle = '#ffffff';
      sctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      sctx.drawImage(
        canvas,
        0,
        renderedY,
        canvas.width,
        sliceHeight,
        0,
        0,
        canvas.width,
        sliceHeight,
      );

      if (pageIndex > 0) pdf.addPage();
      const imgData = sliceCanvas.toDataURL('image/png');
      const sliceMmHeight = sliceHeight / pxPerMm;
      pdf.addImage(imgData, 'PNG', 0, 0, dims.width, sliceMmHeight, undefined, 'FAST');

      pageIndex += 1;
      renderedY += sliceHeight;
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

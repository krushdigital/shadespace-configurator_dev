export interface ParsedSketchData {
  corners: number;
  unit: 'metric' | 'imperial';
  edges: {
    label: string;
    value: number;
    confidence: 'high' | 'medium' | 'low';
  }[];
  diagonals: {
    label: string;
    value: number;
    confidence: 'high' | 'medium' | 'low';
  }[];
  heights: {
    corner: string;
    value: number;
    confidence: 'high' | 'medium' | 'low';
  }[];
  notes?: string;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_DIMENSION = 1500;
const JPEG_QUALITY = 0.8;

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPTED_PDF_TYPE = 'application/pdf';

export function isAcceptedFile(file: File): boolean {
  return ACCEPTED_IMAGE_TYPES.includes(file.type) || file.type === ACCEPTED_PDF_TYPE;
}

export function isFileTooLarge(file: File): boolean {
  return file.size > MAX_FILE_SIZE;
}

function resizeImage(file: File): Promise<{ base64: string; mimeType: 'image/jpeg' }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not create canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, mimeType: 'image/jpeg' });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image file'));
    };

    img.src = url;
  });
}

async function renderPdfFirstPage(file: File): Promise<{ base64: string; mimeType: 'image/png' }> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const scale = 2;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  await page.render({ canvasContext: ctx, viewport }).promise;

  // Resize if needed
  let { width, height } = canvas;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const resizeScale = MAX_DIMENSION / Math.max(width, height);
    const newWidth = Math.round(width * resizeScale);
    const newHeight = Math.round(height * resizeScale);
    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = newWidth;
    resizedCanvas.height = newHeight;
    const resizedCtx = resizedCanvas.getContext('2d');
    if (!resizedCtx) throw new Error('Could not create canvas context');
    resizedCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
    const dataUrl = resizedCanvas.toDataURL('image/png');
    return { base64: dataUrl.split(',')[1], mimeType: 'image/png' };
  }

  const dataUrl = canvas.toDataURL('image/png');
  return { base64: dataUrl.split(',')[1], mimeType: 'image/png' };
}

export async function prepareFileForUpload(file: File): Promise<{ base64: string; mimeType: 'image/jpeg' | 'image/png' }> {
  if (isFileTooLarge(file)) {
    throw new Error('File is too large. Maximum size is 20MB.');
  }

  if (!isAcceptedFile(file)) {
    throw new Error('File type not supported. Please upload a JPG, PNG, or PDF file.');
  }

  if (file.type === ACCEPTED_PDF_TYPE) {
    return renderPdfFirstPage(file);
  }

  return resizeImage(file);
}

export async function parseSketch(base64: string, mimeType: 'image/jpeg' | 'image/png'): Promise<ParsedSketchData> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/parse-sketch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'Apikey': anonKey,
      },
      signal: controller.signal,
      body: JSON.stringify({ image_base64: base64, mime_type: mimeType }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(body.error || `Request failed (${response.status})`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to read sketch');
    }

    return result.data as ParsedSketchData;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Processing timed out. Please try again with a clearer image.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

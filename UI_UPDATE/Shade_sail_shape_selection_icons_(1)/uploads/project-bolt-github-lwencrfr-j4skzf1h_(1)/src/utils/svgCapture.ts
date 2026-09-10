const STYLE_PROPERTIES = [
  'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap',
  'font-family', 'font-size', 'font-weight', 'font-style',
  'text-anchor', 'dominant-baseline', 'opacity', 'filter',
  'clip-path', 'clip-rule', 'fill-rule', 'fill-opacity', 'stroke-opacity',
  'visibility', 'display', 'transform', 'letter-spacing'
];

function inlineStyles(element: Element): void {
  if (!(element instanceof SVGElement) && !(element instanceof HTMLElement)) return;

  const computed = window.getComputedStyle(element);

  for (const prop of STYLE_PROPERTIES) {
    const value = computed.getPropertyValue(prop);
    if (value && value !== 'none' && value !== 'normal' && value !== '' && value !== 'auto') {
      if (prop === 'fill') {
        const existingFill = element.getAttribute('fill');
        if (existingFill && existingFill.startsWith('url(')) continue;
        if (existingFill === 'transparent' || existingFill === 'none') continue;
      }
      if (prop === 'stroke') {
        const existingStroke = element.getAttribute('stroke');
        if (existingStroke && existingStroke.startsWith('url(')) continue;
      }
      (element as HTMLElement).style.setProperty(prop, value);
    }
  }

  for (const child of Array.from(element.children)) {
    inlineStyles(child);
  }
}

function removeClassAttributes(element: Element): void {
  element.removeAttribute('class');
  for (const child of Array.from(element.children)) {
    removeClassAttributes(child);
  }
}

export async function captureSvgToBase64Png(
  svgElement: SVGSVGElement,
  width: number = 800,
  height: number = 800
): Promise<string> {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '-9999px';
  tempContainer.style.width = `${width}px`;
  tempContainer.style.height = `${height}px`;
  document.body.appendChild(tempContainer);

  const tempSvg = svgElement.cloneNode(true) as SVGSVGElement;
  tempSvg.style.width = `${width}px`;
  tempSvg.style.height = `${height}px`;
  tempContainer.appendChild(tempSvg);

  await new Promise(resolve => requestAnimationFrame(resolve));

  inlineStyles(tempSvg);

  const serializer = new XMLSerializer();
  const styledSvgString = serializer.serializeToString(tempSvg);

  document.body.removeChild(tempContainer);

  const parser = new DOMParser();
  const doc = parser.parseFromString(styledSvgString, 'image/svg+xml');
  const finalSvg = doc.documentElement;

  removeClassAttributes(finalSvg);

  finalSvg.setAttribute('width', String(width));
  finalSvg.setAttribute('height', String(height));

  const foreignObjects = finalSvg.querySelectorAll('foreignObject');
  foreignObjects.forEach(fo => fo.parentNode?.removeChild(fo));

  const finalSvgString = serializer.serializeToString(finalSvg);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([finalSvgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      URL.revokeObjectURL(url);

      try {
        const pngDataUrl = canvas.toDataURL('image/png');
        resolve(pngDataUrl);
      } catch (e) {
        reject(new Error('Canvas tainted - could not export PNG'));
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to render SVG to image'));
    };

    img.src = url;
  });
}

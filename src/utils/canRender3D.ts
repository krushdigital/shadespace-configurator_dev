export type Device3DTier = 'high' | 'low' | 'none';

export function canRender3D(): Device3DTier {
  if (typeof window === 'undefined') return 'none';

  // WebGL2 is required
  const testCanvas = document.createElement('canvas');
  const gl = testCanvas.getContext('webgl2');
  if (!gl) return 'none';

  const width = window.innerWidth;
  const cores = navigator.hardwareConcurrency || 2;
  const memory = (navigator as any).deviceMemory as number | undefined;

  // High tier: tablet or larger, 4+ cores, 4+ GB RAM
  if (width >= 768 && cores >= 4 && (memory === undefined || memory >= 4)) {
    return 'high';
  }

  // Low tier: WebGL2 exists but device is smaller or weaker
  if (width >= 640 && cores >= 2) {
    return 'low';
  }

  return 'none';
}

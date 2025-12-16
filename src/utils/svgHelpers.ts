import { Point } from '../types';
import { FABRICS } from '../data/fabrics';

// Helper function to calculate outward position for labels
export function getOutwardPosition(
  point: Point, 
  centroid: Point, 
  offset: number = 25
): Point {
  const dx = point.x - centroid.x;
  const dy = point.y - centroid.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length === 0) return { x: point.x + offset, y: point.y - offset };
  
  const normalizedX = dx / length;
  const normalizedY = dy / length;
  
  return {
    x: point.x + normalizedX * offset,
    y: point.y + normalizedY * offset
  };
}

// Get selected color for corner points based on fabric selection
export function getSelectedColor(fabricType: string, fabricColor: string): string {
  const selectedFabric = fabricType ?
    FABRICS.find((f: any) => f.id === fabricType) : null;
  const selectedColorObj = selectedFabric?.colors.find((c: any) => c.name === fabricColor);

  if (selectedColorObj?.textColor === '#FFFFFF') {
    return '#1f2937'; // Dark fabric, use a dark outline
  } else {
    return '#0f172a'; // Light fabric, use a darker outline for contrast
  }
}

// Helper function to calculate edge label position
export function getEdgeLabelPosition(
  fromPoint: Point,
  toPoint: Point,
  centroid: Point,
  offset: number = 35
): Point {
  const midX = (fromPoint.x + toPoint.x) / 2;
  const midY = (fromPoint.y + toPoint.y) / 2;

  const edgeX = toPoint.x - fromPoint.x;
  const edgeY = toPoint.y - fromPoint.y;

  const perpX = -edgeY;
  const perpY = edgeX;

  const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
  if (perpLength === 0) return { x: midX, y: midY - offset };

  const normalizedPerpX = perpX / perpLength;
  const normalizedPerpY = perpY / perpLength;

  const toCentroidX = centroid.x - midX;
  const toCentroidY = centroid.y - midY;

  const dotProduct = normalizedPerpX * toCentroidX + normalizedPerpY * toCentroidY;
  const direction = dotProduct > 0 ? -1 : 1;

  return {
    x: midX + normalizedPerpX * offset * direction,
    y: midY + normalizedPerpY * offset * direction
  };
}

// Calculate dynamic viewBox to ensure all content is visible
export function calculateDynamicViewBox(
  points: Point[],
  corners: number,
  isMobile: boolean = false,
  compact: boolean = false,
  showAccuracyBadge: boolean = false,
  forPdfCapture: boolean = false
): { x: number; y: number; width: number; height: number; viewBoxString: string } {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 600, height: 600, viewBoxString: '0 0 600 600' };
  }

  const centroid = {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length
  };

  const labelOffset = compact ? 20 : (isMobile ? 40 : 25);
  const edgeLabelOffset = compact ? 25 : (isMobile ? 45 : 35);

  if (forPdfCapture) {
    return { x: 0, y: 0, width: 600, height: 600, viewBoxString: '0 0 600 600' };
  }

  const allCoordinates: Point[] = [...points];

  points.forEach(point => {
    const labelPos = getOutwardPosition(point, centroid, labelOffset);
    allCoordinates.push(labelPos);
  });

  for (let i = 0; i < corners; i++) {
    const nextIndex = (i + 1) % corners;
    const edgeLabelPos = getEdgeLabelPosition(
      points[i],
      points[nextIndex],
      centroid,
      edgeLabelOffset
    );
    allCoordinates.push(edgeLabelPos);
  }

  if (showAccuracyBadge) {
    allCoordinates.push({ x: 300, y: 15 });
    allCoordinates.push({ x: 300, y: 45 });
  }

  const minX = Math.min(...allCoordinates.map(p => p.x));
  const maxX = Math.max(...allCoordinates.map(p => p.x));
  const minY = Math.min(...allCoordinates.map(p => p.y));
  const maxY = Math.max(...allCoordinates.map(p => p.y));

  const padding = isMobile ? 60 : 50;
  const textPadding = isMobile ? 30 : 20;

  const x = Math.max(0, minX - padding - textPadding);
  const y = Math.max(0, minY - padding - textPadding);
  const width = Math.max(600, maxX - minX + 2 * (padding + textPadding));
  const height = Math.max(600, maxY - minY + 2 * (padding + textPadding));

  const viewBoxString = `${x} ${y} ${width} ${height}`;

  return { x, y, width, height, viewBoxString };
}
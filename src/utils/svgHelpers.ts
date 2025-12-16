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
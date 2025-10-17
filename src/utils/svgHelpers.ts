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

// Get actual fabric color hex value
export function getFabricColorHex(fabricType: string, fabricColor: string): string {
  const selectedFabric = fabricType ?
    FABRICS.find((f: any) => f.id === fabricType) : null;

  if (!selectedFabric || !fabricColor) {
    return '#caee41'; // Default color
  }

  const colorName = fabricColor.toLowerCase();

  const colorMap: { [key: string]: string } = {
    'koonunga green': '#22c55e',
    'domino black': '#0f172a',
    'sheba navy': '#1e3a8a',
    'lime fizz': '#caee41',
    'candy red': '#dc2626',
    'marrocan terracotta': '#e07a5f',
    'bundena blue': '#3b82f6',
    'graphite grey': '#374151',
    'karloo sand': '#e7d4b5',
    'sherbet orange': '#fb923c',
    'bubblegum pink': '#f472b6',
    'mellow haze yellow': '#fde047',
    'jazzberry purple': '#a855f7',
    'abaroo red': '#dc2626',
    'chino cream': '#fef3c7',
    'titanium': '#64748b',
    'charcoal': '#374151',
    'black': '#0f172a',
    'white': '#f8fafc',
    'cream': '#fef3c7',
    'sand': '#e7d4b5',
    'terracotta': '#e07a5f',
    'slate': '#64748b',
    'graphite': '#1e293b',
    'lime': '#caee41',
    'green': '#22c55e',
    'blue': '#3b82f6',
    'navy': '#1e3a8a',
    'grey': '#6b7280',
    'beige': '#d4c5b0',
  };

  return colorMap[colorName] || '#caee41';
}
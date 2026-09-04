export function getRecommendedEdgeType(perimeterMm: number): 'webbing' | 'cabled' {
  if (perimeterMm <= 0) return 'webbing';
  const perimeterM = perimeterMm / 1000;
  if (perimeterM >= 40) return 'cabled';
  return 'webbing';
}

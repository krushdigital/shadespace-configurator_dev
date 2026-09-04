export type EdgeRecommendation = 'webbing' | 'cabled' | 'either';

export function getEdgeRecommendation(perimeterMm: number): EdgeRecommendation {
  if (perimeterMm <= 0) return 'either';
  const perimeterM = perimeterMm / 1000;
  if (perimeterM >= 40) return 'cabled';
  if (perimeterM <= 10) return 'webbing';
  return 'either';
}

export function getRecommendedEdgeType(perimeterMm: number): 'webbing' | 'cabled' {
  const rec = getEdgeRecommendation(perimeterMm);
  if (rec === 'cabled') return 'cabled';
  return 'webbing';
}

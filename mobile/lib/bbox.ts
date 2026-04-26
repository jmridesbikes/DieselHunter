/** Mapbox map bounds: ne, sw in [lng, lat] */
export function bboxFromCorners(
  ne: [number, number] | number[],
  sw: [number, number] | number[]
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const neLng = ne[0] as number;
  const neLat = ne[1] as number;
  const swLng = sw[0] as number;
  const swLat = sw[1] as number;
  return {
    minLat: Math.min(neLat, swLat),
    maxLat: Math.max(neLat, swLat),
    minLng: Math.min(neLng, swLng),
    maxLng: Math.max(neLng, swLng),
  };
}

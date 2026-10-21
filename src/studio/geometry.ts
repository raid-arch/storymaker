import type { Point } from "./model";
export const mapWidth = 1000,
  mapHeight = 650;
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
export const boundedPoint = (point: Point): Point => ({
  x: clamp(point.x, 0, mapWidth),
  y: clamp(point.y, 0, mapHeight),
});
export function translated(points: Point[], dx: number, dy: number): Point[] {
  if (!points.length) return [];
  const x = clamp(
    dx,
    -Math.min(...points.map((p) => p.x)),
    mapWidth - Math.max(...points.map((p) => p.x)),
  );
  const y = clamp(
    dy,
    -Math.min(...points.map((p) => p.y)),
    mapHeight - Math.max(...points.map((p) => p.y)),
  );
  return points.map((p) => ({ x: p.x + x, y: p.y + y }));
}
export function polygonArea(points: Point[]): number {
  return (
    Math.abs(
      points.reduce((area, p, i) => {
        const next = points[(i + 1) % points.length];
        return area + p.x * next.y - next.x * p.y;
      }, 0),
    ) / 2
  );
}

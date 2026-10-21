import { expect, it } from "vitest";
import { boundedPoint, polygonArea, translated } from "./geometry";
it("keeps dragged territory shapes intact and inside map bounds", () => {
  const points = [
    { x: 900, y: 500 },
    { x: 980, y: 500 },
    { x: 940, y: 600 },
  ];
  const next = translated(points, 200, 200);
  expect(next.map((p) => p.x)).toEqual([920, 1000, 960]);
  expect(next.map((p) => p.y)).toEqual([550, 550, 650]);
  expect(polygonArea(next)).toBe(polygonArea(points));
  expect(points[0]).toEqual({ x: 900, y: 500 });
  expect(boundedPoint({ x: -3, y: 900 })).toEqual({ x: 0, y: 650 });
});
it("rejects flat territory drawings through zero-area detection", () => {
  expect(
    polygonArea([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ]),
  ).toBe(0);
  expect(
    polygonArea([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ]),
  ).toBe(50);
});

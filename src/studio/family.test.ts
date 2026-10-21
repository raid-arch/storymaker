import { expect, it } from "vitest";
import { seed } from "../../tests/sample";
import { familyLayout } from "./family";
it("automatically lays out forty generations without mutating blood relationships", () => {
  const d = seed();
  const base = d.entries[0];
  d.entries = Array.from({ length: 40 }, (_, i) => ({
    ...base,
    id: `p${i}`,
    name: `人物${i}`,
    fields: {},
  }));
  d.relations = Array.from({ length: 39 }, (_, i) => ({
    id: `r${i}`,
    projectId: base.projectId,
    from: `p${i}`,
    to: `p${i + 1}`,
    type: "親子",
    note: "",
  }));
  const before = JSON.stringify(d);
  const positions = familyLayout(d, base.projectId);
  expect(Object.keys(positions)).toHaveLength(40);
  expect(positions.p39.y).toBe(90 + 39 * 200);
  expect(
    new Set(Object.values(positions).map((p) => `${p.x},${p.y}`)).size,
  ).toBe(40);
  expect(JSON.stringify(d)).toBe(before);
  expect(familyLayout(d, "other")).toEqual({});
});
it("keeps siblings on the same layer, honoring explicit generation values", () => {
  const d = seed();
  d.entries = d.entries
    .filter((e) => ["morgan", "anne", "nesan"].includes(e.id))
    .map((e) => ({ ...e, fields: {} }));
  d.relations = [
    {
      id: "r1",
      projectId: "laurel",
      from: "morgan",
      to: "anne",
      type: "親子",
      note: "",
    },
    {
      id: "r2",
      projectId: "laurel",
      from: "morgan",
      to: "nesan",
      type: "養子",
      note: "",
    },
  ];
  const positions = familyLayout(d, "laurel");
  expect(positions.anne.y).toBe(positions.nesan.y);
  expect(Math.abs(positions.anne.x - positions.nesan.x)).toBeGreaterThanOrEqual(
    250,
  );
  expect(positions.morgan.y).toBeLessThan(positions.anne.y);
});

import { expect, it } from "vitest";
import { seed } from "../../tests/sample";
import { emptyStudio } from "./model";
import { impactOf } from "./analysis";
it("follows direct and transitive references without looping and includes non-entry records", () => {
  const d = seed();
  d.relations = [];
  d.entries = d.entries
    .slice(0, 3)
    .map((e, i) => ({ ...e, links: i < 2 ? [d.entries[i + 1].id] : [] }));
  d.studio = {
    ...emptyStudio(),
    terms: [
      {
        id: "t",
        projectId: "laurel",
        name: "定義",
        reading: "",
        aliases: [],
        definition: "",
        category: "",
        links: [d.entries[2].id],
      },
    ],
  };
  expect(impactOf(d, d.entries[0].id, 1).map((item) => item.id)).toEqual([
    d.entries[1].id,
  ]);
  const impact = impactOf(d, d.entries[0].id, 3);
  expect(impact.find((item) => item.id === "t")?.distance).toBe(3);
  expect(new Set(impact.map((item) => item.key)).size).toBe(impact.length);
  d.entries[2].links = [d.entries[0].id];
  expect(
    impactOf(d, d.entries[0].id, 4).every(
      (item) => item.id !== d.entries[0].id,
    ),
  ).toBe(true);
});
it("flags unlinked mentions as candidates instead of pretending their meaning is known", () => {
  const d = seed();
  d.entries[1].body = "人物Aの別名について検討する。";
  d.entries[1].links = [];
  d.relations = [];
  expect(
    impactOf(d, "morgan", 1).find((item) => item.id === "anne")?.reason,
  ).toContain("リンク未登録");
});

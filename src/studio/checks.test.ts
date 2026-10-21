import { expect, it } from "vitest";
import { seed } from "../../tests/sample";
import { checkConsistency } from "./checks";
import { emptyStudio } from "./model";
it("handles zero and negative years, unknown dates and optional fantasy-specific age limits", () => {
  const d = seed();
  d.entries[0].fields = { 生年: "0", 没年: "-1" };
  expect(
    checkConsistency(d, "laurel").some(
      (item) => item.id === "range:morgan:生年" && item.severity === "error",
    ),
  ).toBe(true);
  d.entries[0].fields = { 生年: "-30", 没年: "500" };
  expect(
    checkConsistency(d, "laurel").some((item) => item.id === "age:morgan"),
  ).toBe(false);
  d.studio = {
    ...emptyStudio(),
    rules: [{ id: "r", projectId: "laurel", maxLifeSpan: 100 }],
  };
  expect(
    checkConsistency(d, "laurel").some((item) => item.id === "age:morgan"),
  ).toBe(true);
});
it("checks biological parent ages and declared generations without treating adoption as birth", () => {
  const d = seed();
  d.entries[0].fields = { 生年: "20", 世代: "3" };
  d.entries[1].fields = { 生年: "10", 世代: "2" };
  d.relations = [
    {
      id: "r",
      projectId: "laurel",
      from: "morgan",
      to: "anne",
      type: "親子",
      note: "",
    },
  ];
  expect(
    checkConsistency(d, "laurel").some((item) => item.id === "parent:r"),
  ).toBe(true);
  d.relations[0].type = "養子";
  expect(
    checkConsistency(d, "laurel").some((item) => item.id === "parent:r"),
  ).toBe(false);
  expect(
    checkConsistency(d, "laurel").some((item) => item.id === "generation:r"),
  ).toBe(true);
});
it("detects violated and cyclic event constraints and reports undated constraints separately", () => {
  const d = seed();
  const e = d.entries.find((item) => item.kind === "event")!;
  e.fields.年代 = "10";
  const second = {
    ...structuredClone(e),
    id: "next",
    name: "後の事件",
    fields: { 年代: "0" },
  };
  d.entries.push(second);
  d.studio = {
    ...emptyStudio(),
    constraints: [
      {
        id: "a",
        projectId: "laurel",
        beforeId: e.id,
        afterId: second.id,
        gap: 1,
        note: "",
      },
      {
        id: "b",
        projectId: "laurel",
        beforeId: second.id,
        afterId: e.id,
        gap: 0,
        note: "",
      },
    ],
  };
  expect(
    checkConsistency(d, "laurel").some(
      (item) => item.id === "constraint:a" && item.severity === "error",
    ),
  ).toBe(true);
  expect(
    checkConsistency(d, "laurel").some((item) =>
      item.id.startsWith("time-cycle:"),
    ),
  ).toBe(true);
  second.fields.年代 = "";
  expect(
    checkConsistency(d, "laurel").find((item) => item.id === "constraint:a")
      ?.severity,
  ).toBe("unknown");
});

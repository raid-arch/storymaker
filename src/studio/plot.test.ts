import { expect, it } from "vitest";
import { moveScene } from "./plot";
import type { Scene } from "./model";
it("reorders and moves scenes without changing other projects or losing their content", () => {
  const make = (
    id: string,
    columnId: string,
    order: number,
    projectId = "p",
  ): Scene => ({
    id,
    projectId,
    columnId,
    order,
    name: id,
    summary: "概要",
    note: "秘密のメモ",
    status: "構想中",
    links: ["target"],
  });
  const original = [
    make("a", "one", 0),
    make("b", "one", 1),
    make("c", "two", 0),
    make("other", "two", 0, "another"),
  ];
  const reordered = moveScene(original, "b", "one", 0);
  expect(
    reordered
      .filter((s) => s.columnId === "one")
      .sort((a, b) => a.order - b.order)
      .map((s) => s.id),
  ).toEqual(["b", "a"]);
  const moved = moveScene(reordered, "b", "two", 1);
  expect(moved.find((s) => s.id === "b")).toMatchObject({
    columnId: "two",
    order: 1,
    note: "秘密のメモ",
    links: ["target"],
  });
  expect(moved.find((s) => s.id === "other")).toEqual(original[3]);
  expect(original[1].columnId).toBe("one");
});

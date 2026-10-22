import { describe, expect, it } from "vitest";
import {
  emptyData,
  newProject,
  newEntry,
  sharedProjectIds,
  validateBackup,
  markdown,
} from "./model";
import { familyLayout } from "./studio/family";

describe("shared worlds", () => {
  it("inherits ancestors without leaking sibling stories and survives JSON backup", () => {
    const data = emptyData();
    data.projects = [
      { ...newProject(), id: "world", type: "世界観" },
      { ...newProject(), id: "a", parentId: "world" },
      { ...newProject(), id: "b", parentId: "world" },
      { ...newProject(), id: "chapter", parentId: "a" },
    ];
    data.entries = ["world", "a", "b", "chapter"].map((id) => ({
      ...newEntry(id, "character"),
      id,
    }));
    expect([...sharedProjectIds(data, "chapter")]).toEqual([
      "chapter",
      "a",
      "world",
    ]);
    expect(Object.keys(familyLayout(data, "a")).sort()).toEqual(["a", "world"]);
    expect(Object.keys(familyLayout(data, "b")).sort()).toEqual(["b", "world"]);
    data.relations = [
      {
        id: "r",
        projectId: "a",
        from: "world",
        to: "a",
        type: "親子",
        note: "",
      },
    ];
    expect(validateBackup(JSON.parse(JSON.stringify(data)))).toBeTruthy();
    expect(markdown(data, "a")).toContain('id="world"');
    expect(markdown(data, "a")).not.toContain('id="b"');
    data.relations[0].to = "b";
    expect(() => validateBackup(data)).toThrow();
    expect(data.entries).toHaveLength(4);
  });
  it("terminates safely for cyclic or missing ancestors", () => {
    const data = emptyData();
    data.projects = [
      { ...newProject(), id: "a", parentId: "b" },
      { ...newProject(), id: "b", parentId: "a" },
    ];
    expect([...sharedProjectIds(data, "a")]).toEqual(["a", "b"]);
    expect([...sharedProjectIds(data, "missing")]).toEqual([]);
  });
});

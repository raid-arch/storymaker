import { expect, it } from "vitest";
import {
  emptyData,
  newProject,
  newEntry,
  sharedProjectIds,
  validateBackup,
  organizeStories,
} from "./model";
import {
  parentWorld,
  reparentWorkspace,
  workspaceStories,
  workspaceStoryDepth,
} from "./workspaces";
it("inherits the selected parent world without copying settings or inheriting a sibling story", () => {
  const d = emptyData();
  d.projects = [
    { ...newProject("world"), id: "w" },
    { ...newProject(), id: "series", type: "シリーズ", collectionId: "w" },
    { ...newProject(), id: "a", collectionId: "series" },
    { ...newProject(), id: "b", collectionId: "w" },
  ];
  d.entries = [
    { ...newEntry("w", "world"), id: "shared" },
    { ...newEntry("b", "world"), id: "sibling-private" },
  ];
  expect(parentWorld(d, d.projects[2])?.id).toBe("w");
  expect(workspaceStories(d, "w").map((p) => p.id)).toEqual([
    "series",
    "a",
    "b",
  ]);
  expect(workspaceStoryDepth(d, d.projects[2])).toBe(1);
  expect([...sharedProjectIds(d, "a")]).toEqual(["a", "w"]);
  expect(sharedProjectIds(d, "a").has("b")).toBe(false);
  const migrated = organizeStories(d);
  expect(migrated.projects[2].worldIds).toEqual(["w"]);
  expect(migrated.entries).toEqual(d.entries);
  expect(validateBackup(migrated)).toBeTruthy();
  const cycle = structuredClone(d);
  cycle.projects[0].worldIds = ["a"];
  expect(() => validateBackup(cycle)).toThrow();
});
it("changes a world parent for a series and its children while keeping prose and protecting character references", () => {
  const d = emptyData();
  d.projects = [
    { ...newProject("world"), id: "old" },
    { ...newProject("world"), id: "new" },
    {
      ...newProject(),
      id: "series",
      type: "シリーズ",
      collectionId: "old",
      worldIds: ["old"],
    },
    { ...newProject(), id: "s", collectionId: "series", worldIds: ["old"] },
  ];
  d.entries = [
    { ...newEntry("old", "character"), id: "shared" },
    { ...newEntry("s", "character"), id: "hero", body: "残す本文" },
  ];
  const moved = reparentWorkspace(d, d.projects[2], "new");
  expect(parentWorld(moved, moved.projects[3])?.id).toBe("new");
  expect(moved.projects[3].worldIds).toEqual(["new"]);
  expect(moved.entries).toEqual(d.entries);
  d.relations = [
    {
      id: "r",
      projectId: "s",
      from: "hero",
      to: "shared",
      type: "友人",
      note: "",
    },
  ];
  expect(() => reparentWorkspace(d, d.projects[2], "new")).toThrow(/人物関係/);
  expect(d.projects[2].collectionId).toBe("old");
});

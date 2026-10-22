import { expect, it } from "vitest";
import {
  deleteProject,
  emptyData,
  isWorldLibrary,
  narrativeEvents,
  newEntry,
  newProject,
  organizeStories,
  sharedProjectIds,
  sortEvents,
  validateBackup,
} from "./model";
it("converts legacy parents into independent references without duplicating settings or deleting stories", () => {
  const data = emptyData();
  data.projects = [
    { ...newProject(), id: "w", type: "世界観", workspaceKind: undefined },
    { ...newProject(), id: "s", parentId: "w" },
  ];
  data.entries = [
    { ...newEntry("w", "character"), id: "shared" },
    { ...newEntry("s", "character"), id: "local" },
  ];
  data.relations = [
    {
      id: "r",
      projectId: "s",
      from: "shared",
      to: "local",
      type: "友人",
      note: "",
    },
  ];
  const migrated = organizeStories(data);
  expect(migrated.projects[1].parentId).toBe("");
  expect(migrated.projects[1].worldIds).toEqual(["w"]);
  expect(isWorldLibrary(migrated.projects[0])).toBe(true);
  expect([...sharedProjectIds(migrated, "s")]).toEqual(["s", "w"]);
  expect(migrated.entries).toEqual(data.entries);
  expect(organizeStories(migrated)).toEqual(migrated);
  expect(validateBackup(JSON.parse(JSON.stringify(migrated)))).toEqual(
    migrated,
  );
  const remaining = deleteProject(migrated, "w");
  expect(remaining.projects.map((p) => p.id)).toEqual(["s"]);
  expect(remaining.entries.map((e) => e.id)).toEqual(["local"]);
  expect(remaining.projects[0].worldIds).toEqual([]);
  expect(remaining.relations).toEqual([]);
  expect(validateBackup(remaining)).toBeTruthy();
});
it("keeps worlds reusable across stories without inheriting other stories", () => {
  const data = emptyData();
  data.projects = [
    { ...newProject("world"), id: "w" },
    { ...newProject(), id: "a", worldIds: ["w"] },
    { ...newProject(), id: "b", worldIds: ["w"] },
  ];
  expect([...sharedProjectIds(data, "a")]).toEqual(["a", "w"]);
  const copy = structuredClone(data);
  copy.projects[0].worldIds = ["a"];
  expect(() => validateBackup(copy)).toThrow();
  copy.projects[0].worldIds = ["missing"];
  expect(() => validateBackup(copy)).toThrow();
});
it("orders year zero, negative years, numeric months and unknown dates; story order is independent", () => {
  const data = emptyData();
  data.projects = [
    { ...newProject("world"), id: "w" },
    {
      ...newProject(),
      id: "s",
      worldIds: ["w"],
      eventOrder: ["late", "early"],
    },
  ];
  data.entries = [
    {
      ...newEntry("w", "event"),
      id: "late",
      fields: { 年代: "0", 月: "10", 日: "2" },
    },
    { ...newEntry("w", "event"), id: "middle", fields: { 年代: "0", 月: "2" } },
    { ...newEntry("w", "event"), id: "early", fields: { 年代: "-100" } },
    { ...newEntry("s", "event"), id: "unknown" },
  ];
  expect(sortEvents(data.entries).map((e) => e.id)).toEqual([
    "early",
    "middle",
    "late",
    "unknown",
  ]);
  expect(narrativeEvents(data, "s").map((e) => e.id)).toEqual([
    "late",
    "early",
    "unknown",
  ]);
  expect(narrativeEvents(data, "w").map((e) => e.id)).toEqual([
    "late",
    "middle",
    "early",
  ]);
  expect(validateBackup(JSON.parse(JSON.stringify(data)))).toBeTruthy();
});

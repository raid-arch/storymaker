import { expect, it } from "vitest";
import { emptyData, newProject, newEntry, validateBackup, deleteProject, organizeStories, sharedProjectIds } from "./model";
import { moveOnShelf, shelfParent, shelfSources } from "./collections";
it("organizes worlds, series and works without inheriting another story's private settings", () => {
  const data = emptyData();
  data.projects = [
    { ...newProject("world"), id:"w", name:"ユーフラス" },
    { ...newProject("world"), id:"other" },
    { ...newProject(), id:"single", worldIds:["w"] },
    { ...newProject(), id:"series", type:"シリーズ", collectionId:"w", worldIds:["w"] },
    { ...newProject(), id:"a", collectionId:"series", worldIds:["w"] },
    { ...newProject(), id:"b", collectionId:"a", type:"シリーズ", worldIds:["w"] },
  ];
  // A regular work cannot act as a series container.
  expect(() => validateBackup(data)).toThrow();
  data.projects[4].type = "シリーズ";
  expect(shelfParent(data, data.projects[2])).toBe("w");
  expect(shelfSources(data, "series")).toEqual(["w"]);
  data.entries = [{ ...newEntry("series", "character"), id:"private" }];
  const moved = moveOnShelf(data,"series","other");
  expect(moved.projects.find((p) => p.id === "series")?.collectionId).toBe("other");
  for (const id of ["series","a","b"]) expect(moved.projects.find((p) => p.id === id)?.worldIds).toEqual(expect.arrayContaining(["w","other"]));
  expect(sharedProjectIds(moved,"a").has("series")).toBe(false);
  expect(moved.entries).toEqual(data.entries);
  expect(validateBackup(JSON.parse(JSON.stringify(moved)))).toEqual(moved);
  expect(organizeStories(moved)).toEqual(moved);
  expect(() => moveOnShelf(moved,"series","b")).toThrow();
  const cycle = structuredClone(moved); cycle.projects[3].collectionId="b";
  expect(() => validateBackup(cycle)).toThrow();
  const remaining = deleteProject(moved,"series");
  expect(remaining.projects.find((p) => p.id === "a")?.collectionId).toBe("");
  expect(remaining.projects.find((p) => p.id === "b")?.collectionId).toBe("a");
  expect(validateBackup(remaining)).toBeTruthy();
});
it("rejects invalid shelf targets and retains older backups", () => {
  const data = emptyData(); data.projects=[{...newProject(),id:"s"}, {...newProject("world"),id:"w"}];
  expect(validateBackup(data)).toEqual(data);
  expect(() => moveOnShelf(data,"w","s")).toThrow();
  expect(() => moveOnShelf(data,"s","missing")).toThrow();
  for (const target of [42,"s","missing"]) expect(() => validateBackup({...data,projects:[{...data.projects[0],collectionId:target},data.projects[1]]})).toThrow();
});

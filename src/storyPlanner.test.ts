import { expect, it } from "vitest";
import {
  emptyData,
  newProject,
  newEntry,
  deleteEntry,
  validateBackup,
} from "./model";
import { emptyStudio } from "./studio/model";
import {
  makeScene,
  patchScene,
  orderedCreationScenes,
  storyManuscript,
} from "./studio/creation";
import { addProjectPackage, exportProjectPackage } from "./projectPackages";
it("preserves old stories and round-trips scene design, POV, clue placement, and private story plans", () => {
  const d = emptyData();
  d.projects = [
    {
      ...newProject(),
      id: "p",
      storyPlan: { theme: "変化", logline: "person" },
    },
    { ...newProject(), id: "other" },
  ];
  d.entries = [
    { ...newEntry("p", "character"), id: "person" },
    { ...newEntry("p", "clue"), id: "clue" },
  ];
  d.studio = emptyStudio();
  d.studio.scenes = [
    { ...makeScene("p", "", []), id: "scene", manuscript: "残る本文" },
  ];
  expect(validateBackup(structuredClone(d))).toEqual(d);
  const next = patchScene(d, "scene", {
    purpose: "目的",
    conflict: "対立",
    outcome: "変化",
    povId: "person",
    tension: 4,
    clueBeats: { clue: "提示" },
    links: ["clue"],
  });
  expect(next.studio!.scenes[0].links).toEqual(["clue"]);
  expect(next.studio!.scenes[0].manuscript).toBe("残る本文");
  expect(validateBackup(JSON.parse(JSON.stringify(next)))).toEqual(next);
  const restored = addProjectPackage(
    emptyData(),
    exportProjectPackage(next, ["p"]).data,
  );
  const person = restored.entries.find((e) => e.kind === "character")!,
    clue = restored.entries.find((e) => e.kind === "clue")!,
    scene = restored.studio!.scenes[0];
  expect(scene.povId).toBe(person.id);
  expect(scene.clueBeats).toEqual({ [clue.id]: "提示" });
  expect(restored.projects[0].storyPlan?.logline).toBe("person");
  const deleted = deleteEntry(deleteEntry(next, "person"), "clue");
  expect(deleted.studio!.scenes[0].povId).toBe("");
  expect(deleted.studio!.scenes[0].clueBeats).toEqual({});
  expect(d.projects[1].storyPlan).toBeUndefined();
  for (const tension of [-1, 6, 1.5, "3"])
    expect(() =>
      validateBackup({
        ...next,
        studio: {
          ...next.studio,
          scenes: [{ ...next.studio!.scenes[0], tension }],
        },
      }),
    ).toThrow();
  expect(() =>
    validateBackup({
      ...d,
      projects: [{ ...d.projects[0], storyPlan: { theme: 45 } }, d.projects[1]],
    }),
  ).toThrow();
});

it("keeps board, reading, timeline narrative order and manuscript export aligned after chapter moves", () => {
  const d = emptyData();
  d.projects = [{ ...newProject(), id: "p" }];
  d.studio = emptyStudio();
  d.studio.columns = [
    { id: "a", projectId: "p", name: "後半", chapterId: "", order: 1 },
    { id: "b", projectId: "p", name: "前半", chapterId: "", order: 0 },
  ];
  d.studio.scenes = [
    {
      ...makeScene("p", "", []),
      id: "inbox",
      name: "未分類の場面",
      manuscript: "未分類の本文",
    },
    {
      ...makeScene("p", "a", []),
      id: "last",
      name: "後の場面",
      manuscript: "後半の本文",
    },
    {
      ...makeScene("p", "b", []),
      id: "first",
      name: "前の場面",
      manuscript: "前半の本文",
    },
  ];
  expect(orderedCreationScenes(d, "p").map((s) => s.id)).toEqual([
    "first",
    "last",
    "inbox",
  ]);
  const text = storyManuscript(d, "p");
  expect(text.indexOf("前半の本文")).toBeLessThan(text.indexOf("後半の本文"));
  expect(text.indexOf("後半の本文")).toBeLessThan(text.indexOf("未分類の本文"));
});

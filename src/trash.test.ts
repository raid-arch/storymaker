import { expect, it } from "vitest";
import { emptyData, newEntry, newProject, validateBackup } from "./model";
import { moveToTrash, permanentlyDelete, restoreFromTrash } from "./trash";
function fixture() {
  const d = emptyData();
  d.projects = [
    { ...newProject("world"), id: "w", name: "世界" },
    { ...newProject(), id: "s", collectionId: "w", worldIds: ["w"] },
  ];
  d.entries = [
    {
      ...newEntry("w", "character"),
      id: "a",
      name: "共通人物",
      body: "消える前の本文",
    },
    { ...newEntry("s", "character"), id: "b", links: ["a"] },
  ];
  d.relations = [
    {
      id: "r",
      projectId: "s",
      from: "a",
      to: "b",
      type: "友人",
      note: "残す関係",
    },
  ];
  d.positions = { a: { x: 10, y: 20 } };
  return d;
}
it("keeps deleted world data, references and relations across JSON reload and restores without overwriting later edits", () => {
  const original = fixture();
  let d = moveToTrash(original, "project", "w");
  expect(d.projects.map((p) => p.id)).toEqual(["s"]);
  expect(d.projects[0].worldIds).toEqual([]);
  expect(d.trash).toHaveLength(1);
  expect(d.entries[0].links).toEqual([]);
  d = validateBackup(JSON.parse(JSON.stringify(d)));
  d.entries[0].body = "削除後に書いた本文";
  d = restoreFromTrash(d, d.trash![0].id);
  expect(d.projects.find((p) => p.id === "s")?.collectionId).toBe("w");
  expect(d.entries.find((e) => e.id === "a")?.body).toBe("消える前の本文");
  expect(d.entries.find((e) => e.id === "b")?.body).toBe("削除後に書いた本文");
  expect(d.entries.find((e) => e.id === "b")?.links).toEqual(["a"]);
  expect(d.relations).toEqual(original.relations);
  expect(d.positions).toEqual(original.positions);
  expect(d.trash).toEqual([]);
});
it("restores entries with links added after deletion and permanently deletes only the chosen archive", () => {
  let d = fixture();
  d.entries.push({ ...newEntry("s", "world"), id: "c" });
  d = moveToTrash(d, "entry", "a");
  const id = d.trash![0].id;
  d.entries.find((e) => e.id === "b")!.links = ["c"];
  d = restoreFromTrash(d, id);
  expect(d.entries.find((e) => e.id === "b")!.links).toEqual(["c", "a"]);
  d = moveToTrash(d, "entry", "a");
  const purged = d.trash![0].id;
  d = moveToTrash(d, "entry", "c");
  d = permanentlyDelete(d, purged);
  expect(d.trash).toHaveLength(1);
  expect(restoreFromTrash(d, purged)).toEqual(d);
});
it("rejects conflicting restoration atomically and unsafe archive paths, while accepting older backups", () => {
  const d = moveToTrash(fixture(), "entry", "a");
  d.entries.push({
    ...newEntry("w", "character"),
    id: "a",
    body: "新しい内容",
  });
  expect(() => restoreFromTrash(d, d.trash![0].id)).toThrow(/同じID/);
  expect(d.entries.at(-1)?.body).toBe("新しい内容");
  const bad = structuredClone(d);
  bad.trash![0].patches[0].path = ["studio", "__proto__", "polluted"];
  expect(() => validateBackup(bad)).toThrow();
  expect(validateBackup(fixture()).trash).toBeUndefined();
});

it("restores scene manuscripts and per-scene character states with their project", async () => {
  const { emptyStudio } = await import("./studio/model");
  let d = fixture();
  d.studio = emptyStudio();
  d.studio.columns = [
    { id: "col", projectId: "s", name: "第一章", order: 0, chapterId: "" },
  ];
  d.studio.scenes = [
    {
      id: "scene",
      projectId: "s",
      columnId: "col",
      name: "再会",
      summary: "概要",
      note: "メモ",
      status: "草稿",
      order: 0,
      links: ["a"],
      manuscript: "大事な本文",
      povId: "a",
      castIds: ["a", "b"],
      participantStates: { a: "負傷" },
      clueBeats: { a: "提示" },
    },
  ];
  const original = structuredClone(d.studio);
  d = moveToTrash(d, "project", "s");
  expect(d.studio?.scenes).toEqual([]);
  d = restoreFromTrash(
    validateBackup(JSON.parse(JSON.stringify(d))),
    d.trash![0].id,
  );
  expect(d.studio?.scenes).toEqual(original.scenes);
  expect(d.studio?.columns).toEqual(original.columns);
  d = moveToTrash(d, "entry", "a");
  expect(d.studio?.scenes[0].povId).toBe("");
  d = restoreFromTrash(d, d.trash![0].id);
  expect(d.studio?.scenes).toEqual(original.scenes);
});
it("archives old revisions too, so purging a deleted setting removes its recoverable content", async () => {
  const { checkpoint } = await import("./studio/model");
  let d = fixture();
  d = checkpoint(d, "entry", d.entries[0]);
  d = moveToTrash(d, "entry", "a");
  expect(d.studio?.revisions.some((r) => r.targetId === "a")).toBe(false);
  const archive = d.trash![0].id;
  const restored = restoreFromTrash(d, archive);
  expect(restored.studio?.revisions.some((r) => r.targetId === "a")).toBe(true);
  d = permanentlyDelete(d, archive);
  expect(JSON.stringify(d)).not.toContain("消える前の本文");
});

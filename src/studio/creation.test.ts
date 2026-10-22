import { expect, it } from "vitest";
import {
  deleteEntry,
  deleteProject,
  emptyData,
  newEntry,
  newProject,
  validateBackup,
} from "../model";
import { emptyStudio, studioOf } from "./model";
import {
  createSceneSetting,
  makeScene,
  patchScene,
  putPortrayal,
  storyManuscript,
} from "./creation";
function fixture() {
  const data = emptyData();
  data.projects = [
    { ...newProject("world"), id: "w", name: "世界資料" },
    { ...newProject(), id: "a", name: "作品A", worldIds: ["w"] },
    { ...newProject(), id: "b", name: "作品B", worldIds: ["w"] },
  ];
  data.entries = [
    {
      ...newEntry("w", "character"),
      id: "hero",
      name: "共有人物",
      body: "基本設定",
      truth: "秘密の真相",
    },
    { ...newEntry("w", "world"), id: "town", name: "共有の街" },
  ];
  const scene = { ...makeScene("a", "", []), id: "scene" };
  data.studio = { ...emptyStudio(), scenes: [scene] };
  return data;
}
it("stores story and scene states independently without altering the original or another story", () => {
  const data = fixture(),
    original = structuredClone(data.entries);
  let next = putPortrayal(data, "a", "hero", {
    role: "主人公",
    state: "負傷中",
  });
  next = putPortrayal(next, "b", "hero", { role: "敵役", state: "健康" });
  next = patchScene(next, "scene", {
    manuscript: "朝が来た。",
    castIds: ["hero"],
    placeId: "town",
    timeText: "戦争の翌朝、5時",
    participantStates: { hero: "まだ無傷" },
    placeState: "街が焼ける前",
  });
  expect(next.entries).toEqual(original);
  expect(studioOf(next).portrayals.map((p) => p.state)).toEqual([
    "負傷中",
    "健康",
  ]);
  expect(studioOf(next).scenes[0].participantStates?.hero).toBe("まだ無傷");
  expect(studioOf(next).scenes[0].links).toEqual(["hero", "town"]);
  expect(validateBackup(JSON.parse(JSON.stringify(next)))).toEqual(next);
});
it("creates settings in place with an explicit destination and cleans deleted references safely", () => {
  const data = fixture();
  const result = createSceneSetting(
    data,
    "scene",
    "a",
    "character",
    "新しい登場人物",
  );
  expect(result.entry.projectId).toBe("a");
  expect(result.data.entries.filter((e) => e.projectId === "w")).toEqual(
    data.entries,
  );
  expect(studioOf(result.data).scenes[0].castIds).toContain(result.entry.id);
  expect(studioOf(result.data).portrayals[0].entryId).toBe(result.entry.id);
  const removed = deleteEntry(result.data, result.entry.id);
  expect(studioOf(removed).portrayals).toEqual([]);
  expect(studioOf(removed).scenes[0].castIds).toEqual([]);
  expect(() =>
    createSceneSetting(data, "scene", "b", "world", "別作品への書き込み"),
  ).toThrow();
  expect(validateBackup(deleteProject(result.data, "w"))).toBeTruthy();
});
it("keeps legacy scene content and exports only manuscripts in chapter order", () => {
  const data = fixture();
  data.studio!.columns = [
    { id: "chapter", projectId: "a", name: "第一章", chapterId: "", order: 0 },
  ];
  data.studio!.scenes = [
    {
      id: "legacy",
      projectId: "a",
      columnId: "",
      name: "古い構想",
      summary: "非公開の構想",
      note: "秘密のメモ",
      status: "構想中",
      order: 0,
      links: [],
    },
    {
      ...makeScene("a", "chapter", []),
      name: "朝",
      manuscript: "本文だけを出力する。",
    },
  ];
  const restored = validateBackup(JSON.parse(JSON.stringify(data)));
  expect(studioOf(restored).scenes[0].summary).toBe("非公開の構想");
  const exported = storyManuscript(restored, "a");
  expect(exported).toContain("## 第一章");
  expect(exported).toContain("本文だけを出力する。");
  expect(exported).not.toContain("秘密");
  expect(exported).not.toContain("非公開の構想");
  restored.studio!.scenes[0].participantStates = { hero: 4 } as never;
  expect(() => validateBackup(restored)).toThrow();
});

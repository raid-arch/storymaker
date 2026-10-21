import { expect, it } from "vitest";
import { seed } from "../../tests/sample";
import { dataAtTime, knowledgeAt, variantAt } from "./time";
import { emptyStudio } from "./model";
it("projects eras without mutating current data and handles year zero and unknown era dates", () => {
  const d = seed();
  d.entries[0].fields.生年 = "-10";
  const snapshot = {
    ...structuredClone(d.entries[0]),
    name: "過去の名前",
    body: "過去の設定",
  };
  d.studio = {
    ...emptyStudio(),
    eras: [
      {
        id: "era",
        projectId: "laurel",
        name: "古代",
        description: "",
        from: 0,
        to: 9,
      },
    ],
    variants: [
      {
        id: "v",
        projectId: "laurel",
        entryId: "morgan",
        eraId: "era",
        snapshot,
        imageId: "",
      },
    ],
  };
  const past = dataAtTime(d, { eraId: "era", year: 0 });
  expect(past.entries[0].name).toBe("過去の名前");
  expect(past.entries[0].fields.時点の年齢).toBe("10 歳");
  expect(d.entries[0].name).toBe("人物A");
  expect(variantAt(d, "morgan", { eraId: "", year: 10 })).toBeUndefined();
  d.studio.eras[0].from = undefined;
  d.studio.eras[0].to = undefined;
  expect(variantAt(d, "morgan", { eraId: "", year: 0 })).toBeUndefined();
  expect(variantAt(d, "morgan", { eraId: "era" })).toBeDefined();
});
it("does not leak future knowledge into past views or infer dates for unknown acquisitions", () => {
  const d = seed();
  const base = {
    projectId: "laurel",
    characterId: "morgan",
    entryId: "family",
    source: "",
    note: "",
    eventId: "",
    sceneId: "",
  };
  d.studio = {
    ...emptyStudio(),
    knowledge: [
      { ...base, id: "a", state: "誤解", belief: "誤った説明", year: 0 },
      { ...base, id: "b", state: "既知", belief: "真相", year: 10 },
      { ...base, id: "c", state: "疑念", belief: "時点不明" },
    ],
  };
  expect(knowledgeAt(d, -1).known).toHaveLength(0);
  expect(knowledgeAt(d, 0).known[0].belief).toBe("誤った説明");
  expect(knowledgeAt(d, 10).known[0].belief).toBe("真相");
  expect(knowledgeAt(d, 0).undated[0].id).toBe("c");
});

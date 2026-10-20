// Synthetic test data. Never imported by the application entry point.
import { emptyData, newEntry, newProject, uid } from "../src/model";
import type { Data, Entry } from "../src/model";
export function seed(): Data {
  const project = {
    ...newProject(),
    id: "laurel",
    name: "検証用の物語",
    description: "動作確認のための架空の作品です。",
    tags: ["検証"],
    status: "仮設定" as const,
  };
  const people = [
    ["morgan", "人物A", "統率"],
    ["anne", "人物B", "頭脳"],
    ["nesan", "人物C", "芸術"],
    ["hait", "人物D", "体術"],
    ["fel", "人物E", "継承の役割"],
  ];
  const chars: Entry[] = people.map(([id, name, role]) => ({
    ...newEntry("laurel", "character"),
    id,
    name,
    subtitle: role,
    body: "テスト用の人物です。",
    truth: role,
    tags: ["テスト家"],
    fields: { 生存状況: "生存", 系統: "本家", 一族: "テスト家", 役割: role },
    links: ["family", "estate"],
  }));
  const world: Entry[] = [
    {
      ...newEntry("laurel", "world"),
      id: "family",
      name: "テスト家",
      category: "貴族・家系",
      body: "参照関係を検証する架空の一族です。",
      tags: ["血統"],
      links: ["fel", "succession"],
    },
    {
      ...newEntry("laurel", "world"),
      id: "estate",
      name: "検証用の建物",
      category: "都市・建築物",
      body: "架空の建物です。",
      links: ["family", "fel"],
    },
    {
      ...newEntry("laurel", "world"),
      id: "myth",
      name: "検証用の神話",
      category: "宗教・神話",
      body: "架空の神話です。",
      status: "検討中",
    },
  ];
  const event: Entry = {
    ...newEntry("laurel", "event"),
    id: "three",
    name: "検証用の出来事",
    body: "年代が未確定の出来事です。",
    fields: { 年代: "", 時期: "未確定" },
    links: ["family", "succession"],
  };
  const clue: Entry = {
    ...newEntry("laurel", "clue"),
    id: "succession",
    name: "検証用の謎",
    body: "参照と回収状態を検証する架空の謎です。",
    fields: { 回収状況: "未回収" },
    links: ["morgan", "three", "family"],
  };
  return {
    ...emptyData(),
    projects: [project],
    entries: [...chars, ...world, event, clue],
    relations: chars
      .slice(1)
      .map((c) => ({
        id: uid(),
        projectId: "laurel",
        from: "morgan",
        to: c.id,
        type: "兄弟姉妹",
        note: "検証用の関係",
      })),
  };
}

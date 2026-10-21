import { describe, expect, it } from "vitest";
import { seed } from "../../tests/sample";
import { deleteEntry, deleteProject, validateBackup } from "../model";
import {
  attachImage,
  checkpoint,
  emptyStudio,
  rememberChanges,
  restoreRevision,
  studioOf,
} from "./model";

describe("compatible studio storage and durable versions", () => {
  it("loads legacy backups unchanged and initializes only missing extension lists", () => {
    const legacy = seed();
    expect(validateBackup(JSON.parse(JSON.stringify(legacy)))).toEqual(legacy);
    expect(validateBackup(legacy).studio).toBeUndefined();
    const extended = {
      ...legacy,
      studio: { version: 1, terms: [], futureSetting: "preserved" },
    };
    const loaded = validateBackup(extended);
    expect(loaded.studio?.revisions).toEqual([]);
    expect(
      (loaded.studio as unknown as { futureSetting: string }).futureSetting,
    ).toBe("preserved");
    expect(legacy.entries[0].name).toBe("人物A");
  });
  it("rejects corrupt extension data instead of silently replacing it", () => {
    for (const patch of [
      { version: 2 },
      { maps: 4 },
      { assets: [{ id: "x", image: "https://example.com/a.png" }] },
      { rules: [{ id: "r", projectId: "laurel", maxLifeSpan: Infinity }] },
    ]) {
      expect(() =>
        validateBackup({ ...seed(), studio: { ...emptyStudio(), ...patch } }),
      ).toThrow();
    }
  });
  it("archives images once and restores previous content after a JSON round trip", () => {
    let data = seed();
    data.entries[0].image = "data:image/png;base64,YWJj";
    data = checkpoint(data, "entry", data.entries[0], "第一案");
    data = checkpoint(data, "entry", data.entries[0], "別の保存名");
    expect(studioOf(data).assets).toHaveLength(1);
    expect(studioOf(data).revisions[0].snapshot.image).toBe("");
    data.entries = data.entries.map((entry, i) =>
      i ? entry : { ...entry, name: "第二案", body: "追記" },
    );
    const loaded = validateBackup(JSON.parse(JSON.stringify(data)));
    const restored = restoreRevision(loaded, studioOf(loaded).revisions[0]);
    expect(restored.entries[0].name).toBe("人物A");
    expect(restored.entries[0].image).toBe("data:image/png;base64,YWJj");
    expect(studioOf(restored).revisions.at(-1)?.note).toBe("復元前の版");
    validateBackup(restored);
  });
  it("coalesces rapid edits without recording unrelated appearance changes", () => {
    const data = seed();
    const first = rememberChanges(data, {
      ...data,
      entries: data.entries.map((entry, i) =>
        i ? entry : { ...entry, body: "一" },
      ),
    });
    const next = rememberChanges(first, {
      ...first,
      entries: first.entries.map((entry, i) =>
        i ? entry : { ...entry, body: "二" },
      ),
    });
    expect(studioOf(next).revisions).toHaveLength(1);
    expect(
      studioOf(rememberChanges(next, { ...next, theme: "light" })).revisions,
    ).toHaveLength(1);
  });
  it("cleans new references on deletion while preserving historical versions", () => {
    let data = seed();
    data = checkpoint(data, "entry", data.entries[0]);
    const s = studioOf(data);
    data.studio = {
      ...s,
      knowledge: [
        {
          id: "k",
          projectId: "laurel",
          characterId: "morgan",
          entryId: "family",
          state: "誤解",
          belief: "仮説",
          source: "",
          note: "",
          eventId: "",
          sceneId: "",
        },
      ],
      terms: [
        {
          id: "t",
          projectId: "laurel",
          name: "用語",
          reading: "",
          aliases: [],
          definition: "",
          category: "",
          links: ["morgan"],
        },
      ],
      maps: [
        {
          id: "m",
          projectId: "laurel",
          name: "地図",
          imageId: "",
          territories: [],
          markers: [
            {
              id: "p",
              name: "地点",
              entryId: "morgan",
              type: "都市",
              color: "#557755",
              x: 2,
              y: 3,
            },
          ],
        },
      ],
    };
    const removed = deleteEntry(data, "morgan");
    expect(studioOf(removed).knowledge).toEqual([]);
    expect(studioOf(removed).terms[0].links).toEqual([]);
    expect(studioOf(removed).maps[0].markers[0].entryId).toBe("");
    expect(studioOf(removed).revisions).toHaveLength(1);
    validateBackup(removed);
    expect(studioOf(deleteProject(data, "laurel")).terms).toEqual([]);
    expect(attachImage(studioOf(data), "").imageId).toBe("");
  });
});

it("round-trips all studio records, images and dated relationships through the existing backup format", () => {
  const data = seed(),
    s = emptyStudio(),
    entry = data.entries[0];
  const attached = attachImage(s, "data:image/png;base64,YWJj");
  data.studio = {
    ...attached.studio,
    eras: [
      {
        id: "era",
        projectId: "laurel",
        name: "古代",
        description: "",
        from: -10,
        to: 0,
      },
    ],
    variants: [
      {
        id: "variant",
        projectId: "laurel",
        entryId: entry.id,
        eraId: "era",
        snapshot: { ...entry, image: "" },
        imageId: attached.imageId,
      },
    ],
    maps: [
      {
        id: "map",
        projectId: "laurel",
        name: "大陸",
        imageId: attached.imageId,
        markers: [],
        territories: [
          {
            id: "territory",
            name: "領土",
            entryId: "estate",
            color: "#557755",
            points: [
              { x: 0, y: 0 },
              { x: 100, y: 0 },
              { x: 0, y: 100 },
            ],
          },
        ],
      },
    ],
    references: [
      {
        id: "ref",
        projectId: "laurel",
        name: "建築資料",
        imageId: attached.imageId,
        source: "資料集",
        note: "参考",
        category: "建築",
        links: ["estate"],
      },
    ],
    columns: [
      {
        id: "col",
        projectId: "laurel",
        name: "第1章",
        chapterId: "",
        order: 0,
      },
    ],
    scenes: [
      {
        id: "scene",
        projectId: "laurel",
        columnId: "col",
        name: "出発",
        summary: "概要",
        note: "非公開メモ",
        status: "構想中",
        order: 0,
        year: 0,
        links: [entry.id],
      },
    ],
    knowledge: [
      {
        id: "knowledge",
        projectId: "laurel",
        characterId: entry.id,
        entryId: "family",
        state: "誤解",
        belief: "信じていること",
        source: "噂",
        note: "作者メモ",
        eventId: "",
        sceneId: "scene",
      },
    ],
    terms: [
      {
        id: "term",
        projectId: "laurel",
        name: "用語",
        reading: "ようご",
        aliases: ["別名"],
        definition: "定義",
        category: "一般",
        links: [entry.id],
      },
    ],
    publications: [
      {
        id: "public",
        projectId: "laurel",
        target: "term",
        targetId: "term",
        enabled: false,
        title: "公開用",
        text: "紹介",
      },
    ],
    constraints: [
      {
        id: "constraint",
        projectId: "laurel",
        beforeId: "three",
        afterId: "three",
        gap: 0,
        note: "検討用",
      },
    ],
    rules: [
      { id: "rule", projectId: "laurel", minParentAge: 0, maxLifeSpan: 10000 },
    ],
  };
  data.relations[0] = { ...data.relations[0], validFrom: 0, validTo: 10 };
  const loaded = validateBackup(JSON.parse(JSON.stringify(data)));
  expect(loaded).toEqual(data);
  const bad = structuredClone(data);
  bad.studio!.variants[0].snapshot.id = "another";
  expect(() => validateBackup(bad)).toThrow();
  const badColor = structuredClone(data);
  badColor.studio!.maps[0].territories[0].color =
    "url(https://example.com/private)";
  expect(() => validateBackup(badColor)).toThrow();
});

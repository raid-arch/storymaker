import { describe, expect, it } from "vitest";
import {
  deleteEntry,
  deleteProject,
  descendants,
  familyGenerations,
  markdown,
  newEntry,
  newProject,
  searchEntries,
  seed,
  sortEvents,
  validateBackup,
} from "./model";
describe("world archive data", () => {
  it("round-trips the editable initial sample without losing references", () => {
    const d = seed();
    expect(validateBackup(JSON.parse(JSON.stringify(d)))).toEqual(d);
    expect(d.entries.filter((e) => e.kind === "character")).toHaveLength(5);
  });
  it("searches truth, custom fields, tags, and Japanese text", () => {
    const d = seed();
    expect(searchEntries(d.entries, "#血統").length).toBeGreaterThan(0);
    expect(
      searchEntries(d.entries, "統率").some((e) => e.id === "morgan"),
    ).toBe(true);
    const e = newEntry("laurel", "character");
    e.custom = [{ name: "口癖", value: "空の庭" }];
    expect(searchEntries([e], "空の庭")).toHaveLength(1);
  });
  it("cleans backlinks, positions, and relations when a character is removed", () => {
    const d = seed();
    d.positions.morgan = { x: 4, y: 9 };
    const out = deleteEntry(d, "morgan");
    expect(out.entries.some((e) => e.id === "morgan")).toBe(false);
    expect(out.entries.some((e) => e.links.includes("morgan"))).toBe(false);
    expect(
      out.relations.some((r) => r.from === "morgan" || r.to === "morgan"),
    ).toBe(false);
    expect(out.positions.morgan).toBeUndefined();
    expect(d.entries.some((e) => e.id === "morgan")).toBe(true);
    validateBackup(out);
  });
  it("deletes nested projects and cleans links from retained projects", () => {
    const d = seed();
    const p = { ...newProject(), id: "chapter", parentId: "laurel" };
    const retained = { ...newProject(), id: "retained" };
    d.projects.push(p, retained);
    const e = newEntry("retained", "world");
    e.links = ["morgan"];
    d.entries.push(e);
    expect(descendants(d, "laurel").has("chapter")).toBe(true);
    const out = deleteProject(d, "laurel");
    expect(out.projects.map((p) => p.id)).toEqual(["retained"]);
    expect(out.entries[0].links).toEqual([]);
    validateBackup(out);
  });
  it("sorts negative and zero years and leaves undated events at the end", () => {
    const a = newEntry("laurel", "event"),
      b = newEntry("laurel", "event"),
      c = newEntry("laurel", "event"),
      d = newEntry("laurel", "event");
    a.fields.年代 = "0";
    b.fields.年代 = "-30";
    c.fields.年代 = "";
    d.fields.年代 = "120";
    expect(sortEvents([a, c, d, b]).map((e) => e.fields.年代)).toEqual([
      "-30",
      "0",
      "120",
      "",
    ]);
  });
  it.each([
    "links",
    "fields",
    "projects",
    "version",
    "positions",
    "cycle",
    "image",
    "dangling",
    "year",
    "relation",
  ])("rejects malformed backups (%s) before data replacement", (kind) => {
    const d = seed();
    if (kind === "links") d.entries[0].links = null as never;
    if (kind === "fields") d.entries[0].fields = 4 as never;
    if (kind === "projects") d.projects = [];
    if (kind === "version") d.version = 2 as never;
    if (kind === "positions") d.positions.morgan = { x: NaN, y: 1 };
    if (kind === "cycle") d.projects[0].parentId = "laurel";
    if (kind === "image") d.entries[0].image = "javascript:alert(1)";
    if (kind === "dangling") d.entries[0].links = ["missing"];
    if (kind === "year")
      d.entries.find((e) => e.kind === "event")!.fields.年代 = "昨日";
    if (kind === "relation") d.relations[0].to = "family";
    expect(() => validateBackup(d)).toThrow();
  });
  it("lays out forty generations with an explicit ancestral generation offset", () => {
    const entries = Array.from({ length: 40 }, (_, i) => ({
      ...newEntry("laurel", "character"),
      id: "g" + i,
    }));
    entries[0].fields.世代 = "10";
    const relations = entries
      .slice(1)
      .map((e, i) => ({
        id: "r" + i,
        projectId: "laurel",
        from: entries[i].id,
        to: e.id,
        type: "親子" as const,
        note: "",
      }));
    const generations = familyGenerations(entries, relations);
    expect(generations.g0).toBe(10);
    expect(generations.g39).toBe(49);
    relations.push({
      id: "cycle",
      projectId: "laurel",
      from: "g39",
      to: "g0",
      type: "親子",
      note: "",
    });
    expect(() => familyGenerations(entries, relations)).toThrow("循環");
  });
  it("exports truth, custom fields, relationships, and nested chapters in Markdown", () => {
    const d = seed();
    const child = {
      ...newProject(),
      id: "chapter",
      name: "第一章",
      parentId: "laurel",
    };
    d.projects.push(child);
    const e = newEntry("chapter", "world");
    e.name = "章の設定";
    e.custom = [{ name: "花", value: "月下香" }];
    d.entries.push(e);
    const out = markdown(d, "laurel");
    expect(out).toContain("完璧な血脈");
    expect(out).toContain("## 人物の関係");
    expect(out).toContain("兄弟姉妹");
    expect(out).toContain("章の設定");
    expect(out).toContain("月下香");
  });
});

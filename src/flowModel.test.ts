import { expect, it } from "vitest";
import { validBoard, type FlowBoard } from "./flowModel";
import { emptyData, newProject, validateBackup } from "./model";
import { emptyStudio } from "./studio/model";
import { addProjectPackage, exportProjectPackage } from "./projectPackages";
const board = (): FlowBoard => ({
  id: "board",
  projectId: "story",
  name: "分岐",
  currentNodeId: "b",
  nodes: ["a", "b"].map((id) => ({
    id,
    title: id,
    memo: "メモ",
    x: 80,
    y: 100,
    color: "#abcdef",
    collapsed: false,
    sceneId: "scene",
    entryId: "",
  })),
  edges: [{ id: "edge", from: "a", to: "b", label: "鍵がある" }],
});
it("validates graph coordinates and references without accepting broken connections", () => {
  expect(validBoard({ ...board() })).toBe(true);
  for (const change of [
    { currentNodeId: "missing" },
    { edges: [{ id: "", from: "a", to: "b", label: "" }] },
    { edges: [{ id: "e", from: "a", to: "missing", label: "" }] },
    { nodes: board().nodes.map((n) => ({ ...n, x: Infinity })) },
    { nodes: board().nodes.map((n) => ({ ...n, color: "red" })) },
  ])
    expect(validBoard({ ...board(), ...change })).toBe(false);
});
it("imports boards with fresh graph and scene IDs while preserving formatted text and old backups", () => {
  const d = emptyData();
  d.projects = [{ ...newProject(), id: "story" }];
  d.studio = emptyStudio();
  d.studio.scenes = [
    {
      id: "scene",
      projectId: "story",
      columnId: "",
      name: "場面",
      summary: "",
      note: "",
      status: "草稿",
      order: 0,
      links: [],
      manuscript: "原稿",
      manuscriptHtml: "<p><b>原稿</b></p>",
    },
  ];
  d.studio.boards = [board()];
  const imported = addProjectPackage(
    emptyData(),
    exportProjectPackage(d, ["story"]).data,
  );
  const b = imported.studio!.boards[0];
  expect(b.id).not.toBe("board");
  expect(b.currentNodeId).toBe(b.nodes[1].id);
  expect(b.edges[0].from).toBe(b.nodes[0].id);
  expect(b.edges[0].to).toBe(b.nodes[1].id);
  expect(b.nodes[0].sceneId).toBe(imported.studio!.scenes[0].id);
  expect(imported.studio!.scenes[0].manuscriptHtml).toBe("<p><b>原稿</b></p>");
  const legacy = structuredClone(d);
  delete (legacy.studio as Partial<typeof d.studio>)!.boards;
  expect(validateBackup(legacy).studio!.boards).toEqual([]);
});

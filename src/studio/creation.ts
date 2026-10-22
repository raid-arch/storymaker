import type { Data, Entry } from "../model";
import { newEntry, now, sharedProjectIds } from "../model";
import { editStudio, putItem, sid, studioOf } from "./model";
import type { Portrayal, Scene } from "./model";
export function creationEntries(data: Data, projectId: string): Entry[] {
  const scope = sharedProjectIds(data, projectId);
  return data.entries.filter((entry) => scope.has(entry.projectId));
}
export function sceneCast(scene: Scene, entries: Entry[]): string[] {
  return (
    scene.castIds ??
    scene.links.filter((id) =>
      entries.some((e) => e.id === id && e.kind === "character"),
    )
  );
}
export function makeScene(
  projectId: string,
  columnId: string,
  scenes: Scene[],
): Scene {
  return {
    id: sid(),
    projectId,
    columnId,
    name: "新しいシーン",
    summary: "",
    note: "",
    status: "構想中",
    order:
      Math.max(
        -1,
        ...scenes
          .filter((s) => s.projectId === projectId && s.columnId === columnId)
          .map((s) => s.order),
      ) + 1,
    links: [],
    manuscript: "",
    castIds: [],
    participantStates: {},
  };
}
export function patchScene(
  data: Data,
  id: string,
  patch: Partial<Scene>,
): Data {
  return editStudio(data, (s) => ({
    ...s,
    scenes: s.scenes.map((scene) => {
      if (scene.id !== id) return scene;
      const next = { ...scene, ...patch };
      const oldRefs = new Set(
        [
          ...(patch.castIds !== undefined
            ? sceneCast(scene, data.entries)
            : scene.castIds || []),
          scene.placeId,
          scene.eventId,
        ].filter(Boolean),
      );
      next.links = [
        ...new Set(
          [
            ...scene.links.filter((ref) => !oldRefs.has(ref)),
            ...(next.castIds || []),
            next.placeId || "",
            next.eventId || "",
          ].filter(Boolean),
        ),
      ];
      return next;
    }),
  }));
}
export function putPortrayal(
  data: Data,
  projectId: string,
  entryId: string,
  patch: Partial<
    Pick<Portrayal, "role" | "goal" | "state" | "notes" | "custom">
  > = {},
): Data {
  if (
    !data.projects.some((p) => p.id === projectId) ||
    !data.entries.some((e) => e.id === entryId)
  )
    throw new Error("設定の保存先がありません。");
  return editStudio(data, (s) => {
    const previous = (s.portrayals || []).find(
      (item) => item.projectId === projectId && item.entryId === entryId,
    );
    const record: Portrayal = {
      id: previous?.id || sid(),
      projectId,
      entryId,
      role: "",
      goal: "",
      state: "",
      notes: "",
      ...previous,
      ...patch,
    };
    return { ...s, portrayals: putItem(s.portrayals || [], record) };
  });
}
/** Add a setting in place; source library changes only if explicitly selected. */
export function createSceneSetting(
  data: Data,
  sceneId: string,
  saveTo: string,
  kind: "character" | "world" | "event",
  name: string,
  category = "",
): { data: Data; entry: Entry } {
  const scene = studioOf(data).scenes.find((s) => s.id === sceneId);
  if (
    !scene ||
    !sharedProjectIds(data, scene.projectId).has(saveTo) ||
    !name.trim()
  )
    throw new Error("名前と保存先を確認してください。");
  const entry = {
    ...newEntry(saveTo, kind),
    name: name.trim(),
    category,
    updatedAt: now(),
  };
  let next = { ...data, entries: [...data.entries, entry] };
  next = patchScene(
    next,
    sceneId,
    kind === "character"
      ? { castIds: [...sceneCast(scene, data.entries), entry.id] }
      : kind === "world"
        ? { placeId: entry.id }
        : { eventId: entry.id },
  );
  if (kind === "character")
    next = putPortrayal(next, scene.projectId, entry.id);
  return { data: next, entry };
}
export function storyManuscript(data: Data, projectId: string): string {
  const studio = studioOf(data);
  const project = data.projects.find((p) => p.id === projectId);
  const columns = studio.columns
    .filter((c) => c.projectId === projectId)
    .slice()
    .sort((a, b) => a.order - b.order);
  const safe = (value: string) => value.replace(/([\\`*_{}\[\]<>])/g, "\\$1");
  const chapters = [{ id: "", name: "未分類" }, ...columns];
  return (
    `# ${safe(project?.name || "ストーリー")}\n\n` +
    chapters
      .map((chapter) => {
        const members = studio.scenes
          .filter(
            (scene) =>
              scene.projectId === projectId &&
              (scene.columnId === chapter.id ||
                (!chapter.id && !columns.some((c) => c.id === scene.columnId))),
          )
          .slice()
          .sort((a, b) => a.order - b.order);
        return members.length
          ? `## ${safe(chapter.name)}\n\n` +
              members
                .map(
                  (scene) =>
                    `### ${safe(scene.name)}\n\n${scene.manuscript || ""}\n`,
                )
                .join("\n")
          : "";
      })
      .filter(Boolean)
      .join("\n")
  );
}
export function orderedCreationScenes(
  data: Data,
  projectId: string,
  chronological = false,
): Scene[] {
  const studio = studioOf(data);
  const columns = studio.columns
    .filter((item) => item.projectId === projectId)
    .slice()
    .sort((a, b) => a.order - b.order);
  const rank = (id: string) => columns.findIndex((item) => item.id === id);
  return studio.scenes
    .filter((item) => item.projectId === projectId)
    .slice()
    .sort((a, b) => {
      if (chronological && a.year !== b.year) {
        if (a.year === undefined) return 1;
        if (b.year === undefined) return -1;
        return a.year - b.year;
      }
      return rank(a.columnId) - rank(b.columnId) || a.order - b.order;
    });
}

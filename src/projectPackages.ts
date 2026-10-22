import { organizeStories, sharedProjectIds, validateBackup } from "./model";
import type { Data } from "./model";
import { cleanStudio, studioOf } from "./studio/model";
import { shelfDescendants } from "./collections";
export const packageFormat = "tsuzuriniwa-project-package";
export interface ProjectPackage { format: typeof packageFormat; version: 1; data: Data }
const refs = new Set(["id", "projectId", "parentId", "collectionId", "worldIds", "eventOrder", "links", "from", "to", "characterId", "entryId", "sceneId", "eraId", "imageId", "targetId", "columnId", "chapterId", "beforeId", "afterId", "placeId", "povId", "eventId", "castIds"]);
/** Only rewrite structural IDs; prose, free fields, and custom values are opaque. */
function rewrite(value: unknown, mapping: Map<string, string>, key = ""): unknown {
  if (typeof value === "string") return refs.has(key) ? mapping.get(value) ?? value : value;
  if (Array.isArray(value)) return value.map((item) => rewrite(item, mapping, key)).filter((item) => item !== "");
  if (!value || typeof value !== "object") return value;
  if (key === "fields" || key === "custom" || key === "storyPlan") return structuredClone(value);
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [
    key === "positions" || key === "participantStates" || key === "clueBeats" ? mapping.get(k) ?? k : k,
    rewrite(v, mapping, k),
  ]).filter(([k]) => k !== ""));
}
export function packageProjectIds(data: Data, selected: string[]): Set<string> {
  const ids = new Set<string>();
  selected.forEach((id) => { if (data.projects.some((p) => p.id === id)) shelfDescendants(data, id).forEach((child) => ids.add(child)); });
  let size = 0;
  while (size !== ids.size) {
    size = ids.size;
    [...ids].forEach((id) => {
      sharedProjectIds(data, id).forEach((source) => ids.add(source));
      const parent = data.projects.find((p) => p.id === id)?.collectionId;
      if (parent) ids.add(parent);
    });
  }
  return ids;
}
export function exportProjectPackage(raw: Data, selected: string[]): ProjectPackage {
  const data = organizeStories(validateBackup(structuredClone(raw)));
  const ids = packageProjectIds(data, selected);
  if (!ids.size) throw new Error("書き出す世界観・ストーリーを選んでください。");
  const removedProjects = new Set(data.projects.filter((p) => !ids.has(p.id)).map((p) => p.id));
  const removedEntries = new Set(data.entries.filter((e) => !ids.has(e.projectId)).map((e) => e.id));
  let subset: Data = {
    version: 1, theme: "dark", lastBackup: "", categories: [],
    projects: data.projects.filter((p) => ids.has(p.id)),
    entries: data.entries.filter((e) => ids.has(e.projectId)),
    relations: data.relations.filter((r) => ids.has(r.projectId) && !removedEntries.has(r.from) && !removedEntries.has(r.to)),
    positions: Object.fromEntries(Object.entries(data.positions).filter(([id]) => !removedEntries.has(id))),
  };
  if (data.studio) {
    subset.studio = structuredClone(studioOf(data));
    for (const key of Object.keys(subset.studio) as (keyof typeof subset.studio)[]) {
      if (key === "version" || key === "assets") continue;
      (subset.studio as unknown as Record<string, unknown>)[key] = subset.studio[key].filter((item) => ids.has(item.projectId));
    }
    subset = cleanStudio(subset, removedEntries, removedProjects);
    const used = new Set<string>();
    const collect = (v: unknown) => { if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === "object") Object.entries(v).forEach(([k, x]) => { if (k === "imageId" && typeof x === "string") used.add(x); else if (k !== "assets") collect(x); }); };
    collect(subset.studio);
    subset.studio!.assets = subset.studio!.assets.filter((asset) => used.has(asset.id));
  }
  subset = rewrite(subset, new Map([...removedProjects, ...removedEntries].map((id) => [id, ""]))) as Data;
  subset.categories = [...new Set(subset.entries.filter((e) => e.kind === "world").map((e) => e.category).filter(Boolean))];
  return { format: packageFormat, version: 1, data: validateBackup(subset) };
}
export function readProjectFile(raw: unknown): { data: Data; packaged: boolean } {
  const obj = raw as Partial<ProjectPackage> | null;
  const packaged = obj?.format === packageFormat;
  if (packaged && obj.version !== 1) throw new Error("対応していない作品ファイルのバージョンです。");
  return { data: organizeStories(validateBackup(packaged ? obj.data : raw)), packaged };
}
export function addProjectPackage(current: Data, imported: Data): Data {
  const incoming = organizeStories(validateBackup(structuredClone(imported)));
  const mapping = new Map<string, string>();
  const collect = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === "object") Object.entries(v).forEach(([key, val]) => {
      if (key === "id" && typeof val === "string" && val && !mapping.has(val)) mapping.set(val, crypto.randomUUID());
      if (key !== "fields" && key !== "custom") collect(val);
    });
  };
  collect(incoming);
  const copy = rewrite(incoming, mapping) as Data;
  const result: Data = { ...current,
    projects: [...current.projects, ...copy.projects], entries: [...current.entries, ...copy.entries],
    relations: [...current.relations, ...copy.relations], categories: [...new Set([...current.categories, ...copy.categories])],
    positions: { ...current.positions, ...copy.positions },
  };
  if (copy.studio) {
    const studio = structuredClone(studioOf(current)), extra = studioOf(copy);
    for (const key of Object.keys(studio) as (keyof typeof studio)[]) {
      if (key !== "version") (studio as unknown as Record<string, unknown>)[key] = [...studio[key], ...extra[key]];
    }
    result.studio = studio;
  }
  return validateBackup(result);
}

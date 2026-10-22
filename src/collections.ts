import { isWorldLibrary, now } from "./model";
import type { Data, Project } from "./model";

/** Older stories appear beneath their first world, without rewriting their data. */
export function shelfParent(data: Data, project: Project): string {
  if (isWorldLibrary(project)) return "";
  return project.collectionId ?? project.worldIds?.find((id) => data.projects.some((p) => p.id === id && isWorldLibrary(p))) ?? "";
}
export function shelfDescendants(data: Data, id: string): Set<string> {
  const result = new Set([id]);
  let size = 0;
  while (size !== result.size) {
    size = result.size;
    data.projects.forEach((p) => { if (result.has(shelfParent(data, p))) result.add(p.id); });
  }
  return result;
}
export function shelfSources(data: Data, parentId: string): string[] {
  const result = new Set<string>();
  const seen = new Set<string>();
  let id = parentId;
  while (id && !seen.has(id)) {
    seen.add(id);
    const parent = data.projects.find((p) => p.id === id);
    if (!parent) break;
    if (isWorldLibrary(parent)) result.add(parent.id);
    parent.worldIds?.forEach((source) => result.add(source));
    id = shelfParent(data, parent);
  }
  return [...result];
}
export function moveOnShelf(data: Data, id: string, parentId: string): Data {
  const project = data.projects.find((p) => p.id === id);
  const parent = data.projects.find((p) => p.id === parentId);
  const subtree = shelfDescendants(data, id);
  if (!project || isWorldLibrary(project) || (parentId && (!parent || (!isWorldLibrary(parent) && parent.type !== "シリーズ") || subtree.has(parentId)))) {
    throw new Error("移動先には別の世界観かシリーズを選んでください。");
  }
  const sources = shelfSources(data, parentId);
  return { ...data, projects: data.projects.map((p) => !subtree.has(p.id) ? p : {
    ...p,
    ...(p.id === id ? { collectionId: parentId } : {}),
    worldIds: [...new Set([...(p.worldIds || []), ...sources])],
    updatedAt: now(),
  }) };
}

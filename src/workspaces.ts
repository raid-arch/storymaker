import { isWorldLibrary, now, validateBackup } from "./model";
import type { Data, Project } from "./model";
import { shelfDescendants, shelfParent } from "./collections";

export function parentWorld(data: Data, project: Project): Project | undefined {
  if (isWorldLibrary(project)) return undefined;
  const seen = new Set([project.id]);
  let id = shelfParent(data, project);
  while (id && !seen.has(id)) {
    seen.add(id);
    const parent = data.projects.find((p) => p.id === id);
    if (!parent) break;
    if (isWorldLibrary(parent)) return parent;
    id = shelfParent(data, parent);
  }
  return undefined;
}
/** Parent selection defines inherited world context. Existing content is retained. */
export function reparentWorkspace(
  data: Data,
  project: Project,
  parentId: string,
): Data {
  const parent = data.projects.find((p) => p.id === parentId);
  if (
    isWorldLibrary(project) ||
    (parentId &&
      (!parent || !isWorldLibrary(parent) || parent.id === project.id))
  )
    throw new Error("親には世界観を選択してください。");
  const previous = data.projects.find((p) => p.id === project.id) || project;
  const oldWorld = parentWorld(data, previous);
  const affected = shelfDescendants(data, project.id);
  const result = {
    ...data,
    projects: data.projects.map((item) => {
      if (!affected.has(item.id)) return item;
      const p = item.id === project.id ? project : item;
      return {
        ...p,
        ...(p.id === project.id ? { collectionId: parentId } : {}),
        worldIds: [
          ...new Set([
            ...(p.worldIds || []).filter((id) => id !== oldWorld?.id),
            ...(parentId ? [parentId] : []),
          ]),
        ],
        updatedAt: now(),
      };
    }),
  };
  try {
    return validateBackup(result);
  } catch {
    throw new Error(
      "親を変更すると、現在の人物関係が参照範囲から外れます。関連する人物関係を整理してから変更してください。設定や本文は変更していません。",
    );
  }
}
export function startupChoice(): "home" | "resume" {
  try {
    return localStorage.getItem("tsuzuriniwa:launch-mode") === "resume"
      ? "resume"
      : "home";
  } catch {
    return "home";
  }
}

/** Keep series and their works together in project navigation. */
export function workspaceStories(data: Data, worldId: string): Project[] {
  const result: Project[] = [];
  const visited = new Set<string>();
  function visit(parentId: string) {
    data.projects
      .filter((p) => !isWorldLibrary(p) && shelfParent(data, p) === parentId)
      .forEach((p) => {
        if (visited.has(p.id)) return;
        visited.add(p.id);
        result.push(p);
        visit(p.id);
      });
  }
  visit(worldId);
  return result;
}
export function workspaceStoryDepth(data: Data, project: Project): number {
  const seen = new Set([project.id]);
  let id = shelfParent(data, project),
    depth = 0;
  while (id && !seen.has(id)) {
    seen.add(id);
    const parent = data.projects.find((p) => p.id === id);
    if (!parent || isWorldLibrary(parent)) break;
    depth++;
    id = shelfParent(data, parent);
  }
  return depth;
}

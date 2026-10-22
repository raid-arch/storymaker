export interface TrashPatch {
  path: string[];
  hadBefore: boolean;
  hadAfter: boolean;
  before?: unknown;
  after?: unknown;
}
export interface TrashItem {
  id: string;
  targetId: string;
  name: string;
  kind: "project" | "entry";
  deletedAt: string;
  patches: TrashPatch[];
}
export function validTrash(value: unknown): value is TrashItem[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  return value.every((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.id !== "string" ||
      !item.id ||
      ids.has(item.id) ||
      typeof item.targetId !== "string" ||
      typeof item.name !== "string" ||
      !["project", "entry"].includes(item.kind) ||
      typeof item.deletedAt !== "string" ||
      !Number.isFinite(Date.parse(item.deletedAt)) ||
      !Array.isArray(item.patches) ||
      !item.patches.length
    )
      return false;
    ids.add(item.id);
    return item.patches.every(
      (p: TrashPatch) =>
        p &&
        Array.isArray(p.path) &&
        p.path.length >= 2 &&
        ["projects", "entries", "relations", "positions", "studio"].includes(
          p.path[0],
        ) &&
        p.path.every(
          (key) =>
            typeof key === "string" &&
            !["__proto__", "prototype", "constructor"].includes(key),
        ) &&
        typeof p.hadBefore === "boolean" &&
        typeof p.hadAfter === "boolean" &&
        (!p.hadBefore || Object.hasOwn(p, "before")) &&
        (!p.hadAfter || Object.hasOwn(p, "after")),
    );
  });
}

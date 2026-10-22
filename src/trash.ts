import { collectAssets } from "./studio/model";
import { deleteEntry, deleteProject, now, uid, validateBackup } from "./model";
import type { Data } from "./model";
import type { TrashItem, TrashPatch } from "./trashModel";
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const records = (v: unknown): v is { id: string }[] =>
  Array.isArray(v) &&
  v.every((row) => object(row) && typeof row.id === "string");
// Save only removed records and changed fields, never a snapshot of the whole database.
function difference(
  before: unknown,
  after: unknown,
  path: string[],
  result: TrashPatch[],
) {
  if (same(before, after)) return;
  if (records(before) && records(after)) {
    for (const id of new Set([...before, ...after].map((row) => row.id)))
      difference(
        before.find((row) => row.id === id),
        after.find((row) => row.id === id),
        [...path, id],
        result,
      );
  } else if (object(before) && object(after)) {
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)]))
      difference(before[key], after[key], [...path, key], result);
  } else
    result.push({
      path,
      hadBefore: before !== undefined,
      hadAfter: after !== undefined,
      ...(before !== undefined ? { before } : {}),
      ...(after !== undefined ? { after } : {}),
    });
}
export function moveToTrash(
  data: Data,
  kind: TrashItem["kind"],
  id: string,
): Data {
  const target = (kind === "project" ? data.projects : data.entries).find(
    (item) => item.id === id,
  );
  if (!target) return data;
  let next =
    kind === "project" ? deleteProject(data, id) : deleteEntry(data, id);
  if (next.studio) {
    const removedProjects = new Set(
      data.projects
        .filter((p) => !next.projects.some((x) => x.id === p.id))
        .map((p) => p.id),
    );
    const removedEntries = new Set(
      data.entries
        .filter((e) => !next.entries.some((x) => x.id === e.id))
        .map((e) => e.id),
    );
    next = {
      ...next,
      studio: collectAssets({
        ...next.studio,
        revisions: next.studio.revisions.filter(
          (r) =>
            !removedProjects.has(r.projectId) &&
            !(r.target === "entry" ? removedEntries : removedProjects).has(
              r.targetId,
            ),
        ),
      }),
    };
  }
  const normalized = (value: Data) =>
    JSON.parse(
      JSON.stringify({
        projects: value.projects,
        entries: value.entries,
        relations: value.relations,
        positions: value.positions,
        ...(value.studio ? { studio: value.studio } : {}),
      }),
    );
  const patches: TrashPatch[] = [];
  difference(normalized(data), normalized(next), [], patches);
  return {
    ...next,
    trash: [
      {
        id: uid(),
        targetId: id,
        name: target.name,
        kind,
        deletedAt: now(),
        patches,
      },
      ...(data.trash || []),
    ],
  };
}
export function restoreFromTrash(data: Data, id: string): Data {
  const item = data.trash?.find((row) => row.id === id);
  if (!item) return data;
  const next = structuredClone(data);
  for (const patch of item.patches) {
    let parent: unknown = next;
    for (const segment of patch.path.slice(0, -1)) {
      if (Array.isArray(parent))
        parent = parent.find((row) => row.id === segment);
      else if (object(parent)) parent = parent[segment];
      else parent = undefined;
      if (parent === undefined) break;
    }
    if (!parent) continue; // A related record may itself have been deleted since then.
    const key = patch.path.at(-1)!;
    if (Array.isArray(parent)) {
      const index = parent.findIndex((row) => row.id === key);
      if (index >= 0)
        throw new Error(
          "同じIDのデータが存在するため復元できません。現在のデータは変更していません。",
        );
      if (patch.hadBefore) parent.push(structuredClone(patch.before));
    } else if (object(parent)) {
      const current = parent[key];
      if (!same(current, patch.after)) {
        // Reconnect removed links without discarding links added after deletion.
        if (
          Array.isArray(current) &&
          Array.isArray(patch.before) &&
          Array.isArray(patch.after) &&
          [...current, ...patch.before, ...patch.after].every(
            (v) => typeof v === "string",
          )
        )
          parent[key] = [
            ...new Set([
              ...current,
              ...patch.before.filter(
                (v) => !(patch.after as unknown[]).includes(v),
              ),
            ]),
          ];
        continue;
      }
      if (patch.hadBefore) parent[key] = structuredClone(patch.before);
      else delete parent[key];
    }
  }
  next.trash = next.trash?.filter((row) => row.id !== id);
  try {
    return validateBackup(next);
  } catch {
    throw new Error(
      "関連データが変更・削除されているため復元できません。先に関連する世界観や人物を復元してください。現在のデータは変更していません。",
    );
  }
}
export function permanentlyDelete(data: Data, id: string): Data {
  return { ...data, trash: (data.trash || []).filter((row) => row.id !== id) };
}

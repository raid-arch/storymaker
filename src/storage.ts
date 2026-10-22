import { openDB } from "idb";
import { emptyData, validateBackup, organizeStories } from "./model";
import type { Data } from "./model";
const database = () =>
  openDB("tsuzuriniwa", 1, {
    upgrade(db) {
      db.createObjectStore("state");
    },
  });
export async function load(): Promise<Data> {
  const db = await database();
  const saved = await db.get("state", "main");
  if (saved) {
    const valid = validateBackup(saved);
    if (
      valid.projects.some((p) => p.parentId) &&
      !(await db.get("state", "organization-before-references"))
    )
      await db.put("state", saved, "organization-before-references");
    return organizeStories(valid);
  }
  const initial = emptyData();
  await db.put("state", initial, "main");
  return initial;
}
export async function persist(data: Data): Promise<void> {
  const db = await database();
  await db.put("state", data, "main");
}

// Connection keys are kept separately from story data and never exported.
export async function readLocalSetting<T>(key: string): Promise<T | undefined> {
  const db = await database();
  return db.get("state", key);
}
export async function writeLocalSetting(
  key: string,
  value: unknown,
): Promise<void> {
  const db = await database();
  if (value === undefined) await db.delete("state", key);
  else await db.put("state", value, key);
}

import { mergeWindows } from "./windowMerge";
import { openDB } from "idb";
import { emptyData, validateBackup, organizeStories } from "./model";
import type { Data } from "./model";
const database = () =>
  openDB("tsuzuriniwa", 1, {
    upgrade(db) {
      db.createObjectStore("state");
    },
  });
let baseline: Data | undefined;
let ownWrites = new Map<string, unknown>();
const channel =
  typeof window !== "undefined" && typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("tsuzuriniwa-data")
    : undefined;
export function acceptSaved(data: Data) {
  baseline = structuredClone(data);
  ownWrites.clear();
}
export function watchStorage(callback: () => void) {
  const handler = () => callback();
  channel?.addEventListener("message", handler);
  window.addEventListener("focus", handler);
  const blur = () => setTimeout(handler, 0);
  document.addEventListener("focusout", blur);
  return () => {
    document.removeEventListener("focusout", blur);
    channel?.removeEventListener("message", handler);
    window.removeEventListener("focus", handler);
  };
}
export async function readSaved(): Promise<Data> {
  const db = await database();
  return organizeStories(
    validateBackup((await db.get("state", "main")) || emptyData()),
  );
}
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
    const result = organizeStories(valid);
    acceptSaved(result);
    return result;
  }
  const tx = db.transaction("state", "readwrite");
  const existing = await tx.store.get("main");
  const initial = existing
    ? organizeStories(validateBackup(existing))
    : emptyData();
  if (!existing) await tx.store.put(initial, "main");
  await tx.done;
  acceptSaved(initial);
  return initial;
}
export async function persist(data: Data): Promise<Data> {
  const db = await database(),
    tx = db.transaction("state", "readwrite");
  const raw = await tx.store.get("main");
  const remote = raw ? organizeStories(validateBackup(raw)) : emptyData();
  const writes = new Map(ownWrites);
  let merged: Data;
  try {
    merged = validateBackup(
      mergeWindows(baseline || remote, data, remote, writes),
    );
  } catch (error) {
    tx.abort();
    await tx.done.catch(() => {});
    throw error;
  }
  const changed = JSON.stringify(merged) !== JSON.stringify(remote);
  if (changed) await tx.store.put(merged, "main");
  await tx.done;
  ownWrites = writes;
  if (changed) channel?.postMessage("updated");
  return merged;
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

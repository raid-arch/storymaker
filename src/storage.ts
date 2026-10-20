import { openDB } from "idb";
import { seed, validateBackup } from "./model";
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
  if (saved) return validateBackup(saved);
  const initial = seed();
  await db.put("state", initial, "main");
  return initial;
}
export async function persist(data: Data): Promise<void> {
  const db = await database();
  await db.put("state", data, "main");
}

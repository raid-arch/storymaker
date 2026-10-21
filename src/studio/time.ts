import type { Data, Entry } from "../model";
import { imageOf, studioOf } from "./model";
import type { Era, Knowledge, Variant } from "./model";
export interface TimeSelection {
  eraId: string;
  year?: number;
}
export const numberOf = (
  value: string | number | undefined,
): number | undefined =>
  value === undefined ||
  String(value).trim() === "" ||
  !Number.isFinite(Number(value))
    ? undefined
    : Number(value);
export const inRange = (year: number, from?: number, to?: number) =>
  (from === undefined || year >= from) && (to === undefined || year <= to);
export function variantBounds(
  variant: Variant,
  eras: Era[],
): { from?: number; to?: number } {
  const era = eras.find((item) => item.id === variant.eraId);
  return { from: variant.from ?? era?.from, to: variant.to ?? era?.to };
}
export function variantAt(
  data: Data,
  entryId: string,
  selection: TimeSelection,
): Variant | undefined {
  const s = studioOf(data);
  return s.variants
    .filter((item) => {
      if (item.entryId !== entryId) return false;
      if (selection.eraId && item.eraId !== selection.eraId) return false;
      const bounds = variantBounds(item, s.eras);
      if (selection.year !== undefined)
        return (
          (selection.eraId !== "" ||
            bounds.from !== undefined ||
            bounds.to !== undefined) &&
          inRange(selection.year, bounds.from, bounds.to)
        );
      return Boolean(selection.eraId);
    })
    .sort(
      (a, b) =>
        Date.parse(a.snapshot.updatedAt) - Date.parse(b.snapshot.updatedAt),
    )
    .at(-1);
}
export function dataAtTime(data: Data, selection: TimeSelection): Data {
  if (!selection.eraId && selection.year === undefined) return data;
  const entries = data.entries
    .map((entry) => {
      const variant = variantAt(data, entry.id, selection);
      let item: Entry = variant
        ? {
            ...entry,
            ...structuredClone(variant.snapshot),
            id: entry.id,
            kind: entry.kind,
            projectId: entry.projectId,
            image: imageOf(data, variant.imageId) || variant.snapshot.image,
          }
        : { ...entry, fields: { ...entry.fields } };
      if (selection.year !== undefined && item.kind === "character") {
        const birth = numberOf(item.fields.生年),
          death = numberOf(item.fields.没年);
        item = { ...item, fields: { ...item.fields } };
        if (birth !== undefined)
          item.fields.時点の年齢 =
            selection.year < birth
              ? "未出生"
              : death !== undefined && selection.year > death
                ? `没時 ${death - birth} 歳`
                : `${selection.year - birth} 歳`;
        if (birth !== undefined && selection.year < birth)
          item.fields.時点の状態 = "未出生";
        else if (death !== undefined && selection.year > death)
          item.fields.時点の状態 = "没後";
        else if (birth !== undefined) item.fields.時点の状態 = "存命期間内";
      }
      return item;
    })
    .filter(
      (entry) =>
        entry.kind !== "event" ||
        selection.year === undefined ||
        numberOf(entry.fields.年代) === undefined ||
        numberOf(entry.fields.年代)! <= selection.year,
    );
  return {
    ...data,
    entries,
    relations: data.relations.filter(
      (relation) =>
        selection.year === undefined ||
        inRange(selection.year, relation.validFrom, relation.validTo),
    ),
  };
}
export function knowledgeYear(data: Data, item: Knowledge): number | undefined {
  return (
    item.year ??
    numberOf(
      data.entries.find((entry) => entry.id === item.eventId)?.fields.年代,
    ) ??
    studioOf(data).scenes.find((scene) => scene.id === item.sceneId)?.year
  );
}
export function knowledgeAt(
  data: Data,
  year: number,
): { known: Knowledge[]; undated: Knowledge[] } {
  const records = studioOf(data).knowledge;
  const latest = new Map<string, Knowledge>();
  const undated: Knowledge[] = [];
  for (const item of records) {
    const acquired = knowledgeYear(data, item);
    if (acquired === undefined) {
      undated.push(item);
      continue;
    }
    if (acquired > year) continue;
    const key = `${item.characterId}:${item.entryId}`;
    const previous = latest.get(key);
    if (!previous || knowledgeYear(data, previous)! <= acquired)
      latest.set(key, item);
  }
  return { known: [...latest.values()], undated };
}

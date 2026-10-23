import { validBoard } from "../flowModel";
import type { FlowBoard } from "../flowModel";
import { isWorldLibrary, sharedProjectIds, organizeStories, validateBackup } from "../model";
import type { Data, Entry, Kind, Project } from "../model";

export interface Asset {
  id: string;
  image: string;
}
export interface Revision {
  id: string;
  projectId: string;
  target: "entry" | "project";
  targetId: string;
  at: string;
  note: string;
  snapshot: Entry | Project;
  imageId: string;
}
export interface Knowledge {
  id: string;
  projectId: string;
  characterId: string;
  entryId: string;
  state: string;
  belief: string;
  source: string;
  note: string;
  year?: number;
  eventId: string;
  sceneId: string;
}
export interface Era {
  id: string;
  projectId: string;
  name: string;
  description: string;
  from?: number;
  to?: number;
}
export interface Variant {
  id: string;
  projectId: string;
  entryId: string;
  eraId: string;
  from?: number;
  to?: number;
  snapshot: Entry;
  imageId: string;
}
export interface Point {
  x: number;
  y: number;
}
export interface MapMarker extends Point {
  id: string;
  name: string;
  entryId: string;
  type: string;
  color: string;
}
export interface Territory {
  id: string;
  name: string;
  entryId: string;
  color: string;
  points: Point[];
}
export interface WorldMap {
  id: string;
  projectId: string;
  name: string;
  imageId: string;
  markers: MapMarker[];
  territories: Territory[];
}
export interface Term {
  id: string;
  projectId: string;
  name: string;
  reading: string;
  aliases: string[];
  definition: string;
  category: string;
  links: string[];
}
export interface PlotColumn {
  id: string;
  projectId: string;
  name: string;
  chapterId: string;
  order: number;
}
export interface Portrayal {
  id: string;
  projectId: string;
  entryId: string;
  role: string;
  goal: string;
  state: string;
  notes: string;
  custom?: { name: string; value: string }[];
}
export interface Scene {
  id: string;
  projectId: string;
  columnId: string;
  name: string;
  summary: string;
  note: string;
  status: string;
  order: number;
  year?: number;
  links: string[];
  manuscript?: string;
  manuscriptHtml?: string;
  purpose?: string;
  conflict?: string;
  outcome?: string;
  povId?: string;
  tension?: number;
  clueBeats?: Record<string, string>;
  placeState?: string;
  timeText?: string;
  placeId?: string;
  eventId?: string;
  castIds?: string[];
  participantStates?: Record<string, string>;
  relationshipNotes?: string;
}
export interface Reference {
  id: string;
  projectId: string;
  name: string;
  imageId: string;
  source: string;
  note: string;
  category: string;
  links: string[];
}
export interface Template {
  id: string;
  projectId: string;
  name: string;
  kind: Kind;
  category: string;
  fields: Record<string, string>;
  custom: { name: string; value: string }[];
  body: string;
  lore: string;
  truth: string;
  status: string;
  tags: string[];
}
export interface Publication {
  id: string;
  projectId: string;
  target: "entry" | "project" | "term" | "scene";
  targetId: string;
  enabled: boolean;
  title: string;
  text: string;
}
export interface TimeConstraint {
  id: string;
  projectId: string;
  beforeId: string;
  afterId: string;
  gap: number;
  note: string;
}
export interface CheckRules {
  id: string;
  projectId: string;
  minParentAge?: number;
  maxLifeSpan?: number;
}
export interface Studio {
  boards: FlowBoard[];
  version: 1;
  assets: Asset[];
  revisions: Revision[];
  knowledge: Knowledge[];
  eras: Era[];
  variants: Variant[];
  maps: WorldMap[];
  terms: Term[];
  columns: PlotColumn[];
  scenes: Scene[];
  portrayals: Portrayal[];
  references: Reference[];
  templates: Template[];
  publications: Publication[];
  constraints: TimeConstraint[];
  rules: CheckRules[];
}
export type StudioTab =
  | "history"
  | "checks"
  | "knowledge"
  | "impact"
  | "eras"
  | "maps"
  | "terms"
  | "plot"
  | "references"
  | "templates"
  | "public";
export const studioTabs: {
  id: StudioTab;
  name: string;
  description: string;
}[] = [
  {
    id: "history",
    name: "変更履歴",
    description: "保存した版を比較して、過去の案に戻す",
  },
  {
    id: "checks",
    name: "矛盾チェック",
    description: "血縁・生没年・事件の前後関係を検証",
  },
  {
    id: "knowledge",
    name: "人物の認識",
    description: "誰が、何を、いつ知ったかを記録",
  },
  {
    id: "impact",
    name: "変更の影響",
    description: "参照元と間接的につながる設定を確認",
  },
  {
    id: "eras",
    name: "時代別の設定",
    description: "時代ごとの設定を保存して切り替える",
  },
  { id: "maps", name: "世界地図", description: "地図に国家・都市・領土を配置" },
  {
    id: "terms",
    name: "用語辞典",
    description: "固有名詞・読み・別名・定義を整理",
  },
  {
    id: "plot",
    name: "プロットボード",
    description: "章とシーンを並べて構成を練る",
  },
  {
    id: "references",
    name: "画像資料",
    description: "参考画像・出典・関連設定を保管",
  },
  {
    id: "templates",
    name: "設定テンプレート",
    description: "項目と初期値を作品をまたいで再利用",
  },
  {
    id: "public",
    name: "公開情報",
    description: "公開すると決めた文章だけを書き出す",
  },
];
export const sid = () => crypto.randomUUID();
export function emptyStudio(): Studio {
  return {
    version: 1,
    assets: [],
    revisions: [],
    knowledge: [],
    eras: [],
    variants: [],
    maps: [],
    terms: [],
    columns: [],
    scenes: [],
    boards: [],
    portrayals: [],
    references: [],
    templates: [],
    publications: [],
    constraints: [],
    rules: [],
  };
}
export function studioOf(data: Data): Studio {
  return data.studio || emptyStudio();
}
export function editStudio(data: Data, fn: (studio: Studio) => Studio): Data {
  return { ...data, studio: fn(studioOf(data)) };
}
export function putItem<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((old) => old.id === item.id)
    ? items.map((old) => (old.id === item.id ? item : old))
    : [...items, item];
}
export function attachImage(
  studio: Studio,
  image: string,
): { studio: Studio; imageId: string } {
  if (!image) return { studio, imageId: "" };
  const old = studio.assets.find((asset) => asset.image === image);
  if (old) return { studio, imageId: old.id };
  const asset = { id: sid(), image };
  return {
    studio: { ...studio, assets: [...studio.assets, asset] },
    imageId: asset.id,
  };
}
export function imageOf(data: Data, id: string): string {
  return studioOf(data).assets.find((asset) => asset.id === id)?.image || "";
}
export function collectAssets(studio: Studio): Studio {
  const used = new Set(
    [
      ...studio.revisions,
      ...studio.variants,
      ...studio.maps,
      ...studio.references,
    ].map((item) => item.imageId),
  );
  return {
    ...studio,
    assets: studio.assets.filter((asset) => used.has(asset.id)),
  };
}

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(text);
const texts = (value: unknown): value is Record<string, string> =>
  object(value) && Object.values(value).every(text);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const optionalNumber = (value: unknown) => value === undefined || finite(value);
const hasText = (value: Record<string, unknown>, keys: string[]) =>
  keys.every((key) => text(value[key]));
const image = (value: unknown) =>
  text(value) &&
  (!value ||
    /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value));
function snapshot(value: unknown): boolean {
  if (
    !object(value) ||
    !hasText(value, [
      "id",
      "name",
      "image",
      "status",
      "lore",
      "truth",
      "updatedAt",
    ]) ||
    !strings(value.tags) ||
    !image(value.image)
  )
    return false;
  if ("kind" in value)
    return (
      ["character", "world", "event", "clue"].includes(String(value.kind)) &&
      hasText(value, ["projectId", "subtitle", "category", "body"]) &&
      texts(value.fields) &&
      (value.kind !== "event" ||
        !value.fields.年代?.trim() ||
        Number.isFinite(Number(value.fields.年代))) &&
      strings(value.links) &&
      Array.isArray(value.custom) &&
      value.custom.every((c) => object(c) && hasText(c, ["name", "value"]))
    );
  return hasText(value, ["description", "type", "parentId"]);
}
/** Version 1 backups without an extension remain unchanged. Missing new lists
 * in earlier extension releases are initialized without discarding user data. */
export function validateStudio(raw: unknown): Studio {
  const fail = (): never => {
    throw new Error(
      "追加機能の保存データを読み込めません。元のデータは変更されていません。",
    );
  };
  if (!object(raw) || raw.version !== 1) return fail();
  const result = { ...emptyStudio(), ...raw } as unknown as Studio;
  const validators: Record<
    Exclude<keyof Studio, "version">,
    (v: Record<string, unknown>) => boolean
  > = {
    boards: validBoard,
    assets: (v) => hasText(v, ["image"]) && image(v.image),
    revisions: (v) =>
      hasText(v, ["projectId", "targetId", "at", "note", "imageId"]) &&
      ["entry", "project"].includes(String(v.target)) &&
      snapshot(v.snapshot) &&
      object(v.snapshot) &&
      "kind" in v.snapshot === (v.target === "entry") &&
      v.snapshot.id === v.targetId,
    knowledge: (v) =>
      hasText(v, [
        "projectId",
        "characterId",
        "entryId",
        "state",
        "belief",
        "source",
        "note",
        "eventId",
        "sceneId",
      ]) && optionalNumber(v.year),
    eras: (v) =>
      hasText(v, ["projectId", "name", "description"]) &&
      optionalNumber(v.from) &&
      optionalNumber(v.to),
    variants: (v) =>
      hasText(v, ["projectId", "entryId", "eraId", "imageId"]) &&
      optionalNumber(v.from) &&
      optionalNumber(v.to) &&
      snapshot(v.snapshot) &&
      object(v.snapshot) &&
      "kind" in v.snapshot &&
      v.snapshot.id === v.entryId,
    maps: (v) =>
      hasText(v, ["projectId", "name", "imageId"]) &&
      Array.isArray(v.markers) &&
      v.markers.every(
        (p) =>
          object(p) &&
          hasText(p, ["id", "name", "entryId", "type", "color"]) &&
          /^#[0-9a-f]{6}$/i.test(String(p.color)) &&
          finite(p.x) &&
          finite(p.y),
      ) &&
      Array.isArray(v.territories) &&
      v.territories.every(
        (p) =>
          object(p) &&
          hasText(p, ["id", "name", "entryId", "color"]) &&
          /^#[0-9a-f]{6}$/i.test(String(p.color)) &&
          Array.isArray(p.points) &&
          p.points.every((q) => object(q) && finite(q.x) && finite(q.y)),
      ),
    terms: (v) =>
      hasText(v, ["projectId", "name", "reading", "definition", "category"]) &&
      strings(v.aliases) &&
      strings(v.links),
    columns: (v) =>
      hasText(v, ["projectId", "name", "chapterId"]) && finite(v.order),
    scenes: (v) =>
      hasText(v, [
        "projectId",
        "columnId",
        "name",
        "summary",
        "note",
        "status",
      ]) &&
      strings(v.links) &&
      finite(v.order) &&
      optionalNumber(v.year) &&
      [
        "manuscript",
        "manuscriptHtml",
        "purpose",
        "conflict",
        "outcome",
        "povId",
        "timeText",
        "placeId",
        "eventId",
        "relationshipNotes",
        "placeState",
      ].every((key) => v[key] === undefined || text(v[key])) &&
      (v.tension === undefined || (Number.isInteger(v.tension) && Number(v.tension) >= 0 && Number(v.tension) <= 5)) &&
      (v.castIds === undefined || strings(v.castIds)) &&
      (v.clueBeats === undefined || texts(v.clueBeats)) &&
      (v.participantStates === undefined || texts(v.participantStates)),
    portrayals: (v) =>
      hasText(v, ["projectId", "entryId", "role", "goal", "state", "notes"]) &&
      (v.custom === undefined ||
        (Array.isArray(v.custom) &&
          v.custom.every(
            (field) => object(field) && hasText(field, ["name", "value"]),
          ))),
    references: (v) =>
      hasText(v, [
        "projectId",
        "name",
        "imageId",
        "source",
        "note",
        "category",
      ]) && strings(v.links),
    templates: (v) =>
      hasText(v, [
        "projectId",
        "name",
        "category",
        "body",
        "lore",
        "truth",
        "status",
      ]) &&
      ["character", "world", "event", "clue"].includes(String(v.kind)) &&
      texts(v.fields) &&
      strings(v.tags) &&
      Array.isArray(v.custom) &&
      v.custom.every((c) => object(c) && hasText(c, ["name", "value"])),
    publications: (v) =>
      hasText(v, ["projectId", "targetId", "title", "text"]) &&
      typeof v.enabled === "boolean" &&
      ["entry", "project", "term", "scene"].includes(String(v.target)),
    constraints: (v) =>
      hasText(v, ["projectId", "beforeId", "afterId", "note"]) &&
      finite(v.gap) &&
      v.gap >= 0,
    rules: (v) =>
      hasText(v, ["projectId"]) &&
      optionalNumber(v.minParentAge) &&
      optionalNumber(v.maxLifeSpan),
  };
  for (const [key, valid] of Object.entries(validators)) {
    const list = result[key as Exclude<keyof Studio, "version">];
    const ids = new Set<string>();
    if (!Array.isArray(list)) return fail();
    for (const item of list) {
      if (
        !object(item) ||
        !text(item.id) ||
        !item.id ||
        ids.has(item.id) ||
        !valid(item)
      )
        return fail();
      ids.add(item.id);
    }
  }
  return result;
}

export function cleanStudio(
  data: Data,
  entryIds: Set<string>,
  projectIds = new Set<string>(),
): Data {
  if (!data.studio) return data;
  const s = data.studio;
  const keep = <T extends { projectId: string }>(items: T[]) =>
    items.filter((item) => !projectIds.has(item.projectId));
  const links = <T extends { links: string[] }>(items: T[]) =>
    items.map((item) => ({
      ...item,
      links: item.links.filter((id) => !entryIds.has(id)),
    }));
  return {
    ...data,
    studio: {
      ...s,
      boards: keep(s.boards || []).map((b) => ({
        ...b,
        nodes: b.nodes.map((n) => ({
          ...n,
          entryId: entryIds.has(n.entryId) ? n.entryId : "",
        })),
      })),
      knowledge: keep(s.knowledge)
        .filter(
          (item) =>
            !entryIds.has(item.characterId) && !entryIds.has(item.entryId),
        )
        .map((item) => ({
          ...item,
          eventId: entryIds.has(item.eventId) ? "" : item.eventId,
        })),
      eras: keep(s.eras),
      variants: keep(s.variants)
        .filter((item) => !entryIds.has(item.entryId))
        .map((item) => ({
          ...item,
          snapshot: {
            ...item.snapshot,
            links: item.snapshot.links.filter((id) => !entryIds.has(id)),
          },
        })),
      maps: keep(s.maps).map((map) => ({
        ...map,
        markers: map.markers.map((marker) => ({
          ...marker,
          entryId: entryIds.has(marker.entryId) ? "" : marker.entryId,
        })),
        territories: map.territories.map((territory) => ({
          ...territory,
          entryId: entryIds.has(territory.entryId) ? "" : territory.entryId,
        })),
      })),
      terms: links(keep(s.terms)),
      columns: keep(s.columns).map((column) => ({
        ...column,
        chapterId: projectIds.has(column.chapterId) ? "" : column.chapterId,
      })),
      scenes: links(keep(s.scenes)).map((scene) => ({
        ...scene,
        clueBeats: scene.clueBeats && Object.fromEntries(Object.entries(scene.clueBeats).filter(([id]) => !entryIds.has(id))),
        povId: scene.povId && entryIds.has(scene.povId) ? "" : scene.povId,
        placeId:
          scene.placeId && entryIds.has(scene.placeId) ? "" : scene.placeId,
        eventId:
          scene.eventId && entryIds.has(scene.eventId) ? "" : scene.eventId,
        castIds: scene.castIds?.filter((id) => !entryIds.has(id)),
        participantStates:
          scene.participantStates &&
          Object.fromEntries(
            Object.entries(scene.participantStates).filter(
              ([id]) => !entryIds.has(id),
            ),
          ),
      })),
      portrayals: keep(s.portrayals || []).filter(
        (item) => !entryIds.has(item.entryId),
      ),
      references: links(keep(s.references)),
      templates: keep(s.templates),
      publications: keep(s.publications).filter(
        (item) => !(item.target === "entry" && entryIds.has(item.targetId)),
      ),
      constraints: keep(s.constraints).filter(
        (item) => !entryIds.has(item.beforeId) && !entryIds.has(item.afterId),
      ),
      rules: keep(s.rules),
    },
  };
}

function sameContent(a: Entry | Project, b: Entry | Project): boolean {
  if (a === b) return true;
  const { updatedAt: _a, image: ia, ...left } = a;
  const { updatedAt: _b, image: ib, ...right } = b;
  if (ia !== ib) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}
export function checkpoint(
  data: Data,
  target: "entry" | "project",
  item: Entry | Project,
  note = "手動で保存した版",
): Data {
  const attached = attachImage(studioOf(data), item.image);
  const revision: Revision = {
    id: sid(),
    projectId: target === "entry" ? (item as Entry).projectId : item.id,
    target,
    targetId: item.id,
    at: new Date().toISOString(),
    note,
    snapshot: { ...structuredClone(item), image: "" },
    imageId: attached.imageId,
  };
  return {
    ...data,
    studio: {
      ...attached.studio,
      revisions: [...attached.studio.revisions, revision],
    },
  };
}
export function rememberChanges(before: Data, after: Data): Data {
  let result = after;
  for (const target of ["entry", "project"] as const) {
    const oldItems = target === "entry" ? before.entries : before.projects;
    const nextItems = target === "entry" ? after.entries : after.projects;
    const byId = new Map<string, Entry | Project>(
      nextItems.map((item) => [item.id, item]),
    );
    for (const item of oldItems) {
      const next = byId.get(item.id);
      if (next && sameContent(item, next)) continue;
      const revisions = studioOf(result).revisions;
      const last = revisions
        .filter(
          (revision) =>
            revision.target === target && revision.targetId === item.id,
        )
        .at(-1);
      if (next && last && Date.now() - Date.parse(last.at) < 30_000) continue;
      result = checkpoint(
        result,
        target,
        item,
        next ? "変更前の自動記録" : "削除前の自動記録",
      );
    }
  }
  return result;
}
export function revisionSnapshot(
  data: Data,
  revision: Revision,
): Entry | Project {
  return {
    ...structuredClone(revision.snapshot),
    image: imageOf(data, revision.imageId) || revision.snapshot.image,
  };
}
export function revisionDiff(
  data: Data,
  revision: Revision,
): { label: string; before: string; after: string }[] {
  const old = revisionSnapshot(data, revision);
  const current =
    revision.target === "entry"
      ? data.entries.find((item) => item.id === revision.targetId)
      : data.projects.find((item) => item.id === revision.targetId);
  const flatten = (
    item: Entry | Project | undefined,
  ): Record<string, string> => {
    if (!item) return {};
    const values: Record<string, string> = {
      名前: item.name,
      状態: item.status,
      タグ: item.tags.join("、"),
      作中での通説: item.lore,
      実際の真相: item.truth,
    };
    if ("kind" in item) {
      Object.assign(values, {
        ひとこと: item.subtitle,
        カテゴリ: item.category,
        "設定・メモ": item.body,
        所属する作品:
          data.projects.find((p) => p.id === item.projectId)?.name ||
          "削除済み",
        関連する設定: item.links
          .map(
            (id) => data.entries.find((e) => e.id === id)?.name || "削除済み",
          )
          .join("、"),
      });
      for (const [key, value] of Object.entries(item.fields))
        values[`項目：${key}`] = value;
      item.custom.forEach((field, i) => {
        values[`自由項目${i + 1}の名前`] = field.name;
        values[`自由項目${i + 1}の内容`] = field.value;
      });
    } else
      Object.assign(values, {
        説明: item.description,
        種類: item.type,
        上位プロジェクト:
          data.projects.find((p) => p.id === item.parentId)?.name || "なし",
      });
    return values;
  };
  const left = flatten(old),
    right = flatten(current);
  const rows = [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .filter((key) => (left[key] || "") !== (right[key] || ""))
    .map((key) => ({
      label: key,
      before: left[key] || "",
      after: right[key] || "",
    }));
  if (old.image !== current?.image)
    rows.push({
      label: "画像",
      before: old.image ? "保存された画像あり" : "画像なし",
      after: current?.image ? "現在の画像あり" : "画像なし",
    });
  return rows;
}
export function restoreRevision(data: Data, revision: Revision): Data {
  let result = data;
  const old =
    revision.target === "entry"
      ? data.entries.find((item) => item.id === revision.targetId)
      : data.projects.find((item) => item.id === revision.targetId);
  if (old) result = checkpoint(result, revision.target, old, "復元前の版");
  const snapshot = {
    ...revisionSnapshot(result, revision),
    updatedAt: new Date().toISOString(),
  };
  if (revision.target === "entry") {
    const entry = snapshot as Entry;
    if (!data.projects.some((project) => project.id === entry.projectId))
      throw new Error("先に保存先のストーリー・世界観を復元してください。");
    entry.links = entry.links.filter((id) =>
      data.entries.some((item) => item.id === id),
    );
    return {
      ...result,
      entries: putItem(result.entries, entry),
      relations: result.relations.filter(
        (relation) =>
          (relation.from !== entry.id && relation.to !== entry.id) ||
          (entry.kind === "character" &&
            sharedProjectIds(result, relation.projectId).has(entry.projectId)),
      ),
    };
  }
  const project = snapshot as Project;
  if (!result.projects.some((item) => item.id === project.parentId))
    project.parentId = "";
  // Changing hierarchy during a restore must not create a project cycle.
  let ancestor = project.parentId;
  const visited = new Set([project.id]);
  while (ancestor) {
    if (visited.has(ancestor)) {
      project.parentId = "";
      break;
    }
    visited.add(ancestor);
    ancestor =
      result.projects.find((item) => item.id === ancestor)?.parentId || "";
  }
  if (project.collectionId && !result.projects.some((item) => item.id === project.collectionId && (isWorldLibrary(item) || item.type === "シリーズ"))) project.collectionId = "";
  project.worldIds = project.worldIds?.filter(
    (id) => id !== project.id && result.projects.some((item) => item.id === id),
  );
  const restored = organizeStories({
    ...result,
    projects: putItem(result.projects, project),
  });
  try {
    validateBackup(restored);
  } catch {
    throw new Error(
      "復元すると参照や人物関係が成立しなくなります。参照先を確認してから戻してください。",
    );
  }
  return restored;
}

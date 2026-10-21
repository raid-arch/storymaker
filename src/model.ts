import { validAppearance } from "./appearance";
import type { Appearance } from "./appearance";
export type Status = string;
export type Kind = "character" | "world" | "event" | "clue";
export const syndromeCategory = "症候群";
export const statuses: Status[] = ["確定", "仮設定", "検討中", "没案"];
export const categories = [
  "国家・地域",
  "都市・建築物",
  "貴族・家系",
  "宗教・神話",
  "魔法・異能",
  "歴史・事件",
  "文化・風習",
  "アイテム・遺物",
  syndromeCategory,
];
export const kindLabels: Record<Kind, string> = {
  character: "キャラクター",
  world: "世界観",
  event: "年表・事件",
  clue: "伏線・謎",
};
export interface Project {
  id: string;
  name: string;
  description: string;
  image: string;
  tags: string[];
  status: Status;
  lore: string;
  truth: string;
  type: string;
  parentId: string;
  updatedAt: string;
}
export interface Entry {
  id: string;
  projectId: string;
  kind: Kind;
  name: string;
  subtitle: string;
  category: string;
  status: Status;
  tags: string[];
  image: string;
  body: string;
  lore: string;
  truth: string;
  fields: Record<string, string>;
  links: string[];
  custom: { name: string; value: string }[];
  updatedAt: string;
}
export function isSyndrome(entry: Entry): boolean {
  return entry.kind === "world" && entry.category.trim() === syndromeCategory;
}
export function syndromeDiseases(entry: Entry): string[] {
  return (entry.fields.構成する病気 || "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
}
export const relationTypes = [
  "親子",
  "兄弟姉妹",
  "婚姻",
  "養子",
  "友人",
  "敵対",
  "その他",
] as const;
export interface Relation {
  id: string;
  projectId: string;
  from: string;
  to: string;
  type: string;
  note: string;
}
export interface Data {
  appearance?: Appearance;
  version: 1;
  projects: Project[];
  entries: Entry[];
  relations: Relation[];
  categories: string[];
  positions: Record<string, { x: number; y: number }>;
  theme: "dark" | "light";
  lastBackup: string;
}
export function uniqueOptions(values: readonly string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}
export function statusOptions(data: Data): string[] {
  return uniqueOptions([
    ...statuses,
    ...data.projects.map((p) => p.status),
    ...data.entries.map((e) => e.status),
  ]);
}
export function categoryOptions(data: Data): string[] {
  return uniqueOptions([
    ...data.categories,
    syndromeCategory,
    ...data.entries.filter((e) => e.kind === "world").map((e) => e.category),
  ]);
}
export function fieldOptions(
  data: Data,
  key: string,
  defaults: readonly string[] = [],
): string[] {
  return uniqueOptions([
    ...defaults,
    ...data.entries.map((e) => e.fields[key] || ""),
  ]);
}
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export function newProject(): Project {
  return {
    id: uid(),
    name: "",
    description: "",
    image: "",
    tags: [],
    status: "仮設定",
    lore: "",
    truth: "",
    type: "作品",
    parentId: "",
    updatedAt: now(),
  };
}
export function newEntry(projectId: string, kind: Kind): Entry {
  return {
    id: uid(),
    projectId,
    kind,
    name: "",
    subtitle: "",
    category: "",
    status: "仮設定",
    tags: [],
    image: "",
    body: "",
    lore: "",
    truth: "",
    fields:
      kind === "character"
        ? { 生存状況: "生存", 系統: "本家" }
        : kind === "clue"
          ? { 回収状況: "未回収" }
          : {},
    links: [],
    custom: [],
    updatedAt: now(),
  };
}
export function emptyData(): Data {
  return {
    version: 1,
    projects: [],
    entries: [],
    relations: [],
    categories: [...categories],
    positions: {},
    theme: "dark",
    lastBackup: "",
  };
}
export function deleteEntry(data: Data, id: string): Data {
  return {
    ...data,
    entries: data.entries
      .filter((e) => e.id !== id)
      .map((e) => ({ ...e, links: e.links.filter((l) => l !== id) })),
    relations: data.relations.filter((r) => r.from !== id && r.to !== id),
    positions: Object.fromEntries(
      Object.entries(data.positions).filter(([key]) => key !== id),
    ),
  };
}
export function deleteProject(data: Data, id: string): Data {
  const ids = new Set([id]);
  let size = 0;
  while (size !== ids.size) {
    size = ids.size;
    data.projects.forEach((p) => {
      if (ids.has(p.parentId)) ids.add(p.id);
    });
  }
  const removed = new Set(
    data.entries.filter((e) => ids.has(e.projectId)).map((e) => e.id),
  );
  return {
    ...data,
    projects: data.projects.filter((p) => !ids.has(p.id)),
    entries: data.entries
      .filter((e) => !removed.has(e.id))
      .map((e) => ({ ...e, links: e.links.filter((l) => !removed.has(l)) })),
    relations: data.relations.filter((r) => !ids.has(r.projectId)),
    positions: Object.fromEntries(
      Object.entries(data.positions).filter(([key]) => !removed.has(key)),
    ),
  };
}
export function descendants(data: Data, id: string): Set<string> {
  const ids = new Set([id]);
  let old = 0;
  while (old !== ids.size) {
    old = ids.size;
    data.projects.forEach((p) => {
      if (ids.has(p.parentId)) ids.add(p.id);
    });
  }
  return ids;
}
export function searchEntries(entries: Entry[], q: string): Entry[] {
  const words = q.toLocaleLowerCase().trim().split(/\s+/);
  return entries.filter((e) =>
    words.every((w) =>
      JSON.stringify([
        e.name,
        e.subtitle,
        e.body,
        e.lore,
        e.truth,
        e.tags,
        e.fields,
        e.custom,
        e.category,
        e.status,
      ])
        .toLocaleLowerCase()
        .includes(w.replace(/^#/, "")),
    ),
  );
}
export function sortEvents(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => {
    const aYear = a.fields.年代?.trim(),
      bYear = b.fields.年代?.trim();
    return (
      (aYear ? Number(aYear) : Infinity) - (bYear ? Number(bYear) : Infinity) ||
      a.name.localeCompare(b.name, "ja")
    );
  });
}
export function familyGenerations(
  entries: Entry[],
  relations: Relation[],
): Record<string, number> {
  const chars = entries.filter((e) => e.kind === "character");
  const ids = new Set(chars.map((c) => c.id));
  const edges = relations.filter(
    (r) =>
      ["親子", "養子"].includes(r.type) && ids.has(r.from) && ids.has(r.to),
  );
  const incoming = new Map(chars.map((c) => [c.id, 0]));
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  for (const r of edges) {
    incoming.set(r.to, (incoming.get(r.to) || 0) + 1);
    parents.set(r.to, [...(parents.get(r.to) || []), r.from]);
    children.set(r.from, [...(children.get(r.from) || []), r.to]);
  }
  const queue = chars.filter((c) => !incoming.get(c.id)).map((c) => c.id);
  const byId = new Map(chars.map((c) => [c.id, c]));
  const result: Record<string, number> = {};
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i],
      manual = byId.get(id)!.fields.世代;
    result[id] =
      manual?.trim() && Number.isFinite(Number(manual))
        ? Math.max(0, Math.floor(Number(manual)))
        : Math.max(0, ...(parents.get(id) || []).map((p) => result[p] + 1));
    for (const child of children.get(id) || []) {
      incoming.set(child, incoming.get(child)! - 1);
      if (!incoming.get(child)) queue.push(child);
    }
  }
  if (queue.length !== chars.length)
    throw new Error("親子・養子関係が循環しています。");
  return result;
}
export function validateBackup(raw: unknown): Data {
  const fail = () => {
    throw new Error(
      "対応する綴庭のバックアップではありません。データは変更されていません。",
    );
  };
  if (!raw || typeof raw !== "object") return fail();
  const d = raw as Data;
  if (
    (d.appearance !== undefined && !validAppearance(d.appearance)) ||
    d.version !== 1 ||
    !Array.isArray(d.projects) ||
    !Array.isArray(d.entries) ||
    !Array.isArray(d.relations) ||
    !Array.isArray(d.categories) ||
    !d.positions ||
    typeof d.positions !== "object" ||
    Array.isArray(d.positions) ||
    !["light", "dark"].includes(d.theme) ||
    typeof d.lastBackup !== "string"
  )
    return fail();
  const str = (v: unknown) => typeof v === "string";
  const list = (v: unknown): v is string[] => Array.isArray(v) && v.every(str);
  const status = (v: unknown) => typeof v === "string";
  const obj = (v: unknown): v is Record<string, string> =>
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    Object.values(v).every(str);
  const ids = new Set<string>();
  for (const p of d.projects) {
    if (
      !p ||
      ![
        "id",
        "name",
        "description",
        "image",
        "lore",
        "truth",
        "parentId",
        "updatedAt",
      ].every((k) => str(p[k as keyof Project])) ||
      !list(p.tags) ||
      !status(p.status) ||
      !str(p.type) ||
      !p.id ||
      ids.has(p.id)
    )
      return fail();
    ids.add(p.id);
  }
  for (const p of d.projects) {
    if (p.parentId && !ids.has(p.parentId)) return fail();
    const seen = new Set([p.id]);
    let parent = p.parentId;
    while (parent) {
      if (seen.has(parent)) return fail();
      seen.add(parent);
      parent = d.projects.find((x) => x.id === parent)!.parentId;
    }
  }
  const entryIds = new Set<string>();
  for (const e of d.entries) {
    if (
      !e ||
      ![
        "id",
        "projectId",
        "name",
        "subtitle",
        "category",
        "image",
        "body",
        "lore",
        "truth",
        "updatedAt",
      ].every((k) => str(e[k as keyof Entry])) ||
      !["character", "world", "event", "clue"].includes(e.kind) ||
      !status(e.status) ||
      !list(e.tags) ||
      !list(e.links) ||
      !obj(e.fields) ||
      !Array.isArray(e.custom) ||
      !e.custom.every((c) => c && str(c.name) && str(c.value)) ||
      !ids.has(e.projectId) ||
      !e.id ||
      entryIds.has(e.id)
    )
      return fail();
    entryIds.add(e.id);
    if (
      e.kind === "event" &&
      e.fields.年代?.trim() &&
      !Number.isFinite(Number(e.fields.年代))
    )
      return fail();
  }
  if (d.entries.some((e) => e.links.some((id) => !entryIds.has(id))))
    return fail();
  const relationIds = new Set<string>();
  for (const r of d.relations) {
    if (
      !r ||
      !str(r.id) ||
      !r.id ||
      relationIds.has(r.id) ||
      !str(r.note) ||
      !ids.has(r.projectId) ||
      !str(r.type) ||
      !r.type.trim() ||
      r.from === r.to
    )
      return fail();
    relationIds.add(r.id);
    const from = d.entries.find((e) => e.id === r.from),
      to = d.entries.find((e) => e.id === r.to);
    if (
      !from ||
      !to ||
      from.kind !== "character" ||
      to.kind !== "character" ||
      from.projectId !== r.projectId ||
      to.projectId !== r.projectId
    )
      return fail();
  }
  try {
    familyGenerations(d.entries, d.relations);
  } catch {
    return fail();
  }
  if (
    !list(d.categories) ||
    Object.entries(d.positions).some(
      ([id, p]) =>
        !entryIds.has(id) ||
        !p ||
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y),
    )
  )
    return fail();
  if (
    [...d.projects, ...d.entries].some(
      (e) =>
        e.image &&
        !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(
          e.image,
        ),
    )
  )
    return fail();
  return d;
}
export function markdown(data: Data, projectId: string): string {
  const ids = descendants(data, projectId),
    projects = data.projects.filter((p) => ids.has(p.id)),
    entries = data.entries.filter((e) => ids.has(e.projectId));
  const safe = (s: string) => s.replace(/([\\`*_{}\[\]<>])/g, "\\$1");
  return (
    projects
      .map(
        (p) =>
          `# ${safe(p.name)}\n\n${p.description}\n\n状態: ${p.status}\n\nタグ: ${p.tags.map(safe).join(" / ")}\n\n## 作中での通説\n${p.lore}\n\n## 実際の真相\n${p.truth}\n\n` +
          entries
            .filter((e) => e.projectId === p.id)
            .map(
              (e) =>
                `<a id="${e.id}"></a>\n\n## ${safe(e.name)}\n\n${kindLabels[e.kind]} / ${safe(e.category)} / ${e.status}\n\n${safe(e.subtitle)}\n\n${e.body}\n\n` +
                Object.entries(e.fields)
                  .map(([k, v]) => `- ${safe(k)}: ${safe(v)}`)
                  .join("\n") +
                "\n" +
                e.custom
                  .map((c) => `- ${safe(c.name)}: ${safe(c.value)}`)
                  .join("\n") +
                `\n\n### 作中での通説\n${e.lore}\n\n### 実際の真相\n${e.truth}\n\nタグ: ${e.tags.map(safe).join(" / ")}\n\n関連: ` +
                e.links
                  .map((id) => {
                    const ref = data.entries.find((x) => x.id === id);
                    return `[${safe(ref?.name || id)}](#${id})`;
                  })
                  .join(" / "),
            )
            .join("\n\n---\n\n"),
      )
      .join("\n\n") +
    "\n\n## 人物の関係\n\n" +
    data.relations
      .filter((r) => ids.has(r.projectId))
      .map(
        (r) =>
          `- ${safe(data.entries.find((e) => e.id === r.from)?.name || "")} → ${safe(data.entries.find((e) => e.id === r.to)?.name || "")}（${r.type}）${safe(r.note)}`,
      )
      .join("\n")
  );
}

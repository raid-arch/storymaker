import type { Data } from "../model";
import { studioOf } from "./model";
import type { StudioTab } from "./model";

export interface Impact {
  key: string;
  id: string;
  title: string;
  projectId: string;
  tab?: StudioTab;
  entryId?: string;
  distance: number;
  reason: string;
}
export function impactOf(data: Data, entryId: string, depth = 2): Impact[] {
  const s = studioOf(data);
  const nodes = new Map<string, Omit<Impact, "distance" | "reason">>();
  const edges = new Map<string, { key: string; reason: string }[]>();
  const connect = (
    from: string,
    to: string,
    reason: string,
    reverse = "この設定から参照",
  ) => {
    edges.set(from, [...(edges.get(from) || []), { key: to, reason: reverse }]);
    edges.set(to, [...(edges.get(to) || []), { key: from, reason }]);
  };
  for (const entry of data.entries)
    nodes.set(`e:${entry.id}`, {
      key: `e:${entry.id}`,
      id: entry.id,
      entryId: entry.id,
      title: entry.name || "名前未設定",
      projectId: entry.projectId,
    });
  for (const entry of data.entries)
    for (const id of entry.links)
      connect(`e:${entry.id}`, `e:${id}`, "この設定を参照している設定");
  for (const relation of data.relations)
    connect(
      `e:${relation.from}`,
      `e:${relation.to}`,
      `人物の関係：${relation.type}`,
      `人物の関係：${relation.type}`,
    );
  const add = (
    tab: StudioTab,
    id: string,
    title: string,
    projectId: string,
    targets: string[],
  ) => {
    const key = `${tab}:${id}`;
    nodes.set(key, { key, id, title, projectId, tab });
    for (const target of targets.filter(Boolean))
      connect(key, `e:${target}`, `${title}で使用`, "関連する設定");
  };
  s.knowledge.forEach((item) =>
    add(
      "knowledge",
      item.id,
      `${data.entries.find((e) => e.id === item.characterId)?.name || "人物"}の認識`,
      item.projectId,
      [item.characterId, item.entryId, item.eventId],
    ),
  );
  s.terms.forEach((item) =>
    add("terms", item.id, `用語：${item.name}`, item.projectId, item.links),
  );
  (s.portrayals || []).forEach((item) =>
    add(
      "plot",
      item.id,
      `作品内の設定：${data.entries.find((entry) => entry.id === item.entryId)?.name || "設定"}`,
      item.projectId,
      [item.entryId],
    ),
  );
  s.scenes.forEach((item) =>
    add("plot", item.id, `シーン：${item.name}`, item.projectId, item.links),
  );
  s.references.forEach((item) =>
    add(
      "references",
      item.id,
      `画像資料：${item.name}`,
      item.projectId,
      item.links,
    ),
  );
  s.maps.forEach((item) =>
    add(
      "maps",
      item.id,
      `地図：${item.name}`,
      item.projectId,
      [...item.markers, ...item.territories].map((p) => p.entryId),
    ),
  );
  s.variants.forEach((item) =>
    add(
      "eras",
      item.id,
      `時代別の設定：${item.snapshot.name}`,
      item.projectId,
      [item.entryId],
    ),
  );
  s.constraints.forEach((item) =>
    add("checks", item.id, "事件の前後条件", item.projectId, [
      item.beforeId,
      item.afterId,
    ]),
  );
  s.knowledge
    .filter((item) => item.sceneId)
    .forEach((item) =>
      connect(
        `knowledge:${item.id}`,
        `plot:${item.sceneId}`,
        "情報を取得したシーン",
        "このシーンで取得する認識",
      ),
    );
  const root = `e:${entryId}`;
  const visited = new Set([root]);
  const queue = [{ key: root, distance: 0 }];
  const result: Impact[] = [];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (current.distance >= depth) continue;
    for (const edge of edges.get(current.key) || []) {
      if (visited.has(edge.key)) continue;
      visited.add(edge.key);
      const node = nodes.get(edge.key);
      if (!node) continue;
      result.push({
        ...node,
        distance: current.distance + 1,
        reason: edge.reason,
      });
      queue.push({ key: edge.key, distance: current.distance + 1 });
    }
  }
  const name = data.entries.find((e) => e.id === entryId)?.name?.trim();
  if (name && name.length >= 2)
    for (const entry of data.entries) {
      const key = `e:${entry.id}`;
      if (
        visited.has(key) ||
        !JSON.stringify([
          entry.body,
          entry.subtitle,
          entry.lore,
          entry.truth,
          entry.fields,
          entry.custom,
        ]).includes(name)
      )
        continue;
      result.push({
        ...nodes.get(key)!,
        distance: 1,
        reason: "本文などに名称が登場（リンク未登録）",
      });
    }
  return result.sort(
    (a, b) => a.distance - b.distance || a.title.localeCompare(b.title, "ja"),
  );
}

import { sharedProjectIds } from "../model";
import type { Data } from "../model";
import { studioOf } from "./model";
import { knowledgeYear, numberOf, variantBounds } from "./time";
export interface Finding {
  id: string;
  severity: "error" | "review" | "unknown";
  message: string;
  entryIds: string[];
}
export function checkConsistency(data: Data, projectId: string): Finding[] {
  const entries = data.entries.filter((entry) =>
    sharedProjectIds(data, projectId).has(entry.projectId),
  );
  const s = studioOf(data);
  const result: Finding[] = [];
  const add = (
    id: string,
    severity: Finding["severity"],
    message: string,
    entryIds: string[],
  ) => result.push({ id, severity, message, entryIds });
  const name = (id: string) =>
    data.entries.find((entry) => entry.id === id)?.name || "削除済みの設定";
  const rules = s.rules.find((rule) => rule.projectId === projectId);
  for (const entry of entries) {
    for (const key of [
      "生年",
      "没年",
      "存在開始年",
      "存在終了年",
      "開始年",
      "終了年",
      "世代",
    ])
      if (
        entry.fields[key]?.trim() &&
        numberOf(entry.fields[key]) === undefined
      )
        add(
          `number:${entry.id}:${key}`,
          "unknown",
          `${entry.name}：「${key}」が数値でないため比較できません。`,
          [entry.id],
        );
    for (const [from, to] of [
      ["生年", "没年"],
      ["存在開始年", "存在終了年"],
      ["開始年", "終了年"],
    ]) {
      const a = numberOf(entry.fields[from]),
        b = numberOf(entry.fields[to]);
      if (a !== undefined && b !== undefined && a > b)
        add(
          `range:${entry.id}:${from}`,
          "error",
          `${entry.name}：${from}が${to}より後です。`,
          [entry.id],
        );
    }
    const birth = numberOf(entry.fields.生年),
      death = numberOf(entry.fields.没年);
    if (
      birth !== undefined &&
      death !== undefined &&
      rules?.maxLifeSpan !== undefined &&
      death - birth > rules.maxLifeSpan
    )
      add(
        `age:${entry.id}`,
        "review",
        `${entry.name}：寿命が設定した上限 ${rules.maxLifeSpan} 年を超えています。`,
        [entry.id],
      );
    if (entry.kind === "event")
      for (const id of entry.links) {
        const person = data.entries.find(
          (item) => item.id === id && item.kind === "character",
        );
        const year = numberOf(entry.fields.年代);
        if (!person || year === undefined) continue;
        const born = numberOf(person.fields.生年),
          died = numberOf(person.fields.没年);
        if (
          (born !== undefined && year < born) ||
          (died !== undefined && year > died)
        )
          add(
            `event:${entry.id}:${id}`,
            "review",
            `${entry.name}（${year}年）は関連人物 ${person.name} の存命期間外です。回想・追悼・単なる参照なら問題ありません。`,
            [entry.id, id],
          );
      }
    for (const id of entry.links)
      if (!data.entries.some((item) => item.id === id))
        add(
          `link:${entry.id}:${id}`,
          "error",
          `${entry.name}：参照先が存在しません。`,
          [entry.id],
        );
  }
  const parents = data.relations.filter(
    (relation) =>
      sharedProjectIds(data, projectId).has(relation.projectId) &&
      ["親子", "養子"].includes(relation.type),
  );
  const graph = new Map<string, string[]>();
  for (const relation of parents) {
    graph.set(relation.from, [
      ...(graph.get(relation.from) || []),
      relation.to,
    ]);
    const parent = data.entries.find((entry) => entry.id === relation.from),
      child = data.entries.find((entry) => entry.id === relation.to);
    if (!parent || !child) continue;
    const pb = numberOf(parent.fields.生年),
      cb = numberOf(child.fields.生年),
      pd = numberOf(parent.fields.没年);
    if (relation.type === "親子" && pb !== undefined && cb !== undefined) {
      if (pb >= cb)
        add(
          `parent:${relation.id}`,
          "review",
          `${parent.name}の生年が、子 ${child.name} の生年以降です。血縁または年代を確認してください。`,
          [parent.id, child.id],
        );
      else if (
        rules?.minParentAge !== undefined &&
        cb - pb < rules.minParentAge
      )
        add(
          `parent-age:${relation.id}`,
          "review",
          `${parent.name}：出産時の年齢が設定した下限 ${rules.minParentAge} 歳未満です。`,
          [parent.id, child.id],
        );
      if (pd !== undefined && pd < cb)
        add(
          `posthumous:${relation.id}`,
          "review",
          `${child.name}は親 ${parent.name} の没年より後に出生しています。意図した死後出生等か確認してください。`,
          [parent.id, child.id],
        );
    } else if (
      relation.type === "親子" &&
      (pb === undefined || cb === undefined)
    )
      add(
        `undated-parent:${relation.id}`,
        "unknown",
        `${parent.name} と ${child.name}：生年が未確定のため年齢関係を検証できません。`,
        [parent.id, child.id],
      );
    const pg = numberOf(parent.fields.世代),
      cg = numberOf(child.fields.世代);
    if (pg !== undefined && cg !== undefined && pg >= cg)
      add(
        `generation:${relation.id}`,
        "review",
        `${parent.name} と ${child.name}：指定した世代の前後が親子関係と一致しません。`,
        [parent.id, child.id],
      );
  }
  const cycle = (edges: Map<string, string[]>): string[] => {
    const visiting = new Set<string>(),
      visited = new Set<string>();
    const found = new Set<string>();
    const visit = (id: string) => {
      if (visiting.has(id)) {
        found.add(id);
        return;
      }
      if (visited.has(id)) return;
      visiting.add(id);
      for (const to of edges.get(id) || []) visit(to);
      visiting.delete(id);
      visited.add(id);
    };
    for (const id of edges.keys()) visit(id);
    return [...found];
  };
  for (const id of cycle(graph))
    add(
      `family-cycle:${id}`,
      "error",
      `${name(id)}を含む親子・養子関係が循環しています。`,
      [id],
    );
  for (const relation of data.relations.filter((r) =>
    sharedProjectIds(data, projectId).has(r.projectId),
  ))
    if (
      relation.validFrom !== undefined &&
      relation.validTo !== undefined &&
      relation.validFrom > relation.validTo
    )
      add(
        `relation-range:${relation.id}`,
        "error",
        `${name(relation.from)} と ${name(relation.to)}：関係の開始年が終了年より後です。`,
        [relation.from, relation.to],
      );
  const events = new Map<string, string[]>();
  for (const constraint of s.constraints.filter((item) =>
    sharedProjectIds(data, projectId).has(item.projectId),
  )) {
    events.set(constraint.beforeId, [
      ...(events.get(constraint.beforeId) || []),
      constraint.afterId,
    ]);
    const a = data.entries.find((entry) => entry.id === constraint.beforeId),
      b = data.entries.find((entry) => entry.id === constraint.afterId);
    const ay = numberOf(a?.fields.年代),
      by = numberOf(b?.fields.年代);
    if (!a || !b || ay === undefined || by === undefined)
      add(
        `constraint:${constraint.id}`,
        "unknown",
        `${name(constraint.beforeId)} → ${name(constraint.afterId)}：年代または事件が未確定です。`,
        [constraint.beforeId, constraint.afterId],
      );
    else if (ay + constraint.gap > by)
      add(
        `constraint:${constraint.id}`,
        "error",
        `${a.name} → ${b.name}：少なくとも ${constraint.gap} 年後という前後条件に反しています。`,
        [a.id, b.id],
      );
  }
  for (const id of cycle(events))
    add(
      `time-cycle:${id}`,
      "error",
      `${name(id)}を含む事件の前後条件が循環しています。`,
      [id],
    );
  for (const item of s.knowledge.filter((item) =>
    sharedProjectIds(data, projectId).has(item.projectId),
  )) {
    const person = data.entries.find((entry) => entry.id === item.characterId),
      target = data.entries.find((entry) => entry.id === item.entryId);
    if (!person || !target) {
      add(
        `knowledge:${item.id}`,
        "unknown",
        "認識の人物または対象の設定が削除されています。",
        [item.characterId, item.entryId],
      );
      continue;
    }
    const year = knowledgeYear(data, item),
      birth = numberOf(person.fields.生年);
    if (year !== undefined && birth !== undefined && year < birth)
      add(
        `knowledge:${item.id}`,
        "review",
        `${person.name} が ${target.name} を知った年は出生前です。前世・予知など意図した設定か確認してください。`,
        [person.id, target.id],
      );
  }
  const variants = s.variants.filter((item) =>
    sharedProjectIds(data, projectId).has(item.projectId),
  );
  for (let i = 0; i < variants.length; i++) {
    const a = variants[i],
      ab = variantBounds(a, s.eras);
    if (ab.from !== undefined && ab.to !== undefined && ab.from > ab.to)
      add(
        `variant-range:${a.id}`,
        "error",
        `${a.snapshot.name}：時代別設定の開始年が終了年より後です。`,
        [a.entryId],
      );
    if (ab.from === undefined && ab.to === undefined) continue;
    for (const b of variants
      .slice(i + 1)
      .filter((item) => item.entryId === a.entryId)) {
      const bb = variantBounds(b, s.eras);
      if (bb.from === undefined && bb.to === undefined) continue;
      if (
        (ab.from ?? -Infinity) <= (bb.to ?? Infinity) &&
        (bb.from ?? -Infinity) <= (ab.to ?? Infinity)
      )
        add(
          `variant-overlap:${a.id}:${b.id}`,
          "review",
          `${a.snapshot.name}：時代別の設定期間が重複しています。表示する案を確認してください。`,
          [a.entryId],
        );
    }
  }
  return result;
}

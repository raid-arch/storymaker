import { familyGenerations, sharedProjectIds } from "../model";
import type { Data } from "../model";
/** Stable layered placement; coordinates never alter people or blood relations. */
export function familyLayout(data: Data, projectId: string): Data["positions"] {
  const people = data.entries.filter(
    (e) =>
      sharedProjectIds(data, projectId).has(e.projectId) &&
      e.kind === "character",
  );
  const relations = data.relations.filter((r) =>
    sharedProjectIds(data, projectId).has(r.projectId),
  );
  const generations = familyGenerations(people, relations);
  const levels = [...new Set(Object.values(generations))].sort((a, b) => a - b);
  const rows = levels.map((level) =>
    people.filter((e) => generations[e.id] === level),
  );
  const maximum = Math.max(1, ...rows.map((row) => row.length));
  const positions: Data["positions"] = {};
  rows.forEach((row, level) => {
    const parentX = (id: string) => {
      const parents = relations
        .filter((r) => r.to === id && ["親子", "養子"].includes(r.type))
        .map((r) => positions[r.from]?.x)
        .filter((x): x is number => x !== undefined);
      return parents.length
        ? parents.reduce((a, b) => a + b, 0) / parents.length
        : Number.MAX_SAFE_INTEGER;
    };
    row.sort(
      (a, b) =>
        parentX(a.id) - parentX(b.id) ||
        a.name.localeCompare(b.name, "ja") ||
        a.id.localeCompare(b.id),
    );
    // Place spouses beside each other when their generation agrees.
    for (let i = 0; i < row.length; i++) {
      const spouse = relations.find(
        (r) =>
          r.type === "婚姻" && (r.from === row[i].id || r.to === row[i].id),
      );
      if (!spouse) continue;
      const other = spouse.from === row[i].id ? spouse.to : spouse.from;
      const index = row.findIndex((p, j) => j > i + 1 && p.id === other);
      if (index >= 0) row.splice(i + 1, 0, ...row.splice(index, 1));
    }
    row.forEach((person, index) => {
      positions[person.id] = {
        x: 80 + (maximum - row.length) * 125 + index * 250,
        y: 90 + level * 200,
      };
    });
  });
  return positions;
}

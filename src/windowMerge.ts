const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const rows = (v: unknown): v is { id: string }[] =>
  Array.isArray(v) && v.every((x) => object(x) && typeof x.id === "string");
function record(
  base: unknown,
  local: unknown,
  own: Map<string, unknown>,
  path: string[],
) {
  if (same(base, local)) return;
  if (rows(base) && rows(local)) {
    const b = new Map(base.map((x) => [x.id, x]));
    const l = new Map(local.map((x) => [x.id, x]));
    for (const id of new Set([...b.keys(), ...l.keys()]))
      record(b.get(id), l.get(id), own, [...path, id]);
    return;
  }
  if (object(local) && (object(base) || base === undefined)) {
    const b = object(base) ? base : {};
    for (const key of new Set([...Object.keys(b), ...Object.keys(local)]))
      record(b[key], local[key], own, [...path, key]);
    return;
  }
  own.set(JSON.stringify(path), structuredClone(local));
}
export function mergeWindows(
  base: unknown,
  local: unknown,
  remote: unknown,
  own = new Map<string, unknown>(),
  path: string[] = [],
): unknown {
  if (same(local, base)) return remote;
  const key = JSON.stringify(path);
  if (own.has(key) && same(local, own.get(key))) return remote;
  if (
    same(remote, base) ||
    same(local, remote) ||
    (own.has(key) && same(remote, own.get(key)))
  ) {
    record(base, local, own, path);
    return local;
  }
  if (rows(base) && rows(local) && rows(remote)) {
    const b = new Map(base.map((x) => [x.id, x])),
      l = new Map(local.map((x) => [x.id, x])),
      r = new Map(remote.map((x) => [x.id, x]));
    return [...new Set([...local, ...remote].map((x) => x.id))]
      .map((id) =>
        mergeWindows(b.get(id), l.get(id), r.get(id), own, [...path, id]),
      )
      .filter((x) => x !== undefined);
  }
  if (object(local) && object(remote) && (object(base) || base === undefined)) {
    const b = object(base) ? base : {};
    return Object.fromEntries(
      [
        ...new Set([
          ...Object.keys(b),
          ...Object.keys(local),
          ...Object.keys(remote),
        ]),
      ]
        .map((k) => [
          k,
          mergeWindows(b[k], local[k], remote[k], own, [...path, k]),
        ])
        .filter(([, v]) => v !== undefined),
    );
  }
  throw new Error(
    "別ウィンドウで同じ項目が変更されました。この画面の内容は保持しています。JSONで保護してから保存済みデータを開き直してください。",
  );
}

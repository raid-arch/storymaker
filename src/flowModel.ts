export interface FlowNode {
  id: string;
  title: string;
  memo: string;
  x: number;
  y: number;
  color: string;
  collapsed: boolean;
  sceneId: string;
  entryId: string;
}
export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  label: string;
}
export interface FlowBoard {
  id: string;
  projectId: string;
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  currentNodeId: string;
}
export function validBoard(value: Record<string, unknown>): boolean {
  if (
    typeof value.projectId !== "string" ||
    typeof value.name !== "string" ||
    typeof value.currentNodeId !== "string" ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges)
  )
    return false;
  const ids = new Set<string>();
  for (const n of value.nodes) {
    if (
      !n ||
      typeof n !== "object" ||
      !["id", "title", "memo", "sceneId", "entryId", "color"].every(
        (k) => typeof n[k] === "string",
      ) ||
      !n.id ||
      ids.has(n.id) ||
      !Number.isFinite(n.x) ||
      !Number.isFinite(n.y) ||
      Math.abs(n.x) > 100000 ||
      Math.abs(n.y) > 100000 ||
      typeof n.collapsed !== "boolean" ||
      !/^#[0-9a-f]{6}$/i.test(n.color)
    )
      return false;
    ids.add(n.id);
  }
  const edges = new Set<string>();
  return (
    (!value.currentNodeId || ids.has(value.currentNodeId as string)) &&
    value.edges.every(
      (e) =>
        e &&
        typeof e.id === "string" &&
        !!e.id &&
        !edges.has(e.id) &&
        !!edges.add(e.id) &&
        ids.has(e.from) &&
        ids.has(e.to) &&
        e.from !== e.to &&
        typeof e.label === "string",
    )
  );
}

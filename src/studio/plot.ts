import type { Scene } from "./model";
export function moveScene(
  items: Scene[],
  id: string,
  columnId: string,
  index: number,
): Scene[] {
  const item = items.find((scene) => scene.id === id);
  if (!item) return items;
  const peers = items
    .filter(
      (scene) =>
        scene.projectId === item.projectId &&
        scene.columnId === columnId &&
        scene.id !== id,
    )
    .slice()
    .sort((a, b) => a.order - b.order);
  peers.splice(Math.max(0, Math.min(peers.length, index)), 0, {
    ...item,
    columnId,
  });
  const changes = new Map(
    peers.map((scene, i) => [scene.id, { ...scene, order: i }]),
  );
  return items.map((scene) => changes.get(scene.id) || scene);
}

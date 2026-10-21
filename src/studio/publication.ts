import type { Data } from "../model";
import { studioOf } from "./model";
import type { Publication } from "./model";
export interface PublicItem {
  title: string;
  text: string;
}
export interface PublicDocument {
  format: "storymaker-public";
  version: 1;
  items: PublicItem[];
}
export function publicationTargets(
  data: Data,
  projectId: string,
): { key: string; target: Publication["target"]; id: string; label: string }[] {
  const projects = new Set([projectId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const p of data.projects)
      if (projects.has(p.parentId) && !projects.has(p.id)) {
        projects.add(p.id);
        changed = true;
      }
  }
  const s = studioOf(data);
  return [
    ...data.projects
      .filter((p) => projects.has(p.id))
      .map((p) => ({
        key: `project:${p.id}`,
        target: "project" as const,
        id: p.id,
        label: `作品・章：${p.name}`,
      })),
    ...data.entries
      .filter((e) => projects.has(e.projectId))
      .map((e) => ({
        key: `entry:${e.id}`,
        target: "entry" as const,
        id: e.id,
        label: `設定：${e.name}`,
      })),
    ...s.terms
      .filter((e) => projects.has(e.projectId))
      .map((e) => ({
        key: `term:${e.id}`,
        target: "term" as const,
        id: e.id,
        label: `用語：${e.name}`,
      })),
    ...s.scenes
      .filter((e) => projects.has(e.projectId))
      .map((e) => ({
        key: `scene:${e.id}`,
        target: "scene" as const,
        id: e.id,
        label: `シーン：${e.name}`,
      })),
  ];
}
/** Allowlist projection: only independently authored public text crosses this boundary. */
export function publicDocument(data: Data, projectId: string): PublicDocument {
  const targets = new Set(
    publicationTargets(data, projectId).map((t) => t.key),
  );
  return {
    format: "storymaker-public",
    version: 1,
    items: studioOf(data)
      .publications.filter(
        (p) => p.enabled && targets.has(`${p.target}:${p.targetId}`),
      )
      .map((p) => ({ title: p.title.trim() || "公開設定", text: p.text })),
  };
}
export function publicMarkdown(document: PublicDocument): string {
  return `# 公開設定\n\n${document.items.map((item) => `## ${item.title.replace(/\s+/g, " ")}\n\n${item.text}`).join("\n\n---\n\n")}\n`;
}

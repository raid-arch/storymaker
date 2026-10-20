export const dashboardSections = [
  { id: "hero", label: "作品の紹介" },
  { id: "stats", label: "設定の件数" },
  { id: "recent", label: "最近綴った設定" },
  { id: "mysteries", label: "物語に残る問い" },
  { id: "backup", label: "バックアップの案内" },
] as const;
export type DashboardSection = (typeof dashboardSections)[number]["id"];
export interface Appearance {
  accent: "sage" | "blue" | "lavender" | "amber";
  fontSize: "small" | "medium" | "large";
  font: "sans" | "serif";
  density: "comfortable" | "compact";
  layout: "cards" | "list";
  dashboard: DashboardSection[];
}
export function defaultAppearance(): Appearance {
  return {
    accent: "sage",
    fontSize: "medium",
    font: "sans",
    density: "comfortable",
    layout: "cards",
    dashboard: dashboardSections.map((s) => s.id),
  };
}
export function validAppearance(value: unknown): value is Appearance {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const a = value as Appearance;
  return (
    ["sage", "blue", "lavender", "amber"].includes(a.accent) &&
    ["small", "medium", "large"].includes(a.fontSize) &&
    ["sans", "serif"].includes(a.font) &&
    ["comfortable", "compact"].includes(a.density) &&
    ["cards", "list"].includes(a.layout) &&
    Array.isArray(a.dashboard) &&
    a.dashboard.every((id) => dashboardSections.some((s) => s.id === id)) &&
    new Set(a.dashboard).size === a.dashboard.length
  );
}

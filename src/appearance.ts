export const dashboardSections = [
  { id: "hero", label: "作品の紹介" },
  { id: "stats", label: "設定の件数" },
  { id: "recent", label: "最近綴った設定" },
  { id: "mysteries", label: "物語に残る問い" },
  { id: "backup", label: "バックアップの案内" },
] as const;
export type DashboardSection = (typeof dashboardSections)[number]["id"];
export interface Appearance {
  accent: "sage" | "blue" | "lavender" | "amber" | "rose" | "teal" | "silver";
  fontSize: "small" | "medium" | "large";
  font: "sans" | "serif";
  density: "comfortable" | "compact";
  layout: "cards" | "list";
  dashboard: DashboardSection[];
  background?: "plain" | "glow" | "paper" | "grid";
  surface?: "classic" | "soft" | "outlined";
}
export function defaultAppearance(): Appearance {
  return {
    background: "plain",
    surface: "classic",
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
    ["sage", "blue", "lavender", "amber", "rose", "teal", "silver"].includes(a.accent) &&
    (a.background === undefined || ["plain", "glow", "paper", "grid"].includes(a.background)) &&
    (a.surface === undefined || ["classic", "soft", "outlined"].includes(a.surface)) &&
    ["small", "medium", "large"].includes(a.fontSize) &&
    ["sans", "serif"].includes(a.font) &&
    ["comfortable", "compact"].includes(a.density) &&
    ["cards", "list"].includes(a.layout) &&
    Array.isArray(a.dashboard) &&
    a.dashboard.every((id) => dashboardSections.some((s) => s.id === id)) &&
    new Set(a.dashboard).size === a.dashboard.length
  );
}

export const designPresets: { id: string; name: string; description: string; theme: "dark" | "light"; accent: Appearance["accent"]; background: NonNullable<Appearance["background"]>; surface: NonNullable<Appearance["surface"]>; font: Appearance["font"] }[] = [
  { id: "forest", name: "深緑の書斎", description: "深い緑と、やわらかな灯り", theme: "dark", accent: "sage", background: "glow", surface: "soft", font: "sans" },
  { id: "night", name: "星夜のアトリエ", description: "静かな青に物語を描く", theme: "dark", accent: "blue", background: "glow", surface: "soft", font: "sans" },
  { id: "violet", name: "月影の図書館", description: "紫の余韻と明朝の文字", theme: "dark", accent: "lavender", background: "plain", surface: "classic", font: "serif" },
  { id: "rose", name: "薔薇の手帖", description: "淡いローズの、親しみある机", theme: "light", accent: "rose", background: "paper", surface: "soft", font: "sans" },
  { id: "parchment", name: "古書の頁", description: "琥珀色の紙に歴史を綴る", theme: "light", accent: "amber", background: "paper", surface: "classic", font: "serif" },
  { id: "ocean", name: "海辺の製図室", description: "青緑の方眼に世界を組み立てる", theme: "light", accent: "teal", background: "grid", surface: "outlined", font: "sans" },
  { id: "ink", name: "墨の作業室", description: "色を抑えて、文章に集中する", theme: "dark", accent: "silver", background: "plain", surface: "outlined", font: "sans" },
  { id: "white", name: "白紙のアトリエ", description: "明るく、すっきりとした制作机", theme: "light", accent: "silver", background: "plain", surface: "soft", font: "sans" },
];

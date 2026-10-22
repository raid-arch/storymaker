import type { Data } from "../model";
import { studioOf } from "./model";
import type { StudioTab } from "./model";
export function searchStudio(
  data: Data,
  query: string,
): {
  id: string;
  projectId: string;
  tab: StudioTab;
  title: string;
  detail: string;
}[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [];
  const s = studioOf(data);
  const results: ReturnType<typeof searchStudio> = [];
  const add = (
    tab: StudioTab,
    items: { id: string; projectId: string }[],
    label: string,
  ) => {
    for (const item of items) {
      const { imageId: _image, ...text } = item as typeof item & {
        imageId?: string;
      };
      if (JSON.stringify(text).toLocaleLowerCase().includes(q)) {
        const named = item as typeof item & { name?: string; belief?: string };
        results.push({
          id: item.id,
          projectId: item.projectId,
          tab,
          title: named.name || named.belief || label,
          detail: label,
        });
      }
    }
  };
  add("terms", s.terms, "用語辞典");
  add("references", s.references, "画像資料");
  add("plot", s.scenes, "プロット・シーン");
  add(
    "plot",
    (s.portrayals || []).map((item) => ({
      ...item,
      name:
        data.entries.find((entry) => entry.id === item.entryId)?.name ||
        "作品内の設定",
    })),
    "ストーリー固有の設定",
  );
  add("maps", s.maps, "世界地図");
  add("knowledge", s.knowledge, "人物の認識");
  add("eras", s.eras, "時代");
  add("templates", s.templates, "設定テンプレート");
  return results;
}

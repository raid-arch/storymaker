import RichManuscript from "./RichManuscript";
import type { Data } from "./model";
import { studioOf } from "./studio/model";
import { patchScene } from "./studio/creation";
import type { Mutation } from "./studio/ui";
export default function WritingWorkspace({
  data,
  projectId,
  sceneId,
  onSelect,
  onCreate,
  onSettings,
  change,
}: {
  data: Data;
  projectId: string;
  sceneId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onSettings: () => void;
  change: Mutation;
}) {
  const studio = studioOf(data),
    scenes = studio.scenes.filter((s) => s.projectId === projectId),
    scene = scenes.find((s) => s.id === sceneId) || scenes[0];
  return (
    <section className="writing-workspace" aria-label="原稿の執筆画面">
      <div className="writing-scene-chooser">
        <label>
          執筆するシーン
          <select
            value={scene?.id || ""}
            onChange={(e) => onSelect(e.target.value)}
          >
            <option value="" disabled>
              シーンを選ぶ
            </option>
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {studio.columns.find((c) => c.id === s.columnId)?.name ||
                  "未分類"}{" "}
                / {s.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button subtle" onClick={onCreate}>
          ＋ 新しいシーン
        </button>
      </div>
      {scene ? (
        <RichManuscript
          key={scene.id}
          scene={scene}
          onClose={onSettings}
          onChange={(manuscriptHtml, manuscript) =>
            change(
              (d) => patchScene(d, scene.id, { manuscriptHtml, manuscript }),
              `manuscript:${scene.id}`,
            )
          }
        />
      ) : (
        <div className="panel empty-state">
          <h2>本文を執筆する</h2>
          <p>
            原稿はシーンごとに保存されます。見出し・太字・箇条書きなどを使って書けます。
          </p>
          <button className="button primary" onClick={onCreate}>
            最初のシーンを書く
          </button>
        </div>
      )}
    </section>
  );
}

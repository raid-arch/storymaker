import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Check,
  Columns3,
  FileText,
  Flag,
  GripVertical,
  Plus,
  Users,
  X,
} from "lucide-react";
import { newEntry, now } from "./model";
import type { Data, Project } from "./model";
import type { Scene } from "./studio/model";
import { editStudio, sid, studioOf } from "./studio/model";
import {
  creationEntries,
  makeScene,
  orderedCreationScenes,
  patchScene,
  putPortrayal,
  sceneCast,
} from "./studio/creation";
import { moveScene } from "./studio/plot";
import type { Mutation } from "./studio/ui";
import Modal from "./Modal";
import FreeTextInput from "./FreeTextInput";

export default function StoryPlanner({
  data,
  project,
  change,
  onWrite,
  onCast,
  onTimeline,
}: {
  data: Data;
  project: Project;
  change: Mutation;
  onWrite: (id: string) => void;
  onCast: () => void;
  onTimeline: () => void;
}) {
  const studio = studioOf(data);
  const scenes = orderedCreationScenes(data, project.id);
  const columns = studio.columns
    .filter((c) => c.projectId === project.id)
    .slice()
    .sort((a, b) => a.order - b.order);
  const chapters = [...columns, { id: "", name: "未分類", order: Infinity }];
  const entries = creationEntries(data, project.id),
    people = entries.filter((e) => e.kind === "character");
  const [view, setView] = useState(() => {
      try {
        const saved = localStorage.getItem(
          `tsuzuriniwa:plot-view:${project.id}`,
        );
        return saved &&
          ["board", "outline", "manuscript", "matrix", "threads"].includes(
            saved,
          )
          ? saved
          : "board";
      } catch {
        return "board";
      }
    }),
    [editing, setEditing] = useState(""),
    [chapterName, setChapterName] = useState(""),
    [query, setQuery] = useState(""),
    [stage, setStage] = useState(""),
    [clueName, setClueName] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem(`tsuzuriniwa:plot-view:${project.id}`, view);
    } catch {}
  }, [project.id, view]);
  const clues = entries.filter((e) => e.kind === "clue");
  const plan = project.storyPlan || {};
  const selected = scenes.find((s) => s.id === editing);
  const words = scenes.reduce(
    (sum, s) => sum + Array.from(s.manuscript || "").length,
    0,
  );
  const completed = scenes.filter((s) => s.status === "完成").length;
  const target = Number(plan.targetWords);
  const visible = scenes.filter(
    (s) =>
      (!stage || s.status === stage) &&
      `${s.name} ${s.summary} ${s.purpose || ""} ${s.conflict || ""} ${s.outcome || ""}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  const name = (id?: string) =>
    entries.find((e) => e.id === id)?.name || "未設定";
  function updatePlan(key: string, value: string) {
    change(
      (d) => ({
        ...d,
        projects: d.projects.map((p) =>
          p.id === project.id
            ? {
                ...p,
                storyPlan: { ...p.storyPlan, [key]: value },
                updatedAt: now(),
              }
            : p,
        ),
      }),
      `plan:${project.id}`,
    );
  }
  function patch(id: string, fields: Partial<Scene>) {
    change((d) => patchScene(d, id, fields), `scene:${id}`);
  }
  function addScene(columnId: string) {
    const scene = makeScene(project.id, columnId, scenes);
    change((d) =>
      editStudio(d, (s) => ({ ...s, scenes: [...s.scenes, scene] })),
    );
    setEditing(scene.id);
  }
  function move(id: string, columnId: string, index: number) {
    change((d) =>
      editStudio(d, (s) => ({
        ...s,
        scenes: moveScene(s.scenes, id, columnId, index),
      })),
    );
  }
  function addChapters(names: string[]) {
    change((d) =>
      editStudio(d, (s) => ({
        ...s,
        columns: [
          ...s.columns,
          ...names.map((name, i) => ({
            id: sid(),
            projectId: project.id,
            name,
            chapterId: "",
            order: columns.length + i,
          })),
        ],
      })),
    );
  }
  function reorderChapter(id: string, delta: number) {
    const ordered = [...columns],
      index = ordered.findIndex((c) => c.id === id),
      next = index + delta;
    if (next < 0 || next >= ordered.length) return;
    [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
    change((d) =>
      editStudio(d, (s) => ({
        ...s,
        columns: s.columns.map((c) => {
          const i = ordered.findIndex((item) => item.id === c.id);
          return i < 0 ? c : { ...c, order: i };
        }),
      })),
    );
  }
  function castToggle(scene: Scene, id: string) {
    const cast = sceneCast(scene, data.entries),
      checked = cast.includes(id);
    change((d) => {
      const next = patchScene(d, scene.id, {
        castIds: checked ? cast.filter((x) => x !== id) : [...cast, id],
      });
      return checked ? next : putPortrayal(next, project.id, id);
    });
  }
  function stageClass(status: string) {
    return status === "完成"
      ? "done"
      : status === "推敲中"
        ? "review"
        : status === "執筆中"
          ? "writing"
          : "idea";
  }
  function controls(scene: Scene) {
    const siblings = scenes.filter((s) => s.columnId === scene.columnId),
      index = siblings.findIndex((s) => s.id === scene.id);
    return (
      <div className="plot-card-actions">
        <button className="button subtle" onClick={() => setEditing(scene.id)}>
          プロットを編集
        </button>
        <button className="button primary" onClick={() => onWrite(scene.id)}>
          <FileText size={14} />
          本文を書く
        </button>
        <div className="plot-card-order">
          <button
            className="icon-button"
            aria-label={`${scene.name}を前へ`}
            disabled={index === 0}
            onClick={() => move(scene.id, scene.columnId, index - 1)}
          >
            <ArrowUp size={15} />
          </button>
          <button
            className="icon-button"
            aria-label={`${scene.name}を後へ`}
            disabled={index === siblings.length - 1}
            onClick={() => move(scene.id, scene.columnId, index + 1)}
          >
            <ArrowDown size={15} />
          </button>
        </div>
      </div>
    );
  }
  return (
    <section className="story-planner" aria-label="物語の設計図">
      <section className="panel plot-compass">
        <div className="plot-compass-header">
          <div>
            <span className="eyebrow">THE STORY YOU WANT TO TELL</span>
            <h2>物語の設計図</h2>
            <p>全体を見渡して、場面をつなぎ、一つの物語にする。</p>
          </div>
          <div className="plot-progress">
            <strong>
              {words.toLocaleString()}
              <small>字</small>
            </strong>
            <span>
              {completed} / {scenes.length} シーン完成
            </span>
            {target > 0 && (
              <>
                <progress
                  aria-label="本文の目標達成率"
                  max={target}
                  value={Math.min(words, target)}
                />
                <small>
                  目標 {target.toLocaleString()}字 ·{" "}
                  {Math.floor((words / target) * 100)}%
                </small>
              </>
            )}
          </div>
        </div>
        <label className="plot-logline">
          この物語を一文で
          <input
            value={plan.logline || ""}
            onChange={(e) => updatePlan("logline", e.target.value)}
            placeholder="誰が、何を望み、何を乗り越える物語？"
          />
        </label>
        <details className="plot-blueprint">
          <summary>テーマ・あらすじ・結末を設計する</summary>
          <div className="plot-plan-grid">
            {[
              ["theme", "作品のテーマ", "読み終えたとき、何を残したい？"],
              ["premise", "物語の出発点", "主人公・舞台・きっかけ"],
              ["synopsis", "全体のあらすじ", "始まりから結末までの流れ"],
              ["ending", "到達点・結末", "最後に何が変わる？"],
            ].map(([key, title, placeholder]) => (
              <label key={key}>
                {title}
                <textarea
                  rows={key === "synopsis" ? 6 : 3}
                  value={plan[key] || ""}
                  placeholder={placeholder}
                  onChange={(e) => updatePlan(key, e.target.value)}
                />
              </label>
            ))}
            <label>
              本文の目標文字数
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={plan.targetWords || ""}
                onChange={(e) => updatePlan("targetWords", e.target.value)}
                placeholder="例：100000"
              />
            </label>
          </div>
        </details>
      </section>
      <div className="plot-workbench-toolbar">
        <div className="choice-group" aria-label="プロットの表示方法">
          {[
            ["board", "カード", Columns3],
            ["outline", "あらすじ通読", BookOpen],
            ["manuscript", "本文を通読", FileText],
            ["matrix", "人物の登場表", Users],
            ["threads", "伏線の配置", Flag],
          ].map(([id, title, Icon]) => {
            const Glyph = Icon as typeof Columns3;
            return (
              <button
                key={String(id)}
                aria-pressed={view === id}
                className={view === id ? "selected" : ""}
                onClick={() => setView(String(id))}
              >
                <Glyph size={16} />
                {String(title)}
              </button>
            );
          })}
        </div>
        <div className="plot-tools">
          <button className="button subtle" onClick={onCast}>
            登場人物を設定
          </button>
          <button className="button subtle" onClick={onTimeline}>
            時間軸を確認
          </button>
        </div>
      </div>
      <form
        className="plot-chapter-create"
        onSubmit={(e) => {
          e.preventDefault();
          if (chapterName.trim()) {
            addChapters([chapterName.trim()]);
            setChapterName("");
          }
        }}
      >
        <label>
          新しい章
          <input
            aria-label="設計図に追加する章の名前"
            value={chapterName}
            onChange={(e) => setChapterName(e.target.value)}
            placeholder="章・幕・エピソード名を自由に"
          />
        </label>
        <button className="button subtle" type="submit">
          <Plus size={16} />
          章を作る
        </button>
        <button
          className="button primary"
          type="button"
          onClick={() => addScene("")}
        >
          <Plus size={16} />
          シーンを追加
        </button>
      </form>
      {!columns.length && (
        <details className="plot-structure-starters">
          <summary>構成のひな形から始める</summary>
          <p>空の章だけを追加します。今あるシーンや本文はそのままです。</p>
          <div className="choice-group">
            {[
              ["三幕構成", ["第一幕：始まり", "第二幕：展開", "第三幕：結末"]],
              ["起承転結", ["起", "承", "転", "結"]],
              ["序破急", ["序", "破", "急"]],
            ].map(([title, names]) => (
              <button
                type="button"
                key={String(title)}
                onClick={() => addChapters(names as string[])}
              >
                {String(title)}
              </button>
            ))}
          </div>
        </details>
      )}
      <div className="plot-filters">
        <label>
          シーンを探す
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="名前・あらすじ・目的から検索"
          />
        </label>
        <label>
          進行状態
          <select
            aria-label="設計図の進行状態で絞り込み"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            <option value="">すべて</option>
            {[
              ...new Set([
                "構想中",
                "執筆中",
                "推敲中",
                "完成",
                ...scenes.map((s) => s.status),
              ]),
            ].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <span>{visible.length} シーン</span>
      </div>
      {view === "board" && (
        <div
          className="plot-board-scroll"
          role="region"
          aria-label="章ごとのプロットボード"
          tabIndex={0}
        >
          <div className="plot-workbench-board">
            {chapters.map((chapter, index) => {
              const members = visible.filter(
                (s) =>
                  s.columnId === chapter.id ||
                  (!chapter.id && !columns.some((c) => c.id === s.columnId)),
              );
              return (
                <section
                  className="plot-workbench-column"
                  key={chapter.id}
                  onDragOver={(e) => {
                    if (
                      e.dataTransfer.types.includes(
                        "application/x-storymaker-scene",
                      )
                    )
                      e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData(
                      "application/x-storymaker-scene",
                    );
                    if (scenes.some((s) => s.id === id))
                      move(id, chapter.id, scenes.length);
                  }}
                >
                  <header>
                    <div>
                      <span className="eyebrow">
                        {chapter.id
                          ? `CHAPTER ${String(index + 1).padStart(2, "0")}`
                          : "INBOX"}
                      </span>
                      <h3>
                        {chapter.name}
                        <small>{members.length}</small>
                      </h3>
                    </div>
                    {chapter.id && (
                      <div className="plot-column-order">
                        <button
                          className="icon-button"
                          aria-label={`${chapter.name}を前の章へ`}
                          disabled={index === 0}
                          onClick={() => reorderChapter(chapter.id, -1)}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`${chapter.name}を後の章へ`}
                          disabled={index === columns.length - 1}
                          onClick={() => reorderChapter(chapter.id, 1)}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    )}
                  </header>
                  {members.map((scene) => (
                    <article
                      className="plot-workbench-card"
                      data-stage={stageClass(scene.status)}
                      key={scene.id}
                      draggable
                      onDragOver={(e) => {
                        if (
                          e.dataTransfer.types.includes(
                            "application/x-storymaker-scene",
                          )
                        ) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const id = e.dataTransfer.getData(
                          "application/x-storymaker-scene",
                        );
                        if (
                          id !== scene.id &&
                          scenes.some((s) => s.id === id)
                        ) {
                          const peers = scenes.filter(
                            (s) => s.columnId === scene.columnId && s.id !== id,
                          );
                          move(
                            id,
                            scene.columnId,
                            peers.findIndex((s) => s.id === scene.id),
                          );
                        }
                      }}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "application/x-storymaker-scene",
                          scene.id,
                        );
                        e.dataTransfer.effectAllowed = "move";
                      }}
                    >
                      <div className="plot-card-meta">
                        <span>{scene.status}</span>
                        <GripVertical size={16} aria-hidden="true" />
                      </div>
                      <h4>{scene.name || "名前未設定"}</h4>
                      <p>
                        {scene.summary ||
                          scene.purpose ||
                          "このシーンで起こることを書きましょう。"}
                      </p>
                      {scene.conflict && (
                        <div className="plot-card-conflict">
                          <Flag size={13} />
                          {scene.conflict}
                        </div>
                      )}
                      <div className="plot-card-context">
                        <span>視点：{name(scene.povId)}</span>
                        {scene.placeId && (
                          <span>舞台：{name(scene.placeId)}</span>
                        )}
                        <span>
                          時点：
                          {scene.timeText ||
                            (scene.year === undefined
                              ? "未定"
                              : `${scene.year}年`)}
                        </span>
                        <span>
                          {Array.from(
                            scene.manuscript || "",
                          ).length.toLocaleString()}
                          字 · {sceneCast(scene, data.entries).length}人
                        </span>
                      </div>
                      <div
                        className="plot-tension"
                        aria-label={`緊張度 ${scene.tension || 0}/5`}
                      >
                        {[1, 2, 3, 4, 5].map((n) => (
                          <i
                            key={n}
                            className={
                              n <= (scene.tension || 0) ? "filled" : ""
                            }
                          />
                        ))}
                      </div>
                      {controls(scene)}
                      <label className="plot-move-label">
                        章を移動
                        <select
                          aria-label={`${scene.name}の移動先の章`}
                          value={
                            columns.some((c) => c.id === scene.columnId)
                              ? scene.columnId
                              : ""
                          }
                          onChange={(e) =>
                            move(scene.id, e.target.value, scenes.length)
                          }
                        >
                          {chapters.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </article>
                  ))}
                  {!members.length && (
                    <p className="plot-empty-column">
                      シーンを追加するか、カードをここへ移動
                    </p>
                  )}
                  <button
                    className="button subtle full"
                    onClick={() => addScene(chapter.id)}
                    aria-label={`${chapter.name}にシーンを追加`}
                  >
                    <Plus size={16} />
                    シーンを追加
                  </button>
                </section>
              );
            })}
          </div>
        </div>
      )}
      {(view === "outline" || view === "manuscript") && (
        <div className="plot-reading">
          {chapters.map((chapter) => {
            const members = visible.filter(
              (s) =>
                s.columnId === chapter.id ||
                (!chapter.id && !columns.some((c) => c.id === s.columnId)),
            );
            return (
              <section className="panel" key={chapter.id}>
                <h3>{chapter.name}</h3>
                {members.map((scene) => (
                  <article key={scene.id}>
                    <small>
                      {scene.status} · 視点：{name(scene.povId)}
                    </small>
                    <h4>{scene.name}</h4>
                    <p>
                      {view === "manuscript"
                        ? scene.manuscript || "本文はまだありません。"
                        : scene.summary || "あらすじはまだありません。"}
                    </p>
                    {view === "outline" && scene.outcome && (
                      <p className="plot-reading-outcome">→ {scene.outcome}</p>
                    )}
                    {controls(scene)}
                  </article>
                ))}
                {!members.length && (
                  <p className="muted">シーンはまだありません。</p>
                )}
              </section>
            );
          })}
        </div>
      )}
      {view === "matrix" && (
        <section className="panel plot-cast-matrix">
          <h3>人物は、どの場面で動く？</h3>
          <p>
            交点を押すと登場・非登場を切り替えます。世界観の人物情報は変更しません。
          </p>
          {people.length && visible.length ? (
            <div className="plot-matrix-scroll">
              <table>
                <thead>
                  <tr>
                    <th>登場人物</th>
                    {visible.map((s) => (
                      <th key={s.id}>
                        <button
                          className="text-button"
                          onClick={() => setEditing(s.id)}
                        >
                          {s.name}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr key={p.id}>
                      <th>{p.name}</th>
                      {visible.map((s) => {
                        const active = sceneCast(s, data.entries).includes(
                          p.id,
                        );
                        return (
                          <td key={s.id}>
                            <button
                              className={`plot-cast-cell ${active ? "selected" : ""}`}
                              aria-label={`${s.name}に${p.name}が登場`}
                              aria-pressed={active}
                              onClick={() => castToggle(s, p.id)}
                            >
                              {active ? (
                                <Check size={18} />
                              ) : (
                                <Plus size={15} />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">人物とシーンを追加すると登場表を使えます。</p>
          )}
        </section>
      )}
      {view === "threads" && (
        <section className="panel plot-cast-matrix">
          <h3>伏線を置き、回収へつなぐ</h3>
          <p>
            この作品の各シーンで「提示・示唆・回収」を配置します。共有している世界観の真相や回収状態は変更しません。
          </p>
          <form
            className="plot-chapter-create"
            onSubmit={(e) => {
              e.preventDefault();
              if (!clueName.trim()) return;
              const entry = {
                ...newEntry(project.id, "clue"),
                name: clueName.trim(),
              };
              change((d) => ({ ...d, entries: [...d.entries, entry] }));
              setClueName("");
            }}
          >
            <label>
              追加する伏線名
              <input
                value={clueName}
                onChange={(e) => setClueName(e.target.value)}
              />
            </label>
            <button className="button subtle" type="submit">
              この作品の伏線を追加
            </button>
          </form>
          {clues.length && visible.length ? (
            <div className="plot-matrix-scroll">
              <table>
                <thead>
                  <tr>
                    <th>伏線・謎</th>
                    {visible.map((s) => (
                      <th key={s.id}>{s.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clues.map((clue) => (
                    <tr key={clue.id}>
                      <th>
                        {clue.name}
                        <small>{clue.fields.回収状況 || "状態未設定"}</small>
                      </th>
                      {visible.map((s) => (
                        <td key={s.id}>
                          <select
                            aria-label={`${s.name}の伏線「${clue.name}」の配置`}
                            value={s.clueBeats?.[clue.id] || ""}
                            onChange={(e) => {
                              const beats = { ...s.clueBeats };
                              if (e.target.value)
                                beats[clue.id] = e.target.value;
                              else delete beats[clue.id];
                              patch(s.id, {
                                clueBeats: beats,
                                links: e.target.value
                                  ? [...new Set([...s.links, clue.id])]
                                  : s.links.filter((id) => id !== clue.id),
                              });
                            }}
                          >
                            <option value="">配置なし</option>
                            {["提示", "示唆", "回収"].map((stage) => (
                              <option key={stage}>{stage}</option>
                            ))}
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="muted">
              伏線とシーンを追加すると配置を確認できます。
            </p>
          )}
        </section>
      )}
      {selected && (
        <Modal label="シーンのプロット" wide onClose={() => setEditing("")}>
          <div className="modal-heading">
            <div>
              <span className="eyebrow">SCENE DESIGN</span>
              <h2>場面を組み立てる</h2>
            </div>
            <button
              className="icon-button"
              aria-label="プロットの編集を閉じる"
              onClick={() => setEditing("")}
            >
              <X size={20} />
            </button>
          </div>
          <label>
            シーン名
            <input
              autoFocus
              value={selected.name}
              onChange={(e) => patch(selected.id, { name: e.target.value })}
            />
          </label>
          <label>
            このシーンのあらすじ
            <textarea
              rows={4}
              value={selected.summary}
              onChange={(e) => patch(selected.id, { summary: e.target.value })}
            />
          </label>
          <div className="plot-plan-grid">
            {(
              [
                ["purpose", "シーンの目的", "この場面は物語に何をもたらす？"],
                ["conflict", "対立・障害", "何が望みを阻む？"],
                ["outcome", "結果・変化", "場面の前後で何が変わる？"],
              ] as const
            ).map(([key, title, placeholder]) => (
              <label key={key}>
                {title}
                <textarea
                  rows={3}
                  value={selected[key] || ""}
                  placeholder={placeholder}
                  onChange={(e) =>
                    patch(selected.id, { [key]: e.target.value })
                  }
                />
              </label>
            ))}
            <label>
              視点人物
              <select
                aria-label="プロットの視点人物"
                value={selected.povId || ""}
                onChange={(e) => patch(selected.id, { povId: e.target.value })}
              >
                <option value="">未設定</option>
                {selected.povId &&
                  !people.some((p) => p.id === selected.povId) && (
                    <option value={selected.povId}>参照外の視点人物</option>
                  )}
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              緊張度
              <select
                aria-label="プロットの緊張度"
                value={selected.tension || 0}
                onChange={(e) =>
                  patch(selected.id, { tension: Number(e.target.value) })
                }
              >
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n ? `${n} / 5` : "未設定"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              進行状態
              <FreeTextInput
                label="プロットの進行状態"
                value={selected.status}
                onChange={(status) => patch(selected.id, { status })}
                suggestions={["構想中", "執筆中", "推敲中", "完成"]}
              />
            </label>
          </div>
          <details className="plot-blueprint">
            <summary>舞台・時間と制作メモ</summary>
            <div className="plot-plan-grid">
              <label>
                シーンの舞台
                <select
                  aria-label="プロットの舞台"
                  value={selected.placeId || ""}
                  onChange={(e) =>
                    patch(selected.id, { placeId: e.target.value })
                  }
                >
                  <option value="">未設定</option>
                  {selected.placeId &&
                    !entries.some((e) => e.id === selected.placeId) && (
                      <option value={selected.placeId}>参照外の舞台</option>
                    )}
                  {entries
                    .filter((e) => e.kind === "world")
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                世界の出来事
                <select
                  aria-label="プロットが参照する世界の出来事"
                  value={selected.eventId || ""}
                  onChange={(e) => {
                    const event = entries.find(
                        (item) => item.id === e.target.value,
                      ),
                      value = event?.fields.年代?.trim();
                    patch(selected.id, {
                      eventId: e.target.value,
                      ...(value && Number.isFinite(Number(value))
                        ? { year: Number(value) }
                        : {}),
                    });
                  }}
                >
                  <option value="">未設定</option>
                  {selected.eventId &&
                    !entries.some((e) => e.id === selected.eventId) && (
                      <option value={selected.eventId}>参照外の出来事</option>
                    )}
                  {entries
                    .filter((e) => e.kind === "event")
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                世界共通の年
                <input
                  type="number"
                  aria-label="プロットの共通年"
                  value={selected.year ?? ""}
                  onChange={(e) =>
                    patch(selected.id, {
                      year:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                細かな時点
                <input
                  aria-label="プロットの細かな時点"
                  value={selected.timeText || ""}
                  onChange={(e) =>
                    patch(selected.id, { timeText: e.target.value })
                  }
                  placeholder="翌朝、4月2日午前5時など"
                />
              </label>
              <label>
                制作メモ
                <textarea
                  rows={3}
                  value={selected.note}
                  onChange={(e) => patch(selected.id, { note: e.target.value })}
                />
              </label>
            </div>
          </details>
          <div className="modal-footer">
            <span className="muted small">変更は自動保存されます。</span>
            <button className="button subtle" onClick={() => setEditing("")}>
              ボードへ戻る
            </button>
            <button
              className="button primary"
              onClick={() => {
                setEditing("");
                onWrite(selected.id);
              }}
            >
              <FileText size={16} />
              このシーンの本文を書く
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

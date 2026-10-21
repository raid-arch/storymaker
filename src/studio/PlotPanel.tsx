import { useState } from "react";
import { ArrowDown, ArrowUp, GripVertical, Plus } from "lucide-react";
import Modal from "../Modal";
import FreeTextInput from "../FreeTextInput";
import { descendants } from "../model";
import { editStudio, putItem, sid, studioOf } from "./model";
import type { PlotColumn, Scene } from "./model";
import { moveScene } from "./plot";
import { LinkPicker, NumberField, SaveCancel } from "./ui";
import type { StudioProps } from "./ui";
export default function PlotPanel({
  data,
  projectId,
  focusId,
  change,
  confirm,
  notice,
}: StudioProps) {
  const s = studioOf(data);
  const [draft, setDraft] = useState<Scene | null>(
    s.scenes.find((scene) => scene.id === focusId) || null,
  );
  const [column, setColumn] = useState<PlotColumn | null>(null);
  const stored = s.columns
    .filter((item) => item.projectId === projectId)
    .slice()
    .sort((a, b) => a.order - b.order);
  const columns = [
    { id: "", projectId, name: "未分類", chapterId: "", order: -1 },
    ...stored,
  ];
  const scenes = s.scenes.filter((item) => item.projectId === projectId);
  const projectIds = descendants(data, projectId);
  const begin = (columnId = "") =>
    setDraft({
      id: sid(),
      projectId,
      columnId,
      name: "",
      summary: "",
      note: "",
      status: "構想中",
      order:
        Math.max(
          -1,
          ...scenes
            .filter((scene) => scene.columnId === columnId)
            .map((scene) => scene.order),
        ) + 1,
      links: [],
    });
  const move = (item: Scene, to: string, index: number) =>
    change((d) =>
      editStudio(d, (s) => ({
        ...s,
        scenes: moveScene(s.scenes, item.id, to, index),
      })),
    );
  return (
    <section className="studio-section">
      <h2>章・シーンのプロットボード</h2>
      <p className="muted">
        章・列ごとにシーンを組み立てます。矢印と移動先で順序を変えられ、PCではカードの持ち手をドラッグできます。既存の作品・章にも関連付けられます。
      </p>
      <div className="studio-actions">
        <button
          className="button primary"
          disabled={!projectId}
          onClick={() =>
            setColumn({
              id: sid(),
              projectId,
              name: "",
              chapterId: "",
              order: Math.max(-1, ...stored.map((item) => item.order)) + 1,
            })
          }
        >
          章・列を追加
        </button>
        <button
          className="button subtle"
          disabled={!projectId}
          onClick={() => begin()}
        >
          シーンを追加
        </button>
      </div>
      <div className="plot-board" aria-label="プロットボード">
        {columns.map((col, columnIndex) => {
          const members = scenes
            .filter(
              (scene) =>
                scene.columnId === col.id ||
                (!col.id && !stored.some((item) => item.id === scene.columnId)),
            )
            .slice()
            .sort((a, b) => a.order - b.order);
          return (
            <section
              className="panel plot-column"
              key={col.id || "unassigned"}
              onDragOver={(event) => {
                if (
                  event.dataTransfer.types.includes("application/x-story-scene")
                )
                  event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData(
                  "application/x-story-scene",
                );
                const item = scenes.find((scene) => scene.id === id);
                if (item) move(item, col.id, members.length);
              }}
            >
              <header>
                <h3>
                  {col.name}
                  <small>{members.length}</small>
                </h3>
                {col.id && (
                  <button
                    className="text-button"
                    aria-label={`${col.name}の列を編集`}
                    onClick={() => setColumn({ ...col })}
                  >
                    編集
                  </button>
                )}
              </header>
              {col.chapterId && (
                <p className="muted small">
                  関連する章：
                  {data.projects.find((p) => p.id === col.chapterId)?.name ||
                    "削除済み"}
                </p>
              )}
              {col.id && (
                <div className="studio-actions">
                  <button
                    className="icon-button"
                    aria-label={`${col.name}の列を左へ`}
                    disabled={columnIndex <= 1}
                    onClick={() =>
                      change((d) =>
                        editStudio(d, (s) => ({
                          ...s,
                          columns: s.columns.map((item) =>
                            item.id === col.id
                              ? {
                                  ...item,
                                  order: stored[columnIndex - 2].order,
                                }
                              : item.id === stored[columnIndex - 2].id
                                ? { ...item, order: col.order }
                                : item,
                          ),
                        })),
                      )
                    }
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`${col.name}の列を右へ`}
                    disabled={columnIndex >= columns.length - 1}
                    onClick={() =>
                      change((d) =>
                        editStudio(d, (s) => ({
                          ...s,
                          columns: s.columns.map((item) =>
                            item.id === col.id
                              ? { ...item, order: stored[columnIndex].order }
                              : item.id === stored[columnIndex].id
                                ? { ...item, order: col.order }
                                : item,
                          ),
                        })),
                      )
                    }
                  >
                    <ArrowDown size={15} />
                  </button>
                </div>
              )}
              {members.map((item, index) => (
                <article
                  className={`plot-scene ${item.id === focusId ? "selected" : ""}`}
                  key={item.id}
                >
                  <div className="plot-scene-heading">
                    <button
                      className="icon-button plot-drag"
                      draggable
                      aria-label={`${item.name}をドラッグして移動`}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(
                          "application/x-story-scene",
                          item.id,
                        );
                        event.dataTransfer.effectAllowed = "move";
                      }}
                    >
                      <GripVertical size={18} />
                    </button>
                    <strong>{item.name || "名前未設定"}</strong>
                  </div>
                  <span className="studio-step">{item.status || "未設定"}</span>
                  {item.year !== undefined && <small>{item.year} 年</small>}
                  <p className="studio-card-summary">{item.summary}</p>
                  <div className="studio-actions">
                    <button
                      className="icon-button"
                      aria-label={`${item.name}を上へ`}
                      disabled={index === 0}
                      onClick={() => move(item, col.id, index - 1)}
                    >
                      <ArrowUp size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`${item.name}を下へ`}
                      disabled={index === members.length - 1}
                      onClick={() => move(item, col.id, index + 1)}
                    >
                      <ArrowDown size={17} />
                    </button>
                    <button
                      className="text-button"
                      onClick={() => setDraft(structuredClone(item))}
                    >
                      シーンを編集
                    </button>
                  </div>
                  <label>
                    移動先
                    <select
                      aria-label={`${item.name}の移動先`}
                      value={col.id}
                      onChange={(event) =>
                        move(
                          item,
                          event.target.value,
                          scenes.filter(
                            (scene) => scene.columnId === event.target.value,
                          ).length,
                        )
                      }
                    >
                      {columns.map((target) => (
                        <option key={target.id} value={target.id}>
                          {target.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </article>
              ))}
              <button
                className="button subtle full"
                onClick={() => begin(col.id)}
              >
                <Plus size={15} />
                この列にシーンを追加
              </button>
            </section>
          );
        })}
      </div>
      {column && (
        <Modal label="章・列を編集" onClose={() => setColumn(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!column.name.trim()) return;
              change((d) =>
                editStudio(d, (s) => ({
                  ...s,
                  columns: putItem(s.columns, {
                    ...column,
                    name: column.name.trim(),
                  }),
                })),
              );
              setColumn(null);
            }}
          >
            <h2>章・列を編集</h2>
            <label>
              章・列の名前
              <input
                required
                value={column.name}
                onChange={(event) =>
                  setColumn({ ...column, name: event.target.value })
                }
              />
            </label>
            <label>
              既存の作品・章と関連付ける
              <select
                value={column.chapterId}
                onChange={(event) =>
                  setColumn({ ...column, chapterId: event.target.value })
                }
              >
                <option value="">未指定</option>
                {data.projects
                  .filter((p) => projectIds.has(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <SaveCancel onCancel={() => setColumn(null)} />
            {s.columns.some((item) => item.id === column.id) && (
              <button
                type="button"
                className="button danger-outline full space-top"
                onClick={() =>
                  confirm({
                    title: "この章・列を削除しますか？",
                    message: "含まれるシーンは削除せず、未分類へ移します。",
                    action: () => {
                      change((d) =>
                        editStudio(d, (s) => ({
                          ...s,
                          columns: s.columns.filter(
                            (item) => item.id !== column.id,
                          ),
                          scenes: s.scenes.map((item) =>
                            item.columnId === column.id
                              ? { ...item, columnId: "" }
                              : item,
                          ),
                        })),
                      );
                      setColumn(null);
                    },
                  })
                }
              >
                章・列を削除
              </button>
            )}
          </form>
        </Modal>
      )}
      {draft && (
        <Modal wide label="シーンを編集" onClose={() => setDraft(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.name.trim()) return;
              change((d) =>
                editStudio(d, (s) => {
                  const previous = s.scenes.find(
                    (item) => item.id === draft.id,
                  );
                  let scenes = putItem(s.scenes, {
                    ...draft,
                    name: draft.name.trim(),
                  });
                  if (previous && previous.columnId !== draft.columnId)
                    scenes = moveScene(
                      scenes,
                      draft.id,
                      draft.columnId,
                      scenes.length,
                    );
                  return { ...s, scenes };
                }),
              );
              setDraft(null);
              notice("シーンを保存しました。");
            }}
          >
            <h2>シーンを編集</h2>
            <label>
              シーン名
              <input
                required
                autoFocus
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </label>
            <label>
              章・列
              <select
                aria-label="シーンの章・列"
                value={draft.columnId}
                onChange={(event) =>
                  setDraft({ ...draft, columnId: event.target.value })
                }
              >
                {columns.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              進行状態
              <FreeTextInput
                label="シーンの進行状態"
                value={draft.status}
                onChange={(status) => setDraft({ ...draft, status })}
                suggestions={[
                  "未着手",
                  "構想中",
                  "執筆中",
                  "完了",
                  ...scenes.map((scene) => scene.status),
                ]}
              />
            </label>
            <label>
              シーンの概要
              <textarea
                aria-label="シーンの概要"
                rows={5}
                value={draft.summary}
                onChange={(event) =>
                  setDraft({ ...draft, summary: event.target.value })
                }
              />
            </label>
            <NumberField
              label="シーンの年（任意）"
              value={draft.year}
              onChange={(year) => setDraft({ ...draft, year })}
            />
            <label>
              作者のメモ
              <textarea
                aria-label="シーンの作者メモ"
                rows={4}
                value={draft.note}
                onChange={(event) =>
                  setDraft({ ...draft, note: event.target.value })
                }
              />
            </label>
            <LinkPicker
              data={data}
              value={draft.links}
              onChange={(links) => setDraft({ ...draft, links })}
            />
            <SaveCancel onCancel={() => setDraft(null)} />
            {s.scenes.some((item) => item.id === draft.id) && (
              <button
                type="button"
                className="button danger-outline full space-top"
                onClick={() =>
                  confirm({
                    title: "このシーンを削除しますか？",
                    message:
                      "人物や世界観の設定は残ります。認識の取得シーンへの参照は解除します。",
                    action: () => {
                      change((d) =>
                        editStudio(d, (s) => ({
                          ...s,
                          scenes: s.scenes.filter(
                            (item) => item.id !== draft.id,
                          ),
                          knowledge: s.knowledge.map((item) =>
                            item.sceneId === draft.id
                              ? { ...item, sceneId: "" }
                              : item,
                          ),
                          publications: s.publications.filter(
                            (item) =>
                              item.target !== "scene" ||
                              item.targetId !== draft.id,
                          ),
                        })),
                      );
                      setDraft(null);
                    },
                  })
                }
              >
                シーンを削除
              </button>
            )}
          </form>
        </Modal>
      )}
    </section>
  );
}

import { sharedProjectIds } from "../model";
import { useState } from "react";
import Modal from "../Modal";
import { ImageInput } from "../Editors";
import {
  attachImage,
  editStudio,
  imageOf,
  putItem,
  sid,
  studioOf,
} from "./model";
import type { Era, Variant } from "./model";
import { variantBounds } from "./time";
import {
  Empty,
  EntrySelect,
  LinkPicker,
  NumberField,
  PairsEditor,
  SaveCancel,
} from "./ui";
import type { StudioProps } from "./ui";
export default function ErasPanel({
  data,
  projectId,
  change,
  focusId,
  onOpen,
  onTimeChange,
  confirm,
  notice,
}: StudioProps) {
  const s = studioOf(data);
  const eras = s.eras.filter((era) =>
    sharedProjectIds(data, projectId).has(era.projectId),
  );
  const variants = s.variants.filter((item) =>
    sharedProjectIds(data, projectId).has(item.projectId),
  );
  const [era, setEra] = useState<Era | null>(
    s.eras.find((item) => item.id === focusId) || null,
  );
  const [draft, setDraft] = useState<Variant | null>(() => {
    const item = s.variants.find((row) => row.id === focusId);
    return item
      ? {
          ...structuredClone(item),
          snapshot: {
            ...structuredClone(item.snapshot),
            image: imageOf(data, item.imageId),
          },
        }
      : null;
  });
  const [newTarget, setNewTarget] = useState(
    data.entries.some((item) => item.id === focusId) ? focusId! : "",
  );
  const local = {
    ...data,
    entries: data.entries.filter((entry) =>
      sharedProjectIds(data, projectId).has(entry.projectId),
    ),
  };
  return (
    <section className="studio-section">
      <h2>時代別の設定</h2>
      <p className="muted">
        現在の設定を残したまま、過去や未来の別の姿を保存します。上部の時点切り替えから、時代の設定を閲覧できます。期間が重なる場合は、更新日時が新しい案を表示します。時代別の案を登録していない設定は、現在の内容を基準として表示します。
      </p>
      <div className="studio-actions">
        <button
          className="button primary"
          disabled={!projectId}
          onClick={() =>
            setEra({ id: sid(), projectId, name: "", description: "" })
          }
        >
          時代を追加
        </button>
      </div>
      <div className="studio-card-grid">
        {eras.map((item) => (
          <article className="panel studio-form" key={item.id}>
            <h3>{item.name}</h3>
            <p className="muted small">
              {item.from ?? "未確定"} ～ {item.to ?? "未確定"} 年
            </p>
            <p className="studio-prose">{item.description}</p>
            <div className="studio-actions">
              <button
                className="button subtle"
                onClick={() =>
                  onTimeChange?.({ eraId: item.id, year: item.from ?? item.to })
                }
              >
                この時代を表示
              </button>
              <button
                className="text-button"
                onClick={() => setEra({ ...item })}
              >
                時代を編集
              </button>
              <button
                className="button danger-outline"
                onClick={() =>
                  confirm({
                    title: "時代名を削除しますか？",
                    message:
                      "保存した時代別の案は、期間を引き継いで残します。現在の設定は変更しません。",
                    action: () =>
                      change((d) =>
                        editStudio(d, (s) => ({
                          ...s,
                          eras: s.eras.filter((row) => row.id !== item.id),
                          variants: s.variants.map((row) =>
                            row.eraId === item.id
                              ? {
                                  ...row,
                                  ...variantBounds(row, s.eras),
                                  eraId: "",
                                }
                              : row,
                          ),
                        })),
                      ),
                  })
                }
              >
                時代を削除
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className="panel studio-form">
        <EntrySelect
          data={local}
          label="時代別の案を作る設定"
          value={newTarget}
          onChange={setNewTarget}
        />
        <button
          className="button primary"
          disabled={!newTarget}
          onClick={() => {
            const entry = data.entries.find((e) => e.id === newTarget);
            if (entry)
              setDraft({
                id: sid(),
                projectId,
                entryId: entry.id,
                eraId: "",
                snapshot: structuredClone(entry),
                imageId: "",
              });
          }}
        >
          時代別の案を作る
        </button>
      </div>
      {!variants.length ? (
        <Empty>時代別の案はまだありません。</Empty>
      ) : (
        <div className="studio-list">
          {variants.map((item) => (
            <article className="panel studio-form" key={item.id}>
              <div className="section-heading">
                <h3>{item.snapshot.name || "名前未設定"}</h3>
                <span className="studio-step">
                  {eras.find((era) => era.id === item.eraId)?.name ||
                    "期間で指定"}
                </span>
              </div>
              <p className="muted small">
                {variantBounds(item, s.eras).from ?? "未確定"} ～{" "}
                {variantBounds(item, s.eras).to ?? "未確定"} 年
              </p>
              <p className="studio-prose">{item.snapshot.body}</p>
              <div className="studio-actions">
                <button
                  className="button subtle"
                  onClick={() =>
                    setDraft({
                      ...structuredClone(item),
                      snapshot: {
                        ...structuredClone(item.snapshot),
                        image: imageOf(data, item.imageId),
                      },
                    })
                  }
                >
                  時代別の案を編集
                </button>
                <button
                  className="text-button"
                  onClick={() => onOpen(item.entryId)}
                >
                  現在の設定を開く
                </button>
                <button
                  className="button danger-outline"
                  onClick={() =>
                    confirm({
                      title: "この時代別の案を削除しますか？",
                      message: "現在の設定と、ほかの時代の案は残ります。",
                      action: () =>
                        change((d) =>
                          editStudio(d, (s) => ({
                            ...s,
                            variants: s.variants.filter(
                              (row) => row.id !== item.id,
                            ),
                          })),
                        ),
                    })
                  }
                >
                  時代別の案を削除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {era && (
        <Modal label="時代を編集" onClose={() => setEra(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (
                !era.name.trim() ||
                (era.from !== undefined &&
                  era.to !== undefined &&
                  era.from > era.to)
              ) {
                notice("時代名と期間の前後を確認してください。");
                return;
              }
              change((d) =>
                editStudio(d, (s) => ({
                  ...s,
                  eras: putItem(s.eras, { ...era, name: era.name.trim() }),
                })),
              );
              setEra(null);
            }}
          >
            <h2>時代を編集</h2>
            <label>
              時代名
              <input
                required
                value={era.name}
                onChange={(event) =>
                  setEra({ ...era, name: event.target.value })
                }
              />
            </label>
            <div className="form-row">
              <NumberField
                label="時代の開始年"
                value={era.from}
                onChange={(from) => setEra({ ...era, from })}
              />
              <NumberField
                label="時代の終了年"
                value={era.to}
                onChange={(to) => setEra({ ...era, to })}
              />
            </div>
            <label>
              時代の説明
              <textarea
                value={era.description}
                onChange={(event) =>
                  setEra({ ...era, description: event.target.value })
                }
              />
            </label>
            <SaveCancel onCancel={() => setEra(null)} />
          </form>
        </Modal>
      )}
      {draft && (
        <Modal wide label="時代別の案を編集" onClose={() => setDraft(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const bounds = variantBounds(draft, s.eras);
              if (
                (!draft.eraId &&
                  bounds.from === undefined &&
                  bounds.to === undefined) ||
                (bounds.from !== undefined &&
                  bounds.to !== undefined &&
                  bounds.from > bounds.to)
              ) {
                notice(
                  "時代または有効期間を指定し、開始・終了の前後を確認してください。",
                );
                return;
              }
              change((d) =>
                editStudio(d, (s) => {
                  const attached = attachImage(s, draft.snapshot.image);
                  return {
                    ...attached.studio,
                    variants: putItem(s.variants, {
                      ...draft,
                      snapshot: {
                        ...draft.snapshot,
                        image: "",
                        updatedAt: new Date().toISOString(),
                      },
                      imageId: attached.imageId,
                    }),
                  };
                }),
              );
              setDraft(null);
              notice("時代別の案を保存しました。現在の設定はそのままです。");
            }}
          >
            <h2>時代別の案を編集</h2>
            <label>
              対象の時代
              <select
                aria-label="対象の時代"
                value={draft.eraId}
                onChange={(event) =>
                  setDraft({ ...draft, eraId: event.target.value })
                }
              >
                <option value="">有効期間を直接指定</option>
                {eras.map((era) => (
                  <option key={era.id} value={era.id}>
                    {era.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <NumberField
                label="案の開始年（時代の期間より優先）"
                value={draft.from}
                onChange={(from) => setDraft({ ...draft, from })}
              />
              <NumberField
                label="案の終了年（時代の期間より優先）"
                value={draft.to}
                onChange={(to) => setDraft({ ...draft, to })}
              />
            </div>
            <ImageInput
              value={draft.snapshot.image}
              onChange={(image) =>
                setDraft({ ...draft, snapshot: { ...draft.snapshot, image } })
              }
              onError={notice}
            />
            <label>
              時代別の名前
              <input
                value={draft.snapshot.name}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    snapshot: { ...draft.snapshot, name: event.target.value },
                  })
                }
              />
            </label>
            <label>
              時代別のひとこと
              <input
                value={draft.snapshot.subtitle}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    snapshot: {
                      ...draft.snapshot,
                      subtitle: event.target.value,
                    },
                  })
                }
              />
            </label>
            <label>
              時代別の設定・メモ
              <textarea
                aria-label="時代別の設定・メモ"
                rows={5}
                value={draft.snapshot.body}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    snapshot: { ...draft.snapshot, body: event.target.value },
                  })
                }
              />
            </label>
            {Object.entries(draft.snapshot.fields).map(([key, value]) => (
              <label key={key}>
                {key}
                <input
                  aria-label={`時代別：${key}`}
                  value={value}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      snapshot: {
                        ...draft.snapshot,
                        fields: {
                          ...draft.snapshot.fields,
                          [key]: event.target.value,
                        },
                      },
                    })
                  }
                />
              </label>
            ))}
            <PairsEditor
              label="時代別の自由項目"
              value={draft.snapshot.custom}
              onChange={(custom) =>
                setDraft({ ...draft, snapshot: { ...draft.snapshot, custom } })
              }
            />
            <label>
              時代別の通説
              <textarea
                aria-label="時代別の通説"
                value={draft.snapshot.lore}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    snapshot: { ...draft.snapshot, lore: event.target.value },
                  })
                }
              />
            </label>
            <label>
              時代別の真相
              <textarea
                aria-label="時代別の真相"
                value={draft.snapshot.truth}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    snapshot: { ...draft.snapshot, truth: event.target.value },
                  })
                }
              />
            </label>
            <LinkPicker
              data={data}
              value={draft.snapshot.links}
              onChange={(links) =>
                setDraft({ ...draft, snapshot: { ...draft.snapshot, links } })
              }
            />
            <SaveCancel
              onCancel={() => setDraft(null)}
              label="時代別の案を保存"
            />
          </form>
        </Modal>
      )}
    </section>
  );
}

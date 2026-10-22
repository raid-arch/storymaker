import { sharedProjectIds } from "../model";
import { useState } from "react";
import Modal from "../Modal";
import { TagsInput } from "../Editors";
import { kindLabels, newEntry } from "../model";
import type { Entry, Kind } from "../model";
import { editStudio, putItem, studioOf } from "./model";
import type { Template } from "./model";
import {
  applyTemplate,
  entryFromTemplate,
  templateFromEntry,
} from "./templates";
import { Empty, EntrySelect, PairsEditor, SaveCancel } from "./ui";
import type { StudioProps } from "./ui";
export default function TemplatesPanel({
  data,
  projectId,
  focusId,
  change,
  notice,
  confirm,
  onOpen,
}: StudioProps) {
  const s = studioOf(data),
    [draft, setDraft] = useState<Template | null>(
      s.templates.find((item) => item.id === focusId) || null,
    ),
    [source, setSource] = useState(
      data.entries.some((e) => e.id === focusId) ? focusId! : "",
    ),
    [values, setValues] = useState(false),
    [applying, setApplying] = useState<Template | null>(null),
    [target, setTarget] = useState(""),
    [name, setName] = useState("");
  const items = s.templates.filter(
    (item) =>
      !item.projectId || sharedProjectIds(data, projectId).has(item.projectId),
  );
  const newTemplate = () =>
    setDraft({
      ...templateFromEntry(newEntry(projectId, "character")),
      name: "",
    });
  return (
    <section className="studio-section">
      <h2>設定テンプレート</h2>
      <p className="muted">
        作品やジャンルに合わせて項目を統一します。既存の設定に適用した場合は、記入済みの内容を残して不足する項目を追加します。
      </p>
      <div className="studio-actions">
        <button className="button primary" onClick={newTemplate}>
          テンプレートを作成
        </button>
      </div>
      <div className="panel studio-form">
        <h3>既存の設定から項目を取り込む</h3>
        <EntrySelect
          data={data}
          value={source}
          onChange={setSource}
          label="テンプレートの元になる設定"
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={values}
            onChange={(e) => setValues(e.target.checked)}
          />
          内容も初期値としてコピーする
        </label>
        <p className="muted small">
          通常は項目名だけを取り込みます。内容をコピーすると、真相などの非公開情報もテンプレート内に保存されます。
        </p>
        <button
          className="button subtle"
          disabled={!source}
          onClick={() => {
            const entry = data.entries.find((e) => e.id === source);
            if (entry) setDraft(templateFromEntry(entry, values));
          }}
        >
          項目を取り込む
        </button>
      </div>
      {!items.length ? (
        <Empty>
          テンプレートはまだありません。自由項目を追加して再利用できます。
        </Empty>
      ) : (
        <div className="studio-card-grid">
          {items.map((item) => (
            <article className="panel studio-form" key={item.id}>
              <span className="eyebrow">
                {kindLabels[item.kind]} ·{" "}
                {item.projectId ? "この作品" : "すべての作品"}
              </span>
              <h3>{item.name}</h3>
              <p className="muted small">
                {[
                  ...Object.keys(item.fields),
                  ...item.custom.map((f) => f.name),
                ].join("、") || "自由に項目を追加できます"}
              </p>
              <div className="studio-actions">
                <button
                  className="button primary"
                  disabled={!projectId}
                  onClick={() => {
                    setApplying(item);
                    setTarget("");
                    setName("");
                  }}
                >
                  この項目を使う
                </button>
                <button
                  className="button subtle"
                  onClick={() => setDraft(structuredClone(item))}
                >
                  編集
                </button>
                <button
                  className="button danger-outline"
                  aria-label={`${item.name}を削除`}
                  onClick={() =>
                    confirm({
                      title: "テンプレートを削除しますか？",
                      message: "適用済みの設定は残ります。",
                      action: () =>
                        change((d) =>
                          editStudio(d, (s) => ({
                            ...s,
                            templates: s.templates.filter(
                              (row) => row.id !== item.id,
                            ),
                          })),
                        ),
                    })
                  }
                >
                  削除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {draft && (
        <Modal
          wide
          label="設定テンプレートを編集"
          onClose={() => setDraft(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.name.trim()) return;
              change((d) =>
                editStudio(d, (s) => ({
                  ...s,
                  templates: putItem(s.templates, {
                    ...draft,
                    name: draft.name.trim(),
                    custom: draft.custom.filter((f) => f.name.trim()),
                  }),
                })),
              );
              setDraft(null);
              notice("テンプレートを保存しました。");
            }}
          >
            <h2>設定テンプレートを編集</h2>
            <label>
              テンプレート名
              <input
                required
                autoFocus
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label>
              設定の種類
              <select
                value={draft.kind}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    kind: e.target.value as Kind,
                    fields: {},
                    custom: [
                      ...draft.custom,
                      ...Object.entries(draft.fields).map(([name, value]) => ({
                        name,
                        value,
                      })),
                    ],
                  })
                }
              >
                {Object.entries(kindLabels).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!draft.projectId}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    projectId: e.target.checked ? "" : projectId,
                  })
                }
                disabled={!projectId}
              />
              すべての作品で再利用する
            </label>
            <label>
              カテゴリの初期値
              <input
                value={draft.category}
                onChange={(e) =>
                  setDraft({ ...draft, category: e.target.value })
                }
              />
            </label>
            {Object.entries(draft.fields).map(([key, value]) => (
              <label key={key}>
                {key}の初期値
                <textarea
                  rows={2}
                  value={value}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      fields: { ...draft.fields, [key]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
            <PairsEditor
              value={draft.custom}
              onChange={(custom) => setDraft({ ...draft, custom })}
            />
            {(
              [
                ["body", "設定・メモ"],
                ["lore", "作中での通説"],
                ["truth", "実際の真相"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}の初期値
                <textarea
                  rows={4}
                  value={draft[key]}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                />
              </label>
            ))}
            <label>
              状態の初期値
              <input
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value })}
              />
            </label>
            <label>
              タグの初期値
              <TagsInput
                value={draft.tags}
                onChange={(tags) => setDraft({ ...draft, tags })}
              />
            </label>
            <SaveCancel onCancel={() => setDraft(null)} />
          </form>
        </Modal>
      )}
      {applying && (
        <Modal label="テンプレートを適用" onClose={() => setApplying(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              let entry: Entry;
              try {
                const existing = data.entries.find((e) => e.id === target);
                entry = existing
                  ? applyTemplate(existing, applying)
                  : entryFromTemplate(projectId, applying, name.trim());
                if (!existing && !entry.name) return;
                change((d) => ({
                  ...d,
                  entries: existing
                    ? d.entries.map((e) => (e.id === entry.id ? entry : e))
                    : [...d.entries, entry],
                }));
                setApplying(null);
                onOpen(entry.id);
                notice(
                  existing
                    ? "記入済みの内容を残して項目を追加しました。"
                    : "テンプレートから設定を作成しました。",
                );
              } catch (error) {
                notice(
                  error instanceof Error
                    ? error.message
                    : "適用できませんでした。",
                );
              }
            }}
          >
            <h2>「{applying.name}」を使う</h2>
            <EntrySelect
              data={{
                ...data,
                entries: data.entries.filter((e) =>
                  sharedProjectIds(data, projectId).has(e.projectId),
                ),
              }}
              kind={applying.kind}
              value={target}
              onChange={setTarget}
              label="適用先（未指定なら新規作成）"
            />
            {!target && (
              <label>
                新しい設定の名前
                <input
                  required
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <p className="muted small">
              記入済みの値と関連リンクは保持します。空欄に初期値を入れ、足りない自由項目を追加します。
            </p>
            <SaveCancel
              label="適用して開く"
              onCancel={() => setApplying(null)}
            />
          </form>
        </Modal>
      )}
    </section>
  );
}

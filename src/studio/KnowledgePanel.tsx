import { sharedProjectIds } from "../model";
import { useEffect, useState } from "react";
import Modal from "../Modal";
import FreeTextInput from "../FreeTextInput";
import { editStudio, putItem, sid, studioOf } from "./model";
import type { Knowledge } from "./model";
import { knowledgeAt, knowledgeYear } from "./time";
import { Empty, EntrySelect, NumberField, SaveCancel } from "./ui";
import type { StudioProps } from "./ui";
export default function KnowledgePanel({
  data,
  projectId,
  change,
  focusId,
  selection,
  onOpen,
  confirm,
  notice,
}: StudioProps) {
  const s = studioOf(data);
  const local = {
    ...data,
    entries: data.entries.filter((e) =>
      sharedProjectIds(data, projectId).has(e.projectId),
    ),
  };
  const [person, setPerson] = useState(
    data.entries.some((e) => e.id === focusId && e.kind === "character")
      ? focusId!
      : "",
  );
  const [year, setYear] = useState<number | undefined>(selection?.year);
  const [draft, setDraft] = useState<Knowledge | null>(
    s.knowledge.find((item) => item.id === focusId) || null,
  );
  useEffect(() => setYear(selection?.year), [selection?.year]);
  const at = year === undefined ? null : knowledgeAt(data, year);
  const filter = (item: Knowledge) =>
    sharedProjectIds(data, projectId).has(item.projectId) &&
    (!person || item.characterId === person);
  const items = (at?.known || s.knowledge)
    .filter(filter)
    .slice()
    .sort(
      (a, b) =>
        (knowledgeYear(data, a) ?? Infinity) -
        (knowledgeYear(data, b) ?? Infinity),
    );
  const undated = at?.undated.filter(filter) || [];
  const render = (item: Knowledge) => {
    const character = data.entries.find((e) => e.id === item.characterId),
      target = data.entries.find((e) => e.id === item.entryId);
    const date = knowledgeYear(data, item);
    return (
      <article className="panel studio-form" key={item.id}>
        <div className="section-heading">
          <h3>
            {character?.name || "人物未指定"} →{" "}
            {target?.name || "対象が削除されています"}
          </h3>
          <span className="studio-step">{item.state || "未設定"}</span>
        </div>
        <p className="muted small">
          取得時点：{date === undefined ? "未確定" : `${date} 年`}
          {item.eventId &&
            ` · ${data.entries.find((e) => e.id === item.eventId)?.name || "事件未確定"}`}
          {item.sceneId &&
            ` · ${s.scenes.find((scene) => scene.id === item.sceneId)?.name || "シーン未確定"}`}
        </p>
        <h4>本人の認識</h4>
        <pre className="studio-prose">{item.belief || "未記入"}</pre>
        {item.source && <p>情報源：{item.source}</p>}
        {item.note && <p className="studio-prose">{item.note}</p>}
        <details>
          <summary>対象の実際の真相を確認</summary>
          <pre className="studio-prose">
            {target?.truth || "真相は未記入です。"}
          </pre>
        </details>
        <div className="studio-actions">
          <button
            className="button subtle"
            onClick={() => setDraft(structuredClone(item))}
          >
            認識を編集
          </button>
          {character && (
            <button
              className="text-button"
              onClick={() => onOpen(character.id)}
            >
              人物を開く
            </button>
          )}
          {target && (
            <button className="text-button" onClick={() => onOpen(target.id)}>
              対象を開く
            </button>
          )}
          <button
            className="button danger-outline"
            onClick={() =>
              confirm({
                title: "この認識の記録を削除しますか？",
                message: "人物や対象の設定は残ります。",
                action: () =>
                  change((d) =>
                    editStudio(d, (s) => ({
                      ...s,
                      knowledge: s.knowledge.filter(
                        (row) => row.id !== item.id,
                      ),
                    })),
                  ),
              })
            }
          >
            認識を削除
          </button>
        </div>
      </article>
    );
  };
  return (
    <section className="studio-section">
      <h2>人物ごとの認識・秘密・誤解</h2>
      <p className="muted">
        同じ事実に対する認識を、人物別・取得時点別に記録します。指定した年では、その年までの最新の記録を表示します。時点未確定の情報から既知とは推測しません。
      </p>
      <div className="panel studio-form">
        <div className="form-row">
          <EntrySelect
            data={local}
            kind="character"
            label="認識を見る人物"
            value={person}
            onChange={setPerson}
          />
          <NumberField
            label="認識を確認する年"
            value={year}
            onChange={setYear}
          />
        </div>
        <button
          className="button primary"
          disabled={!projectId}
          onClick={() =>
            setDraft({
              id: sid(),
              projectId,
              characterId: person,
              entryId: data.entries.some(
                (e) => e.id === focusId && e.kind !== "character",
              )
                ? focusId!
                : "",
              state: "知っている",
              belief: "",
              source: "",
              note: "",
              eventId: "",
              sceneId: "",
            })
          }
        >
          認識を記録
        </button>
      </div>
      {items.length ? (
        items.map(render)
      ) : (
        <Empty>この条件に合う認識はまだ記録されていません。</Empty>
      )}
      {undated.length > 0 && (
        <>
          <h3>取得時点が未確定の記録</h3>
          {undated.map(render)}
        </>
      )}
      {draft && (
        <Modal wide label="人物の認識を編集" onClose={() => setDraft(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.characterId || !draft.entryId) return;
              change((d) =>
                editStudio(d, (s) => ({
                  ...s,
                  knowledge: putItem(s.knowledge, draft),
                })),
              );
              setDraft(null);
              notice("人物の認識を保存しました。");
            }}
          >
            <h2>人物の認識を編集</h2>
            <EntrySelect
              data={local}
              kind="character"
              label="認識する人物"
              value={draft.characterId}
              onChange={(id) => setDraft({ ...draft, characterId: id })}
              required
            />
            <EntrySelect
              data={data}
              label="秘密・認識の対象"
              value={draft.entryId}
              onChange={(id) => setDraft({ ...draft, entryId: id })}
              required
            />
            <label>
              認識の状態
              <FreeTextInput
                label="認識の状態"
                value={draft.state}
                onChange={(state) => setDraft({ ...draft, state })}
                suggestions={[
                  "知っている",
                  "誤解している",
                  "知らない",
                  "疑っている",
                  ...s.knowledge.map((item) => item.state),
                ]}
              />
            </label>
            <label>
              本人が信じていること
              <textarea
                aria-label="本人が信じていること"
                rows={5}
                value={draft.belief}
                onChange={(event) =>
                  setDraft({ ...draft, belief: event.target.value })
                }
              />
            </label>
            <NumberField
              label="情報を得た年（未確定は空欄）"
              value={draft.year}
              onChange={(year) => setDraft({ ...draft, year })}
            />
            <EntrySelect
              data={data}
              kind="event"
              label="情報を得た事件"
              value={draft.eventId}
              onChange={(eventId) => setDraft({ ...draft, eventId })}
            />
            <label>
              情報を得たシーン
              <select
                value={draft.sceneId}
                onChange={(event) =>
                  setDraft({ ...draft, sceneId: event.target.value })
                }
              >
                <option value="">未指定</option>
                {s.scenes.map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    {scene.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted small">
              年を空欄にした場合は、指定した事件・シーンの年を取得時点に使います。
            </p>
            <label>
              情報源
              <input
                value={draft.source}
                onChange={(event) =>
                  setDraft({ ...draft, source: event.target.value })
                }
              />
            </label>
            <label>
              作者のメモ
              <textarea
                rows={3}
                value={draft.note}
                onChange={(event) =>
                  setDraft({ ...draft, note: event.target.value })
                }
              />
            </label>
            <SaveCancel onCancel={() => setDraft(null)} />
          </form>
        </Modal>
      )}
    </section>
  );
}

import { useRef, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ImagePlus,
  X,
  ExternalLink,
  Link2,
} from "lucide-react";
import {
  sharedProjectIds,
  isWorldLibrary,
  referencedWorldIds,
  kindLabels,
  statusOptions,
  categoryOptions,
  fieldOptions,
  uniqueOptions,
  isSyndrome,
} from "./model";
import FreeTextInput from "./FreeTextInput";
import WritingField from "./WritingField";
import { CharacterSyndromes, DiseaseList } from "./Syndromes";
import type { Data, Entry, Project } from "./model";
export function TagsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="tags-input">
      {value.map((t) => (
        <button
          type="button"
          key={t}
          onClick={() => onChange(value.filter((x) => x !== t))}
        >
          #{t}
          <X size={11} />
        </button>
      ))}
      <input
        aria-label="タグを追加"
        placeholder="タグを入力して Enter"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            const t = text.trim().replace(/^#/, "");
            if (t && !value.includes(t)) onChange([...value, t]);
            setText("");
          }
        }}
        onBlur={() => {
          const t = text.trim().replace(/^#/, "");
          if (t && !value.includes(t)) onChange([...value, t]);
          setText("");
        }}
      />
    </div>
  );
}
export function ImageInput({
  value,
  onChange,
  onError,
}: {
  value: string;
  onChange: (v: string) => void;
  onError: (s: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="image-input">
      {value ? (
        <img src={value} alt="設定画像" />
      ) : (
        <div className="image-placeholder">
          <ImagePlus size={25} />
        </div>
      )}
      <div>
        <button
          type="button"
          className="button subtle"
          onClick={() => input.current?.click()}
        >
          画像を選択
        </button>
        <small>PNG・JPEG・WebP・GIF / 最大 3MB</small>
        {value && (
          <button
            type="button"
            className="text-button danger"
            onClick={() => onChange("")}
          >
            画像を外す
          </button>
        )}
      </div>
      <input
        ref={input}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (
            f.size > 3 * 1024 * 1024 ||
            !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
              f.type,
            )
          ) {
            onError("3MB以下の PNG・JPEG・WebP・GIF を選択してください。");
            return;
          }
          const reader = new FileReader();
          reader.onload = () => onChange(String(reader.result));
          reader.onerror = () => onError("画像を読み込めませんでした。");
          reader.readAsDataURL(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
export function ProjectForm({
  value,
  data,
  onChange,
  onSave,
  onCancel,
  onError,
  isNew = false,
}: {
  value: Project;
  data: Data;
  onChange: (p: Project) => void;
  onSave: () => void;
  onCancel: () => void;
  onError: (s: string) => void;
  isNew?: boolean;
}) {
  const world = isWorldLibrary(value);
  const sources = referencedWorldIds(data, value);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.name.trim()) onSave();
      }}
      className="project-form"
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">YOUR NEXT STORY</span>
          <h2>
            {isNew
              ? world
                ? "世界観を作成"
                : "新しいストーリー"
              : world
                ? "世界観の設定"
                : "ストーリーの設定"}
          </h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="閉じる"
          onClick={onCancel}
        >
          <X size={20} />
        </button>
      </div>
      <label>
        {world ? "世界観の名前" : "作品名"}{" "}
        <span className="required">必須</span>
        <input
          autoFocus
          required
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="まだ名前のない物語"
        />
      </label>
      <div className="form-row">
        <label>
          種類
          <FreeTextInput
            label="種類"
            value={value.type}
            onChange={(type) => onChange({ ...value, type })}
            suggestions={uniqueOptions([
              "シリーズ",
              "作品",
              "章",
              ...data.projects.map((p) => p.type),
            ])}
            placeholder="例：作品、設定集、短編集"
          />
        </label>
      </div>
      {!world && (
        <fieldset className="world-reference-picker">
          <legend>参照する世界観</legend>
          <p>
            事前に作った設定資料を選びます。ツリーの所属とは別に、複数の世界観を参照できます。
          </p>
          {data.projects
            .filter(
              (p) =>
                p.id !== value.id &&
                !sharedProjectIds(data, p.id).has(value.id) &&
                (isWorldLibrary(p) || sources.includes(p.id)),
            )
            .map((p) => (
              <label key={p.id}>
                <input
                  type="checkbox"
                  checked={sources.includes(p.id)}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      parentId: "",
                      worldIds: event.target.checked
                        ? [...sources, p.id]
                        : sources.filter((id) => id !== p.id),
                    })
                  }
                />
                {p.name}
                {!isWorldLibrary(p) && "（以前の共有元）"}
              </label>
            ))}
          {!data.projects.some(isWorldLibrary) && (
            <p className="muted">
              世界観ライブラリで資料を作成すると、ここから選べます。参照なしでも執筆できます。
            </p>
          )}
        </fieldset>
      )}
      <label>
        説明
        <textarea
          aria-label="説明"
          rows={4}
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
          placeholder="この物語は、どこから始まりますか。"
        />
      </label>
      <label>
        設定の状態
        <FreeTextInput
          label="設定の状態"
          value={value.status}
          onChange={(status) => onChange({ ...value, status })}
          suggestions={statusOptions(data)}
          placeholder="例：確定、要調査、作者だけの設定"
        />
      </label>
      <label>
        タグ
        <TagsInput
          value={value.tags}
          onChange={(tags) => onChange({ ...value, tags })}
        />
      </label>
      <ImageInput
        value={value.image}
        onChange={(image) => onChange({ ...value, image })}
        onError={onError}
      />
      <label>
        作中での通説
        <textarea
          aria-label="作中での通説"
          rows={3}
          value={value.lore}
          onChange={(e) => onChange({ ...value, lore: e.target.value })}
        />
      </label>
      <label>
        実際の真相
        <textarea
          aria-label="実際の真相"
          rows={3}
          value={value.truth}
          onChange={(e) => onChange({ ...value, truth: e.target.value })}
        />
      </label>
      <div className="modal-footer">
        <span className="muted">
          {isNew ? "作成後の設定は自動保存されます" : "変更は自動保存されます"}
        </span>
        <button className="button primary" type="submit">
          {isNew ? (world ? "世界観を作成" : "ストーリーを作成") : "完了"}
        </button>
      </div>
    </form>
  );
}
const charFields = [
  "別名",
  "性別",
  "年齢",
  "誕生日",
  "役割",
  "外見",
  "性格",
  "能力",
  "病気",
  "経歴",
  "所属国家",
  "組織",
  "一族",
];
export function EntryEditor({
  entry,
  data,
  onChange,
  onBack,
  onOpen,
  onDelete,
  onError,
  onRelation,
  saveState,
  onCreateSyndrome,
}: {
  entry: Entry;
  data: Data;
  onChange: (entry: Entry) => void;
  onBack: () => void;
  onOpen: (id: string) => void;
  onDelete: () => void;
  onError: (s: string) => void;
  onRelation: () => void;
  saveState: string;
  onCreateSyndrome: () => void;
}) {
  const field = (key: string, value: string) =>
    onChange({ ...entry, fields: { ...entry.fields, [key]: value } });
  const [linkQuery, setLinkQuery] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const refs = data.entries.filter(
    (e) => e.id !== entry.id && e.links.includes(entry.id),
  );
  const relationships = data.relations.filter(
    (r) => r.from === entry.id || r.to === entry.id,
  );
  return (
    <div className="entry-page">
      <button className="text-button back" onClick={onBack}>
        <ArrowLeft size={16} />
        一覧へ戻る
      </button>
      <div className="page-title">
        <div>
          <span className="eyebrow">
            {kindLabels[entry.kind]} / PERSONAL ARCHIVE
          </span>
          <h1>{entry.name || "名前未設定"}</h1>
        </div>
        <button className="button danger-outline" onClick={onDelete}>
          <Trash2 size={15} />
          削除
        </button>
      </div>
      <section
        className="panel"
        style={{ padding: "1rem", marginBottom: "1rem" }}
      >
        <label>
          設定の保存先（ストーリー／世界観）
          <select
            aria-label="設定の保存先（ストーリー／世界観）"
            value={entry.projectId}
            onChange={(event) =>
              onChange({ ...entry, projectId: event.target.value })
            }
          >
            {data.projects
              .filter((p) => sharedProjectIds(data, entry.projectId).has(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </label>
        <p>
          ストーリーに保存すると専用設定になります。参照中の世界観に保存すると、その資料を使うストーリーにも編集内容が反映されます。
        </p>
      </section>
      <div className="editor-layout">
        <div className="editor-main">
          <section className="panel editor-section">
            <div className="section-heading">
              <h2>基本情報</h2>
              <span className="muted small">
                自由に記述・候補は任意・自動保存
              </span>
            </div>
            <ImageInput
              value={entry.image}
              onChange={(image) => onChange({ ...entry, image })}
              onError={onError}
            />
            <label>
              名前
              <input
                value={entry.name}
                onChange={(e) => onChange({ ...entry, name: e.target.value })}
              />
            </label>
            <label>
              ひとこと・肩書き
              <input
                value={entry.subtitle}
                onChange={(e) =>
                  onChange({ ...entry, subtitle: e.target.value })
                }
                placeholder="この設定を表す、短い言葉"
              />
            </label>
            <div className="form-row">
              <label>
                設定の状態
                <FreeTextInput
                  label="設定の状態"
                  value={entry.status}
                  onChange={(status) => onChange({ ...entry, status })}
                  suggestions={statusOptions(data)}
                  placeholder="自由に状態を記述"
                />
              </label>
              {entry.kind === "world" && (
                <label>
                  カテゴリ
                  <FreeTextInput
                    label="カテゴリ"
                    value={entry.category}
                    onChange={(category) => onChange({ ...entry, category })}
                    suggestions={categoryOptions(data)}
                    placeholder="例：言語・文字、植物、暦"
                  />
                </label>
              )}
              {entry.kind === "character" && (
                <label>
                  生存状況
                  <FreeTextInput
                    label="生存状況"
                    value={entry.fields.生存状況 || ""}
                    onChange={(value) => field("生存状況", value)}
                    suggestions={fieldOptions(data, "生存状況", [
                      "生存",
                      "死亡",
                      "行方不明",
                      "不明",
                    ])}
                    placeholder="例：転生、封印中、生死の概念なし"
                  />
                </label>
              )}
              {entry.kind === "clue" && (
                <label>
                  回収状況
                  <FreeTextInput
                    label="回収状況"
                    value={entry.fields.回収状況 || ""}
                    onChange={(value) => field("回収状況", value)}
                    suggestions={fieldOptions(data, "回収状況", [
                      "未回収",
                      "回収予定",
                      "回収済み",
                      "保留",
                    ])}
                    placeholder="例：一部回収、次巻で回収"
                  />
                </label>
              )}
            </div>
            {entry.kind === "character" && (
              <>
                <div className="form-row">
                  <label>
                    系統
                    <FreeTextInput
                      label="系統"
                      value={entry.fields.系統 || ""}
                      onChange={(value) => field("系統", value)}
                      suggestions={fieldOptions(data, "系統", [
                        "本家",
                        "分家",
                        "未設定",
                      ])}
                      placeholder="例：傍系、断絶した支流、養家"
                    />
                  </label>
                  <label>
                    世代（数字）
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={entry.fields.世代 || ""}
                      onChange={(e) => field("世代", e.target.value)}
                      placeholder="例：12"
                    />
                  </label>
                </div>
                <div className="form-row wrap">
                  <label>
                    生年（共通年表）
                    <input
                      aria-label="生年（共通年表）"
                      type="number"
                      step="any"
                      placeholder="未確定"
                      value={entry.fields.生年 || ""}
                      onChange={(event) => field("生年", event.target.value)}
                    />
                  </label>
                  <label>
                    没年（共通年表）
                    <input
                      aria-label="没年（共通年表）"
                      type="number"
                      step="any"
                      placeholder="未確定"
                      value={entry.fields.没年 || ""}
                      onChange={(event) => field("没年", event.target.value)}
                    />
                  </label>
                  {charFields.map((key) => (
                    <label key={key}>
                      {key}
                      {["外見", "性格", "能力", "病気", "経歴"].includes(
                        key,
                      ) ? (
                        <textarea
                          aria-label={key}
                          rows={3}
                          value={entry.fields[key] || ""}
                          onChange={(e) => field(key, e.target.value)}
                        />
                      ) : (
                        <input
                          aria-label={key}
                          value={entry.fields[key] || ""}
                          onChange={(e) => field(key, e.target.value)}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </>
            )}
            {entry.kind === "event" && (
              <div className="form-row">
                <label>
                  年代（共通暦・数字）
                  <input
                    type="number"
                    step="any"
                    value={entry.fields.年代 || ""}
                    onChange={(e) => field("年代", e.target.value)}
                    placeholder="空欄は年代未確定"
                  />
                </label>
                <label>
                  月（任意）
                  <input
                    aria-label="月（任意）"
                    type="number"
                    min="1"
                    step="1"
                    value={entry.fields.月 || ""}
                    onChange={(e) => field("月", e.target.value)}
                  />
                </label>
                <label>
                  日（任意）
                  <input
                    aria-label="日（任意）"
                    type="number"
                    min="1"
                    step="1"
                    value={entry.fields.日 || ""}
                    onChange={(e) => field("日", e.target.value)}
                  />
                </label>
                <label>
                  年代表記・暦名
                  <input
                    aria-label="年代表記・暦名"
                    placeholder="例：王暦102年、建国前3年"
                    value={entry.fields.年代表記 || ""}
                    onChange={(e) => field("年代表記", e.target.value)}
                  />
                </label>
                <label>
                  時期・日付の補足
                  <input
                    value={entry.fields.時期 || ""}
                    onChange={(e) => field("時期", e.target.value)}
                    placeholder="春 / 4月1日"
                  />
                </label>
              </div>
            )}
            {entry.kind === "clue" && (
              <div className="form-row">
                <label>
                  初登場する作品・章
                  <input
                    value={entry.fields.初登場 || ""}
                    onChange={(e) => field("初登場", e.target.value)}
                    list="chapters"
                    placeholder="作品名・章名"
                  />
                  <datalist id="chapters">
                    {data.projects.map((p) => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                </label>
                <label>
                  回収予定
                  <input
                    value={entry.fields.回収予定 || ""}
                    onChange={(e) => field("回収予定", e.target.value)}
                    placeholder="予定する章や場面"
                  />
                </label>
              </div>
            )}
            <label>
              タグ
              <TagsInput
                value={entry.tags}
                onChange={(tags) => onChange({ ...entry, tags })}
              />
            </label>
          </section>
          {entry.kind === "character" && (
            <CharacterSyndromes
              entry={entry}
              data={data}
              onChange={onChange}
              onOpen={onOpen}
              onCreate={onCreateSyndrome}
            />
          )}
          {isSyndrome(entry) && (
            <section className="panel editor-section">
              <h2>構成する病気</h2>
              <p className="muted small">
                病名を自由に追加できます。変更は、この症候群を紐づけたすべての人物に反映されます。
              </p>
              <DiseaseList
                value={entry.fields.構成する病気 || ""}
                onChange={(value) => field("構成する病気", value)}
              />
            </section>
          )}
          <section className="panel editor-section">
            <WritingField
              label="設定・メモ"
              primary
              value={entry.body}
              onChange={(body) => onChange({ ...entry, body })}
              saveState={saveState}
              placeholder="この世界について、思いつくままに。"
            />
            <div className="editor-divider" />
            <WritingField
              label="作中での通説"
              value={entry.lore}
              onChange={(lore) => onChange({ ...entry, lore })}
              saveState={saveState}
              placeholder="登場人物や世間が信じていること"
            />
            <WritingField
              label={entry.kind === "clue" ? "真相" : "実際の真相"}
              value={entry.truth}
              onChange={(truth) => onChange({ ...entry, truth })}
              saveState={saveState}
              placeholder="作者だけが知る、この設定の裏側"
            />
          </section>
          <section className="panel editor-section">
            <div className="section-heading">
              <h2>自由項目</h2>
              <button
                className="text-button"
                onClick={() =>
                  onChange({
                    ...entry,
                    custom: [...entry.custom, { name: "", value: "" }],
                  })
                }
              >
                <Plus size={15} />
                項目を追加
              </button>
            </div>
            {entry.custom.length === 0 && (
              <p className="muted small">
                口癖、好きな花、秘密の約束。項目を自由に追加できます。
              </p>
            )}
            {entry.custom.map((c, i) => (
              <div className="custom-row" key={i}>
                <input
                  aria-label={`自由項目${i + 1}の名前`}
                  placeholder="項目名"
                  value={c.name}
                  onChange={(e) =>
                    onChange({
                      ...entry,
                      custom: entry.custom.map((x, j) =>
                        j === i ? { ...x, name: e.target.value } : x,
                      ),
                    })
                  }
                />
                <textarea
                  aria-label={`自由項目${i + 1}の内容`}
                  placeholder="内容"
                  rows={2}
                  value={c.value}
                  onChange={(e) =>
                    onChange({
                      ...entry,
                      custom: entry.custom.map((x, j) =>
                        j === i ? { ...x, value: e.target.value } : x,
                      ),
                    })
                  }
                />
                <button
                  className="icon-button"
                  aria-label="自由項目を削除"
                  onClick={() =>
                    onChange({
                      ...entry,
                      custom: entry.custom.filter((_, j) => j !== i),
                    })
                  }
                >
                  <X size={15} />
                </button>
              </div>
            ))}
          </section>
        </div>
        <aside className="editor-aside">
          <section className="panel editor-section">
            <h2>
              <Link2 size={17} />
              関連する設定
            </h2>
            <p className="muted small">
              {entry.kind === "event"
                ? "人物・国家・一族をリンクすると、それぞれの年表に表示されます。"
                : "人物・事件・世界観をつないで、物語を立体的に。"}
            </p>
            {entry.links.map((id) => {
              const e = data.entries.find((x) => x.id === id);
              return (
                e && (
                  <div className="link-row" key={id}>
                    <button onClick={() => onOpen(id)}>
                      <span className="muted small">{kindLabels[e.kind]}</span>
                      <strong>{e.name}</strong>
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`${e.name}のリンク解除`}
                      onClick={() =>
                        onChange({
                          ...entry,
                          links: entry.links.filter((x) => x !== id),
                        })
                      }
                    >
                      <X size={13} />
                    </button>
                  </div>
                )
              );
            })}
            <button
              className="button subtle full"
              onClick={() => setLinkOpen(!linkOpen)}
            >
              <Plus size={15} />
              関連リンクを追加
            </button>
            {linkOpen && (
              <div className="link-picker">
                <input
                  autoFocus
                  aria-label="リンクする設定を検索"
                  placeholder="名前を検索"
                  value={linkQuery}
                  onChange={(e) => setLinkQuery(e.target.value)}
                />
                <div>
                  {data.entries
                    .filter(
                      (e) =>
                        e.id !== entry.id &&
                        !entry.links.includes(e.id) &&
                        e.name.includes(linkQuery),
                    )
                    .map((e) => (
                      <button
                        key={e.id}
                        onClick={() => {
                          onChange({ ...entry, links: [...entry.links, e.id] });
                          setLinkQuery("");
                          setLinkOpen(false);
                        }}
                      >
                        <span>{e.name}</span>
                        <small>
                          {
                            data.projects.find((p) => p.id === e.projectId)
                              ?.name
                          }{" "}
                          · {kindLabels[e.kind]}
                        </small>
                      </button>
                    ))}
                </div>
              </div>
            )}
          </section>
          {entry.kind === "character" && (
            <section className="panel editor-section">
              <div className="section-heading">
                <h2>人物の関係</h2>
                <button
                  className="icon-button"
                  aria-label="人物の関係を追加"
                  onClick={onRelation}
                >
                  <Plus size={17} />
                </button>
              </div>
              {relationships.length === 0 && (
                <p className="muted small">
                  親子・婚姻・友人などの関係を追加できます。
                </p>
              )}
              {relationships.map((r) => {
                const other = data.entries.find(
                  (e) => e.id === (r.from === entry.id ? r.to : r.from),
                );
                return (
                  <button
                    className="relation-link"
                    key={r.id}
                    onClick={() => other && onOpen(other.id)}
                  >
                    <span className="chip">
                      {r.type === "親子"
                        ? r.from === entry.id
                          ? "子"
                          : "親"
                        : r.type === "養子"
                          ? r.from === entry.id
                            ? "養子"
                            : "養親"
                          : r.type}
                    </span>
                    <span>{other?.name}</span>
                  </button>
                );
              })}
            </section>
          )}
          <section className="panel editor-section">
            <h2>
              この設定へのリンク元 <span className="count">{refs.length}</span>
            </h2>
            {refs.length === 0 ? (
              <p className="muted small">まだリンク元はありません。</p>
            ) : (
              refs.map((e) => (
                <button
                  className="backlink"
                  key={e.id}
                  onClick={() => onOpen(e.id)}
                >
                  <span>{e.name}</span>
                  <ExternalLink size={13} />
                </button>
              ))
            )}
          </section>
          <p className="small muted update-time">
            更新: {new Date(entry.updatedAt).toLocaleString("ja-JP")}
          </p>
        </aside>
      </div>
    </div>
  );
}

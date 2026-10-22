import { sharedProjectIds } from "../model";
import { useState } from "react";
import Modal from "../Modal";
import { ImageInput, TagsInput } from "../Editors";
import {
  attachImage,
  collectAssets,
  editStudio,
  imageOf,
  putItem,
  sid,
  studioOf,
} from "./model";
import type { Reference, Term } from "./model";
import { Empty, LinkPicker, SaveCancel } from "./ui";
import type { StudioProps } from "./ui";

export function externalUrl(value: string): string {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
export default function RecordsPanel({
  data,
  projectId,
  change,
  focusId,
  notice,
  confirm,
  mode,
}: StudioProps & { mode: "terms" | "references" }) {
  const s = studioOf(data);
  const isTerm = mode === "terms";
  const label = isTerm ? "用語" : "画像資料";
  const original = (isTerm ? s.terms : s.references).find(
    (item) => item.id === focusId,
  );
  const [draft, setDraft] = useState<Term | Reference | null>(
    original ? structuredClone(original) : null,
  );
  const [picture, setPicture] = useState(
    original && "imageId" in original ? imageOf(data, original.imageId) : "",
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const items = (isTerm ? s.terms : s.references)
    .filter(
      (item) =>
        sharedProjectIds(data, projectId).has(item.projectId) &&
        (!category || item.category === category) &&
        JSON.stringify(item)
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase().trim()),
    )
    .slice()
    .sort((a, b) =>
      ("reading" in a ? a.reading || a.name : a.name).localeCompare(
        "reading" in b ? b.reading || b.name : b.name,
        "ja",
      ),
    );
  const categories = [
    ...new Set(
      (isTerm ? s.terms : s.references)
        .filter((item) => sharedProjectIds(data, projectId).has(item.projectId))
        .map((item) => item.category)
        .filter(Boolean),
    ),
  ];
  const begin = () => {
    setPicture("");
    setDraft(
      isTerm
        ? {
            id: sid(),
            projectId,
            name: "",
            reading: "",
            aliases: [],
            definition: "",
            category: "",
            links: [],
          }
        : {
            id: sid(),
            projectId,
            name: "",
            imageId: "",
            source: "",
            note: "",
            category: "",
            links: [],
          },
    );
  };
  return (
    <section className="studio-section">
      <h2>{isTerm ? "固有名詞の用語辞典" : "画像資料ボード"}</h2>
      <p className="muted">
        {isTerm
          ? "名前・読み・別名・定義を整理し、人物や世界観の設定へつなげます。"
          : "人物・建築・衣装などの参考画像を、出典とメモ付きで保管します。画像は1枚3MBまで、端末内に保存します。"}
      </p>
      <div className="studio-actions">
        <button
          className="button primary"
          disabled={!projectId}
          onClick={begin}
        >
          {label}を追加
        </button>
        <input
          aria-label={`${label}を検索`}
          placeholder="名前・説明で検索"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label={`${label}のカテゴリで絞り込み`}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">すべてのカテゴリ</option>
          {categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      {!items.length ? (
        <Empty>{label}はまだありません。自由なカテゴリで追加できます。</Empty>
      ) : (
        <div className={isTerm ? "studio-card-grid" : "studio-reference-grid"}>
          {items.map((item) => (
            <article
              className={`panel studio-record ${item.id === focusId ? "selected" : ""}`}
              key={item.id}
            >
              {"imageId" in item && imageOf(data, item.imageId) && (
                <button
                  className="studio-image-open"
                  aria-label={`${item.name}の画像を開く`}
                  onClick={() => {
                    setDraft(structuredClone(item));
                    setPicture(imageOf(data, item.imageId));
                  }}
                >
                  <img src={imageOf(data, item.imageId)} alt={item.name} />
                </button>
              )}
              <div className="studio-form">
                <span className="eyebrow">{item.category || label}</span>
                <h3>{item.name || "名前未設定"}</h3>
                {"reading" in item && (
                  <>
                    <p className="muted small">{item.reading}</p>
                    <div className="tag-list">
                      {item.aliases.map((alias, index) => (
                        <span key={index}>{alias}</span>
                      ))}
                    </div>
                    <p className="studio-card-summary">{item.definition}</p>
                  </>
                )}
                {"note" in item && (
                  <>
                    <p className="studio-card-summary">{item.note}</p>
                    <p className="muted small studio-source">{item.source}</p>
                  </>
                )}
                <div className="studio-actions">
                  <button
                    className="button subtle"
                    onClick={() => {
                      setDraft(structuredClone(item));
                      setPicture(
                        "imageId" in item ? imageOf(data, item.imageId) : "",
                      );
                    }}
                  >
                    詳細・編集
                  </button>
                  <button
                    className="button danger-outline"
                    aria-label={`${item.name}を削除`}
                    onClick={() =>
                      confirm({
                        title: `この${label}を削除しますか？`,
                        message: "関連する人物や世界観の設定は残ります。",
                        action: () =>
                          change((d) =>
                            editStudio(d, (s) =>
                              collectAssets(
                                isTerm
                                  ? {
                                      ...s,
                                      terms: s.terms.filter(
                                        (row) => row.id !== item.id,
                                      ),
                                      publications: s.publications.filter(
                                        (row) =>
                                          row.target !== "term" ||
                                          row.targetId !== item.id,
                                      ),
                                    }
                                  : {
                                      ...s,
                                      references: s.references.filter(
                                        (row) => row.id !== item.id,
                                      ),
                                    },
                              ),
                            ),
                          ),
                      })
                    }
                  >
                    削除
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {draft && (
        <Modal wide label={`${label}を編集`} onClose={() => setDraft(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.name.trim()) return;
              change((d) =>
                editStudio(d, (s) => {
                  if ("definition" in draft)
                    return {
                      ...s,
                      terms: putItem(s.terms, {
                        ...draft,
                        name: draft.name.trim(),
                      }),
                    };
                  const attached = attachImage(s, picture);
                  return collectAssets({
                    ...attached.studio,
                    references: putItem(s.references, {
                      ...draft,
                      name: draft.name.trim(),
                      imageId: attached.imageId,
                    }),
                  });
                }),
              );
              setDraft(null);
              notice(`${label}を保存しました。`);
            }}
          >
            <h2>{label}を編集</h2>
            <label>
              {label}の名前
              <input
                required
                autoFocus
                aria-label={`${label}の名前`}
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </label>
            <label>
              カテゴリ
              <input
                value={draft.category}
                onChange={(event) =>
                  setDraft({ ...draft, category: event.target.value })
                }
                placeholder={
                  isTerm ? "例：地名、魔法、役職" : "例：人物、建築、衣装"
                }
              />
            </label>
            {"definition" in draft ? (
              <>
                <label>
                  読み
                  <input
                    aria-label="用語の読み"
                    value={draft.reading}
                    onChange={(event) =>
                      setDraft({ ...draft, reading: event.target.value })
                    }
                  />
                </label>
                <label>
                  別名
                  <TagsInput
                    value={draft.aliases}
                    onChange={(aliases) => setDraft({ ...draft, aliases })}
                  />
                </label>
                <label>
                  定義
                  <textarea
                    aria-label="用語の定義"
                    rows={7}
                    value={draft.definition}
                    onChange={(event) =>
                      setDraft({ ...draft, definition: event.target.value })
                    }
                  />
                </label>
              </>
            ) : (
              <>
                {picture && (
                  <img
                    className="studio-reference-full"
                    src={picture}
                    alt={draft.name || "参考画像"}
                  />
                )}
                <ImageInput
                  value={picture}
                  onChange={setPicture}
                  onError={notice}
                />
                <label>
                  出典・参照URL
                  <input
                    aria-label="出典・参照URL"
                    value={draft.source}
                    onChange={(event) =>
                      setDraft({ ...draft, source: event.target.value })
                    }
                    placeholder="書名・ページ、作者名、参照先URLなど"
                  />
                </label>
                {externalUrl(draft.source) && (
                  <a
                    className="text-button"
                    href={externalUrl(draft.source)}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    出典を別の画面で開く
                  </a>
                )}
                <label>
                  資料のメモ
                  <textarea
                    aria-label="資料のメモ"
                    rows={5}
                    value={draft.note}
                    onChange={(event) =>
                      setDraft({ ...draft, note: event.target.value })
                    }
                  />
                </label>
              </>
            )}
            <LinkPicker
              data={data}
              value={draft.links}
              onChange={(links) => setDraft({ ...draft, links })}
            />
            <SaveCancel onCancel={() => setDraft(null)} />
          </form>
        </Modal>
      )}
    </section>
  );
}

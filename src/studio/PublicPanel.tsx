import { useState } from "react";
import Modal from "../Modal";
import { editStudio, putItem, sid, studioOf } from "./model";
import type { Publication } from "./model";
import {
  publicDocument,
  publicMarkdown,
  publicationTargets,
} from "./publication";
import type { PublicDocument } from "./publication";
import { Empty, exportText, SaveCancel } from "./ui";
import type { StudioProps } from "./ui";
function Downloads({ document }: { document: PublicDocument }) {
  return (
    <div className="studio-actions">
      <button
        className="button primary"
        disabled={!document.items.length}
        onClick={() =>
          exportText(publicMarkdown(document), "public-settings.md")
        }
      >
        公開用Markdownを書き出す
      </button>
      <button
        className="button subtle"
        disabled={!document.items.length}
        onClick={() =>
          exportText(
            JSON.stringify(document, null, 2),
            "public-settings.json",
            "application/json",
          )
        }
      >
        公開用JSONを書き出す
      </button>
    </div>
  );
}
export function PublicReader({
  document,
  onExit,
}: {
  document: PublicDocument;
  onExit: () => void;
}) {
  return (
    <main className="public-reader">
      <div className="public-reader-toolbar">
        <span>公開情報モード</span>
        <button className="button subtle" onClick={onExit}>
          編集画面へ戻る
        </button>
      </div>
      <h1>公開設定</h1>
      <p className="muted">公開用として保存した文章のみを表示しています。</p>
      <Downloads document={document} />
      {document.items.length ? (
        document.items.map((item, i) => (
          <article className="panel studio-form" key={i}>
            <h2>{item.title}</h2>
            <div className="studio-prose">{item.text}</div>
          </article>
        ))
      ) : (
        <Empty>公開する文章はまだありません。</Empty>
      )}
    </main>
  );
}
export default function PublicPanel({
  data,
  projectId,
  change,
  confirm,
  notice,
  onPublicPreview,
}: StudioProps) {
  const targets = publicationTargets(data, projectId),
    keys = new Set(targets.map((t) => t.key));
  const items = studioOf(data).publications.filter((p) =>
    keys.has(`${p.target}:${p.targetId}`),
  );
  const document = publicDocument(data, projectId);
  const [draft, setDraft] = useState<Publication | null>(null);
  return (
    <section className="studio-section">
      <h2>公開情報とネタバレ保護</h2>
      <p className="muted">
        初期状態ではすべて非公開です。元の設定と分けて「公開用の名前・文章」を書き、公開を有効にした項目だけを書き出します。真相・通説・履歴・認識・画像・関連リンクは自動で含めません。
      </p>
      <p className="muted small">
        端末上のプレビューとファイル出力の機能です。編集画面へのアクセスを制限する機能や、Webへの自動公開ではありません。元データ全体のJSONバックアップは非公開情報を含むため、共有には下の公開用出力を使ってください。
      </p>
      <div className="studio-actions">
        <button
          className="button primary"
          disabled={!targets.length}
          onClick={() => {
            const t = targets[0];
            setDraft({
              id: sid(),
              projectId,
              target: t.target,
              targetId: t.id,
              enabled: false,
              title: "",
              text: "",
            });
          }}
        >
          公開用の文章を追加
        </button>
        <button
          className="button subtle"
          onClick={() => onPublicPreview?.(projectId)}
        >
          公開情報モードで確認
        </button>
      </div>
      <div className="panel studio-form">
        <h3>公開対象：{document.items.length} 件</h3>
        <Downloads document={document} />
      </div>
      {!items.length ? (
        <Empty>
          公開用の文章を追加してください。公開を有効にするまでは出力されません。
        </Empty>
      ) : (
        <div className="studio-card-grid">
          {items.map((item) => (
            <article className="panel studio-form" key={item.id}>
              <span className="eyebrow">
                {item.enabled ? "公開する" : "非公開"}
              </span>
              <h3>{item.title || "公開名は未記入"}</h3>
              <p className="muted small">
                元の設定：
                {
                  targets.find(
                    (t) => t.key === `${item.target}:${item.targetId}`,
                  )?.label
                }
              </p>
              <p className="studio-card-summary">{item.text}</p>
              <div className="studio-actions">
                <button
                  className="button subtle"
                  onClick={() => setDraft({ ...item })}
                >
                  公開文を編集
                </button>
                <button
                  className="button danger-outline"
                  onClick={() =>
                    confirm({
                      title: "公開用の文章を削除しますか？",
                      message: "元の設定は残ります。",
                      action: () =>
                        change((d) =>
                          editStudio(d, (s) => ({
                            ...s,
                            publications: s.publications.filter(
                              (p) => p.id !== item.id,
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
        <Modal wide label="公開用の文章を編集" onClose={() => setDraft(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.title.trim()) return;
              change((d) =>
                editStudio(d, (s) => ({
                  ...s,
                  publications: putItem(s.publications, {
                    ...draft,
                    title: draft.title.trim(),
                  }),
                })),
              );
              setDraft(null);
              notice("公開用の文章を保存しました。");
            }}
          >
            <h2>公開用の文章を編集</h2>
            <label>
              元になる設定
              <select
                aria-label="元になる設定"
                value={`${draft.target}:${draft.targetId}`}
                onChange={(e) => {
                  const t = targets.find((t) => t.key === e.target.value);
                  if (t)
                    setDraft({ ...draft, target: t.target, targetId: t.id });
                }}
              >
                {targets.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted small">
              元の設定名・本文は自動コピーしません。この欄に書いた文章が公開用ファイルに入ります。
            </p>
            <label>
              公開用の名前
              <input
                required
                autoFocus
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label>
              公開用の文章
              <textarea
                rows={12}
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) =>
                  setDraft({ ...draft, enabled: e.target.checked })
                }
              />
              この文章を公開用の出力に含める
            </label>
            <SaveCancel onCancel={() => setDraft(null)} />
          </form>
        </Modal>
      )}
    </section>
  );
}

import { RotateCcw, Trash2 } from "lucide-react";
import type { TrashItem } from "./trashModel";
export default function TrashPanel({
  items,
  onRestore,
  onDelete,
}: {
  items: TrashItem[];
  onRestore: (id: string) => void;
  onDelete: (item: TrashItem) => void;
}) {
  return (
    <section className="trash-panel">
      <h2>ゴミ箱</h2>
      <p className="muted">
        削除したプロジェクト・設定はここに保管されます。完全削除するまで復元できます。
      </p>
      {!items.length ? (
        <p className="trash-empty">ゴミ箱は空です。</p>
      ) : (
        <div className="trash-items">
          {items.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.name || "名前未設定"}</strong>
                <small>
                  {item.kind === "project" ? "プロジェクト" : "設定"} ·{" "}
                  {new Date(item.deletedAt).toLocaleString("ja-JP")}
                </small>
              </div>
              <div className="trash-actions">
                <button
                  className="button subtle"
                  onClick={() => onRestore(item.id)}
                >
                  <RotateCcw size={16} />
                  復元
                </button>
                <button
                  className="button subtle danger"
                  onClick={() => onDelete(item)}
                >
                  <Trash2 size={16} />
                  完全削除
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

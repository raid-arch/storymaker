import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Globe2,
  Plus,
  Settings2,
} from "lucide-react";
import type { Data, Project } from "./model";
import { isWorldLibrary } from "./model";
import { parentWorld } from "./workspaces";
import { studioOf } from "./studio/model";
export default function WorkspaceContext({
  data,
  project,
  onOpen,
  onEntry,
  onCreate,
  onParent,
  onOverview,
  activeEntryId,
}: {
  data: Data;
  project: Project;
  activeEntryId?: string;
  onOpen: (id: string) => void;
  onEntry: (id: string) => void;
  onCreate: () => void;
  onParent: () => void;
  onOverview: () => void;
}) {
  const parent = parentWorld(data, project),
    world = isWorldLibrary(project),
    own = data.entries.filter((e) => e.projectId === project.id);
  const children = data.projects.filter(
    (p) => !isWorldLibrary(p) && parentWorld(data, p)?.id === project.id,
  );
  const base = parent
    ? data.entries.filter((e) => e.projectId === parent.id)
    : [];
  const active = own.find((e) => e.id === activeEntryId);
  const usage = active
    ? children
        .map((child) => ({
          child,
          entries: data.entries.filter(
            (e) => e.projectId === child.id && e.links.includes(active.id),
          ),
          scenes: studioOf(data).scenes.filter(
            (s) =>
              s.projectId === child.id &&
              (s.links.includes(active.id) ||
                s.povId === active.id ||
                s.clueBeats?.[active.id]),
          ),
        }))
        .filter((item) => item.entries.length || item.scenes.length)
    : [];
  const categories = [
    ...new Set(
      (world ? own : base)
        .filter((e) => e.kind === "world")
        .map((e) => e.category || "未分類"),
    ),
  ];
  return (
    <aside className="workspace-inspector" aria-label="プロジェクトの関連資料">
      <div className="inspector-title">
        <span>PROJECT CONTEXT</span>
        <h2>{world ? "この世界と物語" : "親の世界観"}</h2>
      </div>
      {!world && (
        <>
          <div className="inspector-parent">
            <Globe2 size={24} />
            <strong>{parent?.name || "親は未設定"}</strong>
            <p>
              {parent
                ? "この世界観の共通設定に準拠しています。"
                : "親を選ぶと、人物・場所・時間などを引き継いで使えます。"}
            </p>
            {parent && (
              <button
                className="button subtle full"
                onClick={() => onOpen(parent.id)}
              >
                親の世界観を開く
                <ArrowRight size={14} />
              </button>
            )}
            <button className="text-button" onClick={onParent}>
              <Settings2 size={14} />
              親の選択・変更
            </button>
          </div>
          <section>
            <h3>共通設定の入口</h3>
            <div className="inspector-categories">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    const entry = base.find((e) => e.category === c);
                    if (entry) onEntry(entry.id);
                  }}
                >
                  {c}
                  <small>
                    {base.filter((e) => (e.category || "未分類") === c).length}
                  </small>
                </button>
              ))}
            </div>
          </section>
          <p className="inspector-boundary">
            共通設定の変更は親に反映されます。役割・場面の状態・本文はこの物語専用です。
          </p>
        </>
      )}
      {world && (
        <>
          {active && (
            <section className="inspector-usage">
              <h3>「{active.name}」を使う物語</h3>
              {usage.map(({ child, entries, scenes }) => (
                <div key={child.id}>
                  <button
                    className="text-button"
                    onClick={() => onOpen(child.id)}
                  >
                    {child.name}
                    <ArrowRight size={14} />
                  </button>
                  {entries.map((entry) => (
                    <button
                      className="inspector-usage-link"
                      key={entry.id}
                      onClick={() => onEntry(entry.id)}
                    >
                      {entry.name}
                    </button>
                  ))}
                  {scenes.map((scene) => (
                    <small key={scene.id}>場面：{scene.name}</small>
                  ))}
                </div>
              ))}
              {!usage.length && (
                <p>この設定を使う場面・専用設定は、まだ登録されていません。</p>
              )}
            </section>
          )}
          <p className="inspector-boundary">
            ここで作る設定は、この世界を親に持つ物語で共通して使います。
          </p>
          <section>
            <h3>この世界から生まれる物語</h3>
            {children.map((child) => (
              <button
                className="inspector-child"
                key={child.id}
                onClick={() => onOpen(child.id)}
              >
                <BookOpen size={17} />
                <span>
                  {child.name}
                  <small>
                    {
                      studioOf(data).scenes.filter(
                        (s) => s.projectId === child.id,
                      ).length
                    }
                    シーン ·{" "}
                    {
                      data.entries.filter((e) => e.projectId === child.id)
                        .length
                    }
                    件の専用設定
                  </small>
                </span>
                <ArrowRight size={14} />
              </button>
            ))}
            <button className="button subtle full" onClick={onCreate}>
              <Plus size={15} />
              この世界に物語を作る
            </button>
          </section>
          <section>
            <h3>共通設定の分類</h3>
            <div className="inspector-categories">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    const entry = own.find(
                      (e) => (e.category || "未分類") === c,
                    );
                    if (entry) onEntry(entry.id);
                  }}
                >
                  {c}
                  <small>
                    {own.filter((e) => (e.category || "未分類") === c).length}
                  </small>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
      <section className="inspector-summary">
        <h3>今開いている保存先</h3>
        <strong>{project.name}</strong>
        <span>
          {world ? "世界共通の設定" : "物語固有の設定"}：{own.length}件
        </span>
        <button className="text-button" onClick={onOverview}>
          プロジェクトの概要
          <ArrowRight size={14} />
        </button>
      </section>
      {parent && (
        <button className="text-button" onClick={() => onOpen(parent.id)}>
          <ArrowLeft size={14} />
          {parent.name}へ
        </button>
      )}
    </aside>
  );
}

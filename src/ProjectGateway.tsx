import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FolderOpen,
  Globe2,
  Plus,
  Settings2,
  Sprout,
} from "lucide-react";
import { isAndroidApp } from "./native";
import type { Data, Project } from "./model";
import { isWorldLibrary } from "./model";
import {
  parentWorld,
  workspaceStories,
  workspaceStoryDepth,
} from "./workspaces";
export default function ProjectGateway({
  data,
  screen,
  lastId,
  onScreen,
  onOpen,
  onCreate,
  onSettings,
  saveState,
}: {
  data: Data;
  screen: "home" | "picker";
  lastId: string;
  onScreen: (screen: "home" | "picker") => void;
  onOpen: (id: string) => void;
  onCreate: (kind: "world" | "story", parentId?: string) => void;
  onSettings: () => void;
  saveState: string;
}) {
  const [query, setQuery] = useState("");
  const worlds = data.projects.filter(isWorldLibrary);
  const last = data.projects.find((p) => p.id === lastId);
  const matches = (p: Project) =>
    `${p.name} ${p.description}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase());
  const stories = (id: string) => workspaceStories(data, id);
  function storyCard(p: Project) {
    return (
      <button
        className="gateway-story"
        style={{
          paddingLeft: `${12 + Math.min(workspaceStoryDepth(data, p), 5) * 16}px`,
        }}
        key={p.id}
        onClick={() => onOpen(p.id)}
      >
        <BookOpen size={19} />
        <span>
          <strong>{p.name || "名前未設定"}</strong>
          <small>
            {p.type === "シリーズ" ? "シリーズ" : "物語"} ·{" "}
            {data.entries.filter((e) => e.projectId === p.id).length}
            件の専用設定
          </small>
        </span>
        <ArrowRight size={17} />
      </button>
    );
  }
  return (
    <main
      className="project-gateway"
      aria-label={screen === "home" ? "開始画面" : "プロジェクト選択"}
    >
      <header className="gateway-header">
        <button className="gateway-brand" onClick={() => onScreen("home")}>
          <Sprout size={25} />
          <span>
            綴庭<small>TSUZURINIWA</small>
          </span>
        </button>
        <div>
          <span className="gateway-save" role="status">
            {saveState}
          </span>
          <button
            className="icon-button"
            aria-label="開始画面の設定を開く"
            onClick={onSettings}
          >
            <Settings2 size={21} />
          </button>
        </div>
      </header>
      {screen === "home" ? (
        <section className="gateway-welcome">
          <span className="eyebrow">YOUR WORLD. YOUR STORIES.</span>
          <h1>あなたの物語を、ここから。</h1>
          <p>世界をつくる。その世界から、物語を紡ぐ。</p>
          <div className="gateway-main-actions">
            <button
              className="gateway-action"
              onClick={() => onScreen("picker")}
            >
              <FolderOpen size={30} />
              <span>
                <strong>プロジェクトを開く</strong>
                <small>世界観や物語を選んで、制作を始める</small>
              </span>
              <ArrowRight size={22} />
            </button>
            <button
              className="gateway-action"
              onClick={() => onCreate("world")}
            >
              <Plus size={30} />
              <span>
                <strong>新しく作る</strong>
                <small>共通の舞台となる世界観を作る</small>
              </span>
              <ArrowRight size={22} />
            </button>
          </div>
          {last && (
            <button className="gateway-resume" onClick={() => onOpen(last.id)}>
              <span>前回の続き</span>
              <strong>{last.name}</strong>
              <ArrowRight size={18} />
            </button>
          )}
          <div className="gateway-start-notes">
            <span>01 世界観を作る</span>
            <span>02 その世界に物語を作る</span>
            <span>03 選んだプロジェクトを編集する</span>
          </div>
          <button className="text-button" onClick={() => onCreate("story")}>
            親を持たない物語から始める
          </button>
        </section>
      ) : (
        <section className="gateway-picker">
          <button className="text-button" onClick={() => onScreen("home")}>
            <ArrowLeft size={16} />
            開始画面へ戻る
          </button>
          <div className="gateway-picker-heading">
            <div>
              <span className="eyebrow">PROJECT LIBRARY</span>
              <h1>プロジェクトを選ぶ</h1>
              <p>
                世界観を開くと共通設定を、物語を開くとその物語を編集します。
              </p>
            </div>
            <button
              className="button primary"
              onClick={() => onCreate("world")}
            >
              <Plus size={17} />
              世界観を新しく作る
            </button>
          </div>
          <label className="gateway-search">
            プロジェクトを探す
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="世界観や物語の名前"
            />
          </label>
          <div className="gateway-projects">
            {worlds
              .filter(
                (world) => matches(world) || stories(world.id).some(matches),
              )
              .map((world) => (
                <section className="gateway-world" key={world.id}>
                  <header>
                    <Globe2 size={25} />
                    <div>
                      <span>世界観・親プロジェクト</span>
                      <h2>{world.name || "名前未設定"}</h2>
                      <p>
                        {world.description ||
                          "時間、場所、人物、病気、世界の法則をつくる。"}
                      </p>
                    </div>
                    <button
                      className="button subtle"
                      onClick={() => onOpen(world.id)}
                      aria-label={`${world.name}の世界観を開く`}
                    >
                      世界観を編集
                      <ArrowRight size={15} />
                    </button>
                  </header>
                  <div className="gateway-children">
                    <span className="gateway-children-label">
                      この世界の物語
                    </span>
                    {stories(world.id)
                      .filter((p) => matches(world) || matches(p))
                      .map(storyCard)}
                    <button
                      className="gateway-add-story"
                      onClick={() => onCreate("story", world.id)}
                      aria-label={`${world.name}に物語を作る`}
                    >
                      <Plus size={18} />
                      この世界に物語を作る
                    </button>
                  </div>
                </section>
              ))}
            {data.projects
              .filter(
                (p) =>
                  !isWorldLibrary(p) && !parentWorld(data, p) && matches(p),
              )
              .map(storyCard)}
          </div>
          {!data.projects.length && (
            <div className="gateway-empty">
              <Globe2 size={42} />
              <h2>最初の世界観を作りましょう</h2>
              <p>
                国・時間・人物などを共通設定として作り、その下に物語を増やせます。
              </p>
              <button
                className="button primary"
                onClick={() => onCreate("world")}
              >
                世界観を作成
              </button>
            </div>
          )}
          {data.projects.length > 0 &&
            !data.projects.some(matches) &&
            !worlds.some((w) => stories(w.id).some(matches)) && (
              <p className="muted">一致するプロジェクトはありません。</p>
            )}
        </section>
      )}
      <footer className="gateway-footer">
        <span>データはこの端末に保存されます</span>
        {!isAndroidApp && (
          <a
            className="text-button"
            href={`${import.meta.env.BASE_URL}downloads/`}
          >
            Androidアプリをインストール
          </a>
        )}
        <button className="text-button" onClick={onSettings}>
          設定・インポート・バックアップ
        </button>
      </footer>
    </main>
  );
}

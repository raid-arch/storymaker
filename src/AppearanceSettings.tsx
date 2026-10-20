import {
  ArrowDown,
  ArrowUp,
  Check,
  LayoutGrid,
  List,
  Palette,
  RotateCcw,
  Type,
} from "lucide-react";
import { dashboardSections } from "./appearance";
import type { Appearance, DashboardSection } from "./appearance";

export default function AppearanceSettings({
  value,
  theme,
  onChange,
  onTheme,
  onReset,
}: {
  value: Appearance;
  theme: "dark" | "light";
  onChange: (value: Appearance) => void;
  onTheme: (theme: "dark" | "light") => void;
  onReset: () => void;
}) {
  const update = <K extends keyof Appearance>(key: K, next: Appearance[K]) =>
    onChange({ ...value, [key]: next });
  const allSections = [
    ...value.dashboard,
    ...dashboardSections
      .map((s) => s.id)
      .filter((id) => !value.dashboard.includes(id)),
  ];
  function move(id: DashboardSection, delta: number) {
    const items = [...value.dashboard],
      i = items.indexOf(id),
      next = i + delta;
    if (i < 0 || next < 0 || next >= items.length) return;
    [items[i], items[next]] = [items[next], items[i]];
    update("dashboard", items);
  }
  return (
    <section
      className="panel appearance-settings"
      id="appearance-settings"
      aria-labelledby="appearance-title"
      tabIndex={-1}
    >
      <div className="appearance-heading">
        <div>
          <span className="eyebrow">MAKE THIS GARDEN YOURS</span>
          <h2 id="appearance-title">
            <Palette size={21} />
            あなたのアトリエを整える
          </h2>
          <p>
            読みやすさも、並べ方も。変更はすぐに反映され、自動保存されます。
          </p>
        </div>
        <button className="text-button" onClick={onReset}>
          <RotateCcw size={14} />
          表示設定を初期状態に戻す
        </button>
      </div>
      <div className="appearance-columns">
        <div className="appearance-controls">
          <fieldset>
            <legend>明るさ</legend>
            <div className="choice-group">
              {(
                [
                  ["dark", "ダーク"],
                  ["light", "ライト"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  className={theme === id ? "selected" : ""}
                  aria-pressed={theme === id}
                  onClick={() => onTheme(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>テーマカラー</legend>
            <div className="color-choices">
              {(
                [
                  ["sage", "セージ"],
                  ["blue", "ブルー"],
                  ["lavender", "ラベンダー"],
                  ["amber", "アンバー"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={value.accent === id}
                  className={`color-choice color-${id} ${value.accent === id ? "selected" : ""}`}
                  onClick={() => update("accent", id)}
                >
                  <span>{value.accent === id && <Check size={16} />}</span>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>文字サイズ</legend>
            <div className="choice-group">
              {(
                [
                  ["small", "小さめ"],
                  ["medium", "標準"],
                  ["large", "大きめ"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={value.fontSize === id}
                  className={value.fontSize === id ? "selected" : ""}
                  onClick={() => update("fontSize", id)}
                >
                  <Type size={id === "large" ? 18 : 14} />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>本文の書体</legend>
            <div className="choice-group">
              {(
                [
                  ["sans", "ゴシック"],
                  ["serif", "明朝"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={value.font === id}
                  className={value.font === id ? "selected" : ""}
                  onClick={() => update("font", id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <small>設定の本文・長文エディタ・紹介文に適用します。</small>
          </fieldset>
          <fieldset>
            <legend>余白</legend>
            <div className="choice-group">
              {(
                [
                  ["comfortable", "ゆったり"],
                  ["compact", "コンパクト"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={value.density === id}
                  className={value.density === id ? "selected" : ""}
                  onClick={() => update("density", id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>設定一覧の表示</legend>
            <div className="choice-group">
              {(
                [
                  ["cards", "カード", LayoutGrid],
                  ["list", "リスト", List],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  aria-pressed={value.layout === id}
                  className={value.layout === id ? "selected" : ""}
                  onClick={() => update("layout", id)}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="appearance-dashboard">
          <h3>ホーム画面の表示項目</h3>
          <p>チェックを外すと非表示になります。矢印で表示順を変えられます。</p>
          <div className="dashboard-options">
            {allSections.map((id) => {
              const index = value.dashboard.indexOf(id),
                active = index !== -1;
              return (
                <div
                  className={`dashboard-option ${active ? "" : "disabled"}`}
                  key={id}
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) =>
                        update(
                          "dashboard",
                          e.target.checked
                            ? [...value.dashboard, id]
                            : value.dashboard.filter((x) => x !== id),
                        )
                      }
                    />
                    {dashboardSections.find((s) => s.id === id)!.label}
                  </label>
                  <button
                    className="icon-button"
                    aria-label={`${dashboardSections.find((s) => s.id === id)!.label}を上へ`}
                    disabled={!active || index === 0}
                    onClick={() => move(id, -1)}
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`${dashboardSections.find((s) => s.id === id)!.label}を下へ`}
                    disabled={!active || index === value.dashboard.length - 1}
                    onClick={() => move(id, 1)}
                  >
                    <ArrowDown size={15} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="appearance-preview">
            <span className="eyebrow">LIVE PREVIEW</span>
            <h3>ローレルの屋敷</h3>
            <p>
              まだ名前のない物語も、あなたの一行から。この場所を、いちばん書きやすい庭に。
            </p>
            <span className="chip">あなた好みの表示</span>
          </div>
          <small>
            作品や人物は削除されません。表示設定はJSONバックアップにも含まれます。
          </small>
        </div>
      </div>
    </section>
  );
}

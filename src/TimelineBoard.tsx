import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import CardSurface, { CardMenuButton } from "./CardSurface";
import { isWorldLibrary, narrativeEvents, sortEvents } from "./model";
import type { Data, Entry } from "./model";
export default function TimelineBoard({
  data,
  projectId,
  entries,
  onOpen,
  onActions,
  onOrder,
  readOnly,
}: {
  data: Data;
  projectId: string;
  entries: Entry[];
  onOpen: (id: string) => void;
  onActions: (id: string) => void;
  onOrder: (ids: string[]) => void;
  readOnly: boolean;
}) {
  const [mode, setMode] = useState("chronology"),
    [source, setSource] = useState("all"),
    [dates, setDates] = useState("all"),
    [direction, setDirection] = useState("asc"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const project = data.projects.find((p) => p.id === projectId)!;
  const world = isWorldLibrary(project);
  const storyEvents = narrativeEvents(data, projectId);
  const included = new Set(storyEvents.map((e) => e.id));
  const number = (value?: string) =>
    value?.trim() && Number.isFinite(Number(value)) ? Number(value) : undefined;
  const filtered = (
    mode === "narrative" && !world
      ? storyEvents.filter((e) => entries.some((item) => item.id === e.id))
      : sortEvents(entries)
  ).filter((e) => {
    const year = number(e.fields.年代);
    return (
      (source === "all" ||
        (source === "own"
          ? e.projectId === projectId
          : e.projectId !== projectId)) &&
      (dates === "all" ||
        (dates === "unknown" ? year === undefined : year !== undefined)) &&
      (number(from) === undefined ||
        (year !== undefined && year >= number(from)!)) &&
      (number(to) === undefined || (year !== undefined && year <= number(to)!))
    );
  });
  // Unknown dates always stay in their own final section, even when reversing time.
  const ordered =
    mode === "chronology" && direction === "desc"
      ? [
          ...filtered
            .filter((e) => number(e.fields.年代) !== undefined)
            .reverse(),
          ...filtered.filter((e) => number(e.fields.年代) === undefined),
        ]
      : filtered;
  const changeMembership = (entry: Entry) =>
    onOrder(
      included.has(entry.id)
        ? storyEvents.filter((e) => e.id !== entry.id).map((e) => e.id)
        : [...storyEvents.map((e) => e.id), entry.id],
    );
  function move(id: string, target: string) {
    const ids = storyEvents.map((e) => e.id),
      a = ids.indexOf(id),
      b = ids.indexOf(target);
    if (a < 0 || b < 0) return;
    [ids[a], ids[b]] = [ids[b], ids[a]];
    onOrder(ids);
  }
  let previousGroup = "";
  return (
    <section aria-label="時系列ボード">
      <div className="panel timeline-controls">
        <div className="library-tabs" aria-label="時系列の表示切替">
          <button
            className="button subtle"
            aria-pressed={mode === "chronology" || world}
            onClick={() => setMode("chronology")}
          >
            年代順の年表
          </button>
          {!world && (
            <button
              className="button subtle"
              aria-pressed={mode === "narrative"}
              onClick={() => setMode("narrative")}
            >
              ストーリーで描く順番
            </button>
          )}
        </div>
        <p>
          {mode === "narrative" && !world
            ? "回想や先の出来事も、読者に見せる順で並べます。年代や世界年表の順番は変わりません。世界観の事件は年代順の年表で「このストーリーに使う」を押して追加できます。"
            : "実際に起きた順番を表示します。世界観の事前情報とストーリー内の出来事を区別できます。年代未定は最後にまとめます。"}
        </p>
        <div className="timeline-filter-grid">
          <label>
            出来事の保存先
            <select
              aria-label="出来事の保存先"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="all">すべて</option>
              <option value="own">
                {world ? "この世界観の出来事" : "このストーリーの出来事"}
              </option>
              <option value="references">参照資料の出来事</option>
            </select>
          </label>
          <label>
            年代の確定状態
            <select
              aria-label="年代の確定状態"
              value={dates}
              onChange={(e) => setDates(e.target.value)}
            >
              <option value="all">すべて</option>
              <option value="known">年代あり</option>
              <option value="unknown">年代未定だけ</option>
            </select>
          </label>
          <label>
            開始年
            <input
              aria-label="開始年で絞り込み"
              type="number"
              step="any"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="指定なし"
            />
          </label>
          <label>
            終了年
            <input
              aria-label="終了年で絞り込み"
              type="number"
              step="any"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="指定なし"
            />
          </label>
          {mode === "chronology" && (
            <label>
              並び順
              <select
                aria-label="年代順の向き"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
              >
                <option value="asc">古い出来事から</option>
                <option value="desc">新しい出来事から</option>
              </select>
            </label>
          )}
        </div>
        {(from || to) && (
          <small>年の範囲を指定すると、年代未定の出来事は表示しません。</small>
        )}
        {number(from) !== undefined &&
          number(to) !== undefined &&
          number(from)! > number(to)! && (
            <p role="alert">開始年は終了年以前にしてください。</p>
          )}
        <p className="muted">
          表示 {ordered.length} 件 ／ 描く順番に登録済み{" "}
          {world ? "—" : storyEvents.length} 件
        </p>
      </div>
      {!ordered.length && (
        <div className="panel empty-state">
          <p>
            {mode === "narrative"
              ? "描く出来事がまだありません。年代順の年表から追加するか、このストーリーで出来事を作成してください。"
              : "この条件の出来事はありません。絞り込み条件を確認してください。"}
          </p>
        </div>
      )}
      <div className="timeline">
        {ordered.map((entry, index) => {
          const year = number(entry.fields.年代);
          const group =
            mode === "narrative" && !world
              ? "描く順番"
              : year === undefined
                ? "年代未定"
                : `${year}年`;
          const heading = previousGroup !== group;
          previousGroup = group;
          const owner = data.projects.find((p) => p.id === entry.projectId);
          return (
            <div className="timeline-group" key={entry.id}>
              {heading && <h3 className="timeline-group-heading">{group}</h3>}
              <div className="timeline-row">
                <div className="timeline-date">
                  <span>
                    {mode === "narrative" && !world
                      ? `${index + 1}番目`
                      : entry.fields.年代表記 ||
                        (year === undefined ? "年代未確定" : `${year} 年`)}
                  </span>
                  <small>
                    {[
                      entry.fields.月 && `${entry.fields.月}月`,
                      entry.fields.日 && `${entry.fields.日}日`,
                      entry.fields.時期,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </small>
                </div>
                <div className="timeline-line">
                  <i />
                </div>
                <CardSurface
                  className="timeline-card-wrap"
                  onActions={() => onActions(entry.id)}
                >
                  <button
                    className="panel timeline-card"
                    onClick={() => onOpen(entry.id)}
                  >
                    <div>
                      <span className="eyebrow">
                        {entry.projectId === projectId
                          ? world
                            ? "世界観の事前情報"
                            : "ストーリーの出来事"
                          : "参照資料"}{" "}
                        · {owner?.name}
                      </span>
                      <span>{entry.status}</span>
                    </div>
                    <h2>{entry.name}</h2>
                    {mode === "narrative" && (
                      <small>
                        実際の年代：
                        {entry.fields.年代表記 ||
                          (year === undefined ? "未定" : `${year}年`)}
                      </small>
                    )}
                    <p>{entry.body}</p>
                    <div className="tag-list">
                      {entry.links.map((id) => {
                        const item = data.entries.find((e) => e.id === id);
                        return item && <span key={id}>{item.name}</span>;
                      })}
                    </div>
                  </button>
                  <CardMenuButton
                    name={entry.name}
                    onClick={() => onActions(entry.id)}
                  />
                  {!world && !readOnly && (
                    <div className="timeline-story-actions">
                      {mode === "chronology" &&
                        entry.projectId !== projectId && (
                          <button
                            className="button subtle"
                            onClick={() => changeMembership(entry)}
                          >
                            {included.has(entry.id) ? (
                              <X size={15} />
                            ) : (
                              <Plus size={15} />
                            )}{" "}
                            {included.has(entry.id)
                              ? "描く順番から外す"
                              : "このストーリーに使う"}
                          </button>
                        )}
                      {mode === "narrative" && (
                        <>
                          <button
                            className="button subtle"
                            aria-label={`${entry.name}を前に移動`}
                            disabled={!index}
                            onClick={() =>
                              move(entry.id, ordered[index - 1].id)
                            }
                          >
                            <ArrowUp size={15} />
                            前へ
                          </button>
                          <button
                            className="button subtle"
                            aria-label={`${entry.name}を後に移動`}
                            disabled={index === ordered.length - 1}
                            onClick={() =>
                              move(entry.id, ordered[index + 1].id)
                            }
                          >
                            <ArrowDown size={15} />
                            後へ
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </CardSurface>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

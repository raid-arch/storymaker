import { useMemo, useState } from "react";
import type { Data } from "./model";
import { sharedProjectIds } from "./model";
import { studioOf } from "./studio/model";
export default function SceneTimelineGraph({
  data,
  projectId,
  onScene,
  onEvent,
}: {
  data: Data;
  projectId: string;
  onScene: (id: string) => void;
  onEvent: (id: string) => void;
}) {
  const [chapter, setChapter] = useState(""),
    [person, setPerson] = useState("");
  const studio = studioOf(data),
    scope = sharedProjectIds(data, projectId);
  const events = data.entries.filter(
    (e) => e.kind === "event" && scope.has(e.projectId),
  );
  const scenes = studio.scenes.filter(
    (s) =>
      s.projectId === projectId &&
      (!chapter || s.columnId === chapter) &&
      (!person ||
        s.povId === person ||
        s.castIds?.includes(person) ||
        s.links.includes(person)),
  );
  const year = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value)
      ? value
      : typeof value === "string" &&
          value.trim() &&
          Number.isFinite(Number(value))
        ? Number(value)
        : undefined;
  const rows = useMemo(() => {
    const years = [
      ...new Set(
        [
          ...events.map((e) => year(e.fields.年代)),
          ...scenes.map((s) => s.year),
        ].filter((y): y is number => y !== undefined),
      ),
    ].sort((a, b) => a - b);
    return [
      ...years,
      ...(events.some((e) => year(e.fields.年代) === undefined) ||
      scenes.some((s) => s.year === undefined)
        ? [undefined]
        : []),
    ];
  }, [events, scenes]);
  return (
    <section className="scene-time-graph" aria-label="世界と物語の時間軸グラフ">
      <h3>世界と物語を並べて見る</h3>
      <details className="time-graph-options">
        <summary>章・人物で絞り込む</summary>
        <div className="creation-field-grid">
          <label>
            グラフの章
            <select
              value={chapter}
              onChange={(e) => setChapter(e.target.value)}
            >
              <option value="">すべての章</option>
              {studio.columns
                .filter((c) => c.projectId === projectId)
                .map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            グラフの人物
            <select value={person} onChange={(e) => setPerson(e.target.value)}>
              <option value="">すべての人物</option>
              {data.entries
                .filter((e) => e.kind === "character" && scope.has(e.projectId))
                .map((e) => (
                  <option value={e.id} key={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </details>
      <p className="muted time-graph-caption">
        過去 ↓ 未来 · 同じ年を横並びに表示
      </p>
      <details className="time-graph-options">
        <summary>グラフの見方</summary>
        <p className="muted">
          上から過去→未来。同じ年は横に並びます。年の間隔は均等で、年代未定は最後に分けます。「翌朝」などの表記から年代を推測しません。
        </p>
      </details>
      <div className="time-graph-heading">
        <span>共通年</span>
        <strong>世界の出来事</strong>
        <strong>物語のシーン</strong>
      </div>
      {!rows.length && (
        <p className="time-graph-empty">
          まだ出来事やシーンがありません。世界観で歴史を作るか、物語にシーンを追加するとグラフに表示されます。
        </p>
      )}
      <div className="time-graph-rows">
        {rows.map((y) => (
          <div
            className={`time-graph-row ${y === undefined ? "time-unknown" : ""}`}
            key={y ?? "unknown"}
          >
            <div className="time-graph-year">
              {y === undefined ? "未定" : `${y}年`}
            </div>
            <div>
              {events
                .filter((e) => year(e.fields.年代) === y)
                .map((e) => (
                  <button key={e.id} onClick={() => onEvent(e.id)}>
                    <small>
                      {e.projectId === projectId ? "物語の事件" : "世界共通"}
                    </small>
                    <strong>{e.name}</strong>
                    {e.fields.日付 && <span>{e.fields.日付}</span>}
                  </button>
                ))}
            </div>
            <div>
              {scenes
                .filter((s) => s.year === y)
                .sort((a, b) => a.order - b.order)
                .map((s) => (
                  <button key={s.id} onClick={() => onScene(s.id)}>
                    <small>
                      {studio.columns.find((c) => c.id === s.columnId)?.name ||
                        "未分類"}
                    </small>
                    <strong>{s.name}</strong>
                    {s.timeText && <span>{s.timeText}</span>}
                    {s.eventId && (
                      <span className="time-event-link">
                        ↔{" "}
                        {events.find((e) => e.id === s.eventId)?.name ||
                          "関連する出来事"}
                      </span>
                    )}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

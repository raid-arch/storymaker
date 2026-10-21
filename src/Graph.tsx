import { useRef, useState } from "react";
import FreeTextInput from "./FreeTextInput";
import { Plus, Minus, Move, RotateCcw, X, Trash2 } from "lucide-react";
import {
  familyGenerations,
  relationTypes,
  fieldOptions,
  uniqueOptions,
  uid,
} from "./model";
import type { Data, Entry, Relation } from "./model";
export function RelationForm({
  data,
  projectId,
  initialFrom,
  onSave,
  onCancel,
  onRemove,
}: {
  data: Data;
  projectId: string;
  initialFrom?: string;
  onSave: (r: Relation) => void;
  onCancel: () => void;
  onRemove: (id: string) => void;
}) {
  const chars = data.entries.filter(
    (e) => e.projectId === projectId && e.kind === "character",
  );
  const [from, setFrom] = useState(initialFrom || chars[0]?.id || "");
  const [to, setTo] = useState("");
  const [type, setType] = useState<Relation["type"]>("親子");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [validFrom, setValidFrom] = useState<number | undefined>();
  const [validTo, setValidTo] = useState<number | undefined>();
  function submit() {
    if (
      validFrom !== undefined &&
      validTo !== undefined &&
      validFrom > validTo
    ) {
      setError("関係の開始年と終了年の前後を確認してください。");
      return;
    }
    const relationType = type.trim();
    if (!relationType) {
      setError("関係を記入してください。");
      return;
    }
    if (!from || !to || from === to) {
      setError("異なる二人の人物を選択してください。");
      return;
    }
    if (
      data.relations.some(
        (r) => r.from === from && r.to === to && r.type === relationType,
      )
    ) {
      setError("同じ関係が登録されています。");
      return;
    }
    if (relationType === "親子" || relationType === "養子") {
      const visited = new Set<string>();
      const visit = (id: string): boolean => {
        if (id === from) return true;
        if (visited.has(id)) return false;
        visited.add(id);
        return data.relations
          .filter((r) => r.from === id && ["親子", "養子"].includes(r.type))
          .some((r) => visit(r.to));
      };
      if (visit(to)) {
        setError("親子・養子関係が循環するため登録できません。");
        return;
      }
    }
    onSave({
      id: uid(),
      projectId,
      from,
      to,
      type: relationType,
      note,
      validFrom,
      validTo,
    });
    setTo("");
    setNote("");
    setError("");
  }
  return (
    <div className="relation-form">
      <div className="modal-heading">
        <div>
          <span className="eyebrow">CONNECT YOUR CHARACTERS</span>
          <h2>人物の関係をつなぐ</h2>
        </div>
        <button className="icon-button" aria-label="閉じる" onClick={onCancel}>
          <X size={20} />
        </button>
      </div>
      {chars.length < 2 ? (
        <p className="muted">同じ作品に二人以上の人物を登録してください。</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label>
            人物 A（親子・養子の場合は親）
            <select
              aria-label="人物 A（親子・養子の場合は親）"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            >
              {chars.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            関係
            <FreeTextInput
              label="関係"
              value={type}
              onChange={setType}
              suggestions={uniqueOptions([
                ...relationTypes,
                ...data.relations.map((r) => r.type),
              ])}
              placeholder="例：師弟、契約者、前世の縁"
              required
            />
            <small className="muted">
              「親子」「養子」は世代の自動配置に使います。それ以外の関係名も自由に登録できます。
            </small>
          </label>
          <label>
            人物 B（親子・養子の場合は子）
            <select
              aria-label="人物 B（親子・養子の場合は子）"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            >
              <option value="">人物を選択</option>
              {chars
                .filter((c) => c.id !== from)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              関係の開始年
              <input
                type="number"
                step="any"
                value={validFrom ?? ""}
                onChange={(event) =>
                  setValidFrom(
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                  )
                }
              />
            </label>
            <label>
              関係の終了年
              <input
                type="number"
                step="any"
                value={validTo ?? ""}
                onChange={(event) =>
                  setValidTo(
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value),
                  )
                }
              />
            </label>
          </div>
          <label>
            関係のメモ
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <button className="button primary full" type="submit">
            <Plus size={15} />
            関係を追加
          </button>
        </form>
      )}
      <h3 className="space-top">登録済みの関係</h3>
      <div className="relations-list">
        {data.relations
          .filter((r) => r.projectId === projectId)
          .map((r) => (
            <div className="relation-item" key={r.id}>
              <div>
                <span>{chars.find((c) => c.id === r.from)?.name}</span>
                <small>
                  {r.type} → {chars.find((c) => c.id === r.to)?.name}
                </small>
                {r.note && <small>{r.note}</small>}
              </div>
              <button
                className="icon-button danger"
                aria-label="関係を削除"
                onClick={() => onRemove(r.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
export function FamilyGraph({
  data,
  projectId,
  onOpen,
  onMove,
  onReset,
  onAutoLayout,
  onAdd,
  onRelation,
  readOnly = false,
}: {
  data: Data;
  readOnly?: boolean;
  projectId: string;
  onOpen: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onReset: () => void;
  onAutoLayout: () => void;
  onAdd: () => void;
  onRelation: () => void;
}) {
  const [zoom, setZoom] = useState(0.85);
  const [filter, setFilter] = useState("すべて");
  const [moving, setMoving] = useState(false);
  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    x: number;
    y: number;
    moved: boolean;
  } | null>(null);
  const all = data.entries.filter(
    (e) => e.projectId === projectId && e.kind === "character",
  );
  const chars = all.filter(
    (e) => filter === "すべて" || (e.fields.系統 || "").trim() === filter,
  );
  const relations = data.relations.filter(
    (r) =>
      r.projectId === projectId &&
      chars.some((e) => e.id === r.from) &&
      chars.some((e) => e.id === r.to),
  );
  const generations = familyGenerations(
    all,
    data.relations.filter((r) => r.projectId === projectId),
  );
  const sortedLevels = [...new Set(Object.values(generations))].sort(
    (a, b) => a - b,
  );
  const levels: Record<number, number> = {};
  const positions: Record<string, { x: number; y: number }> = {};
  for (const c of chars) {
    const gen = generations[c.id];
    const index = levels[gen] || 0;
    levels[gen] = index + 1;
    positions[c.id] = data.positions[c.id] || {
      x: 80 + index * 250,
      y: 90 + sortedLevels.indexOf(gen) * 200,
    };
  }
  const width = Math.max(
    1100,
    ...Object.values(positions).map((p) => p.x + 280),
  );
  const height = Math.max(
    560,
    ...Object.values(positions).map((p) => p.y + 210),
  );
  return (
    <>
      <div className="graph-toolbar">
        <div className="segmented">
          {["すべて", ...fieldOptions(data, "系統", ["本家", "分家"])].map(
            (f) => (
              <button
                key={f}
                className={f === filter ? "active" : ""}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ),
          )}
        </div>
        <div className="toolbar-actions">
          <button
            className="button subtle"
            disabled={readOnly}
            onClick={onAutoLayout}
          >
            血縁から自動配置
          </button>
          <button
            className={`button subtle ${moving ? "selected" : ""}`}
            disabled={readOnly}
            onClick={() => setMoving(!moving)}
          >
            <Move size={15} />
            {moving ? "移動を完了" : "配置を編集"}
          </button>
          <button
            className="button subtle"
            disabled={readOnly}
            onClick={onRelation}
          >
            <Plus size={15} />
            関係をつなぐ
          </button>
          <button
            className="button primary"
            disabled={readOnly}
            onClick={onAdd}
          >
            <Plus size={15} />
            人物を追加
          </button>
        </div>
      </div>
      <div className="graph-wrap panel">
        <div className="graph-hint">
          {moving
            ? "人物をドラッグして移動できます。位置は自動保存されます。"
            : "人物を選択すると詳細が開きます。横にスクロールして家系をたどれます。"}
        </div>
        <div className="graph-scroll">
          <div style={{ width: width * zoom, height: height * zoom }}>
            <div
              className="graph-canvas"
              style={{
                width,
                height,
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
            >
              <svg
                width={width}
                height={height}
                className="graph-lines"
                aria-hidden="true"
              >
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                  </marker>
                </defs>
                {relations.map((r, i) => {
                  const a = positions[r.from],
                    b = positions[r.to];
                  const vertical = ["親子", "養子"].includes(r.type);
                  const x1 = a.x + 100,
                    y1 = a.y + (vertical ? 104 : 52),
                    x2 = b.x + 100,
                    y2 = b.y + (vertical ? 0 : 52);
                  const middle = vertical
                    ? (y1 + y2) / 2
                    : Math.min(y1, y2) - 55 - i * 22;
                  return (
                    <g key={r.id} className={`edge edge-${r.type}`}>
                      <path
                        d={
                          vertical
                            ? `M${x1},${y1} C${x1},${middle} ${x2},${middle} ${x2},${y2}`
                            : `M${x1},${y1} C${x1},${middle} ${x2},${middle} ${x2},${y2}`
                        }
                        markerEnd={vertical ? "url(#arrow)" : undefined}
                      />
                      <text
                        x={(x1 + x2) / 2}
                        y={vertical ? middle - 6 : middle + 8}
                        textAnchor="middle"
                      >
                        {r.type}
                      </text>
                    </g>
                  );
                })}
              </svg>
              {chars.map((c: Entry) => (
                <button
                  key={c.id}
                  className={`graph-person ${c.fields.系統 === "分家" ? "branch" : ""} ${moving ? "movable" : ""}`}
                  style={{
                    left: positions[c.id].x,
                    top: positions[c.id].y,
                    touchAction: moving && !readOnly ? "none" : "auto",
                  }}
                  onPointerDown={(e) => {
                    if (!moving || readOnly) return;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    drag.current = {
                      id: c.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      ...positions[c.id],
                      moved: false,
                    };
                  }}
                  onPointerMove={(e) => {
                    const d = drag.current;
                    if (!d || d.id !== c.id) return;
                    const dx = (e.clientX - d.startX) / zoom,
                      dy = (e.clientY - d.startY) / zoom;
                    if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true;
                    if (d.moved)
                      onMove(
                        c.id,
                        Math.max(10, d.x + dx),
                        Math.max(40, d.y + dy),
                      );
                  }}
                  onPointerUp={(event) => {
                    const d = drag.current;
                    if (d && d.id === c.id) {
                      const dx = (event.clientX - d.startX) / zoom,
                        dy = (event.clientY - d.startY) / zoom;
                      if (Math.abs(dx) + Math.abs(dy) > 5)
                        onMove(
                          c.id,
                          Math.max(10, d.x + dx),
                          Math.max(40, d.y + dy),
                        );
                    }
                    drag.current = null;
                  }}
                  onPointerCancel={() => {
                    drag.current = null;
                  }}
                  onClick={() => {
                    if (!moving || readOnly) onOpen(c.id);
                  }}
                >
                  <div className="graph-person-top">
                    <span className="avatar small-avatar">
                      {c.image ? <img src={c.image} alt="" /> : c.name[0]}
                    </span>
                    <span className="branch-label">
                      {c.fields.系統 || "未設定"} / {generations[c.id] + 1}世代
                    </span>
                  </div>
                  <strong>{c.name}</strong>
                  <small>{c.subtitle || c.fields.役割 || "役割未設定"}</small>
                </button>
              ))}
              {!chars.length && (
                <div className="graph-empty">
                  人物がまだ登録されていません。
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="graph-controls">
          <button
            className="icon-button"
            aria-label="縮小"
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.1))}
          >
            <Minus size={16} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            className="icon-button"
            aria-label="拡大"
            onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))}
          >
            <Plus size={16} />
          </button>
          <i />
          <button
            className="text-button"
            disabled={readOnly}
            onClick={() => {
              setZoom(0.85);
              onReset();
            }}
          >
            <RotateCcw size={14} />
            配置を戻す
          </button>
        </div>
      </div>
      <div className="graph-legend">
        <span>
          <i className="line-solid" />
          親子
        </span>
        <span>
          <i className="line-dashed" />
          養子
        </span>
        <span>
          <i className="line-gold" />
          婚姻
        </span>
        <span>本家：緑の枠 / 分家：点線の枠</span>
      </div>
      <div className="panel graph-note">
        <span className="eyebrow">A FAMILY, A THOUSAND STORIES</span>
        <p>世代を越えて、つながりをたどる。</p>
        <small>
          人物の「世代」で縦の位置を指定できます。未設定の場合は親子関係から配置します。友人・敵対関係も同じ図で確認できます。
        </small>
      </div>
    </>
  );
}

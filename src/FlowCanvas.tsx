import { useEffect, useRef, useState } from "react";
import { sharedProjectIds } from "./model";
import type { Data } from "./model";
import { sid, editStudio, studioOf } from "./studio/model";
import type { FlowBoard, FlowNode } from "./flowModel";
import type { Confirm, Mutation } from "./studio/ui";
export default function FlowCanvas({
  data,
  projectId,
  change,
  confirm,
  onWrite,
  onEntry,
}: {
  data: Data;
  projectId: string;
  change: Mutation;
  confirm: Confirm;
  onWrite: (id: string) => void;
  onEntry: (id: string) => void;
}) {
  const boards = studioOf(data).boards.filter((b) => b.projectId === projectId),
    [boardId, setBoardId] = useState(""),
    [selected, setSelected] = useState(""),
    [connect, setConnect] = useState(""),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 20, y: 20 }),
    [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(
      null,
    );
  const activeDrag = useRef<{
      id: string;
      x: number;
      y: number;
      nx: number;
      ny: number;
      pointer: number;
    } | null>(null),
    viewport = useRef<HTMLDivElement>(null),
    board = boards.find((b) => b.id === boardId) || boards[0];
  const save = (fn: (b: FlowBoard) => FlowBoard) => {
    if (board)
      change(
        (d) =>
          editStudio(d, (s) => ({
            ...s,
            boards: s.boards.map((b) => (b.id === board.id ? fn(b) : b)),
          })),
        `flow:${board.id}`,
      );
  };
  const patch = (id: string, p: Partial<FlowNode>) =>
    save((b) => ({
      ...b,
      nodes: b.nodes.map((n) => (n.id === id ? { ...n, ...p } : n)),
    }));
  const createBoard = () => {
    const id = sid();
    change((d) =>
      editStudio(d, (s) => ({
        ...s,
        boards: [
          ...s.boards,
          {
            id,
            projectId,
            name: `シナリオ${boards.length + 1}`,
            nodes: [],
            edges: [],
            currentNodeId: "",
          },
        ],
      })),
    );
    setBoardId(id);
    setSelected("");
  };
  const add = (sceneId = "") => {
    if (!board) return;
    const scene = studioOf(data).scenes.find((s) => s.id === sceneId),
      id = sid();
    const node: FlowNode = {
      id,
      title: scene?.name || "新しいメモ",
      memo: scene?.summary || "",
      x: 80 + (board.nodes.length % 4) * 300,
      y: Math.min(90000, 80 + Math.floor(board.nodes.length / 4) * 240),
      color: "#a3b88b",
      collapsed: false,
      sceneId,
      entryId: "",
    };
    save((b) => ({ ...b, nodes: [...b.nodes, node] }));
    setSelected(id);
    setPan({ x: 30 - node.x * zoom, y: 30 - node.y * zoom });
  };
  const position = (n: FlowNode) => (drag?.id === n.id ? drag : n);
  const node = board?.nodes.find((n) => n.id === selected);
  const fit = () => {
    if (!board?.nodes.length) {
      setPan({ x: 20, y: 20 });
      setZoom(1);
      return;
    }
    const minX = Math.min(...board.nodes.map((n) => n.x)),
      minY = Math.min(...board.nodes.map((n) => n.y)),
      maxX = Math.max(...board.nodes.map((n) => n.x + 230)),
      maxY = Math.max(...board.nodes.map((n) => n.y + 180));
    const size = viewport.current?.getBoundingClientRect();
    const scale = Math.min(
      1,
      Math.max(
        0.01,
        Math.min(
          ((size?.width || 800) - 40) / (maxX - minX),
          ((size?.height || 600) - 40) / (maxY - minY),
        ),
      ),
    );
    setZoom(scale);
    setPan({ x: 20 - minX * scale, y: 20 - minY * scale });
  };
  const bounds = {
    x: Math.min(0, ...(board?.nodes.map((n) => n.x) || [])),
    y: Math.min(0, ...(board?.nodes.map((n) => n.y) || [])),
    right: Math.max(300, ...(board?.nodes.map((n) => n.x + 230) || [])),
    bottom: Math.max(180, ...(board?.nodes.map((n) => n.y + 180) || [])),
  };
  const zoomTo = (value: number) => {
    const next = Math.max(0.01, Math.min(2, value)),
      cx = (viewport.current?.clientWidth || 800) / 2,
      cy = (viewport.current?.clientHeight || 600) / 2;
    setPan({
      x: cx - ((cx - pan.x) * next) / zoom,
      y: cy - ((cy - pan.y) * next) / zoom,
    });
    setZoom(next);
  };
  useEffect(() => {
    fit();
  }, [board?.id]);
  return (
    <section className="flow-workspace" aria-label="シーンと設定の構成ボード">
      <div className="flow-tools">
        <select
          aria-label="構成ボードを選ぶ"
          value={board?.id || ""}
          onChange={(e) => {
            setBoardId(e.target.value);
            setSelected("");
            setPan({ x: 20, y: 20 });
          }}
        >
          <option value="" disabled>
            ボードを作成
          </option>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button className="button subtle" onClick={createBoard}>
          ＋ ボード
        </button>
        {board && (
          <>
            <button className="button primary" onClick={() => add()}>
              ＋ メモ
            </button>
            <select
              aria-label="ボードへシーンを追加"
              value=""
              onChange={(e) => {
                if (e.target.value) add(e.target.value);
              }}
            >
              <option value="">＋ シーンを配置</option>
              {studioOf(data)
                .scenes.filter((s) => s.projectId === projectId)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
            <button className="button subtle" onClick={fit}>
              全体を表示
            </button>
          </>
        )}
      </div>
      {!board ? (
        <div className="panel empty-state">
          <h2>シーンと設定を、線でつなぐ</h2>
          <p>
            メモやシーンを自由に配置し、分岐条件を書いた矢印で構成を整理できます。
          </p>
          <button className="button primary" onClick={createBoard}>
            最初のボードを作る
          </button>
        </div>
      ) : (
        <>
          <p className="flow-help">
            背景をドラッグして移動。カードの見出しをドラッグして配置。「接続」からつなぐカードを選びます。
            {connect && (
              <button className="button subtle" onClick={() => setConnect("")}>
                接続をキャンセル
              </button>
            )}
          </p>
          <div
            ref={viewport}
            className="flow-viewport"
            style={{
              backgroundPosition: `${pan.x}px ${pan.y}px`,
              backgroundSize: `${32 * zoom}px ${32 * zoom}px`,
            }}
            aria-label="構成キャンバス"
            onPointerDown={(e) => {
              if (e.target !== e.currentTarget) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              activeDrag.current = {
                id: "pan",
                x: e.clientX,
                y: e.clientY,
                nx: pan.x,
                ny: pan.y,
                pointer: e.pointerId,
              };
            }}
            onPointerMove={(e) => {
              const d = activeDrag.current;
              if (!d || d.pointer !== e.pointerId) return;
              if (d.id === "pan")
                setPan({
                  x: d.nx + e.clientX - d.x,
                  y: d.ny + e.clientY - d.y,
                });
              else
                setDrag({
                  id: d.id,
                  x: Math.max(
                    -10000,
                    Math.min(10000, d.nx + (e.clientX - d.x) / zoom),
                  ),
                  y: Math.max(
                    -10000,
                    Math.min(10000, d.ny + (e.clientY - d.y) / zoom),
                  ),
                });
            }}
            onPointerUp={() => {
              const d = activeDrag.current;
              if (d && d.id !== "pan" && drag)
                patch(d.id, { x: drag.x, y: drag.y });
              activeDrag.current = null;
              setDrag(null);
            }}
            onPointerCancel={() => {
              activeDrag.current = null;
              setDrag(null);
            }}
          >
            <div
              className="flow-plane"
              style={{
                transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
              }}
            >
              <svg className="flow-lines" width="20000" height="20000">
                <defs>
                  <marker
                    id="flow-arrow"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                  </marker>
                </defs>
                {board.edges.map((edge) => {
                  const a = board.nodes.find((n) => n.id === edge.from),
                    b = board.nodes.find((n) => n.id === edge.to);
                  if (!a || !b) return null;
                  const p = position(a),
                    q = position(b);
                  return (
                    <g key={edge.id}>
                      <path
                        d={`M${p.x + 230},${p.y + 40} C${p.x + 290},${p.y + 40} ${q.x - 60},${q.y + 40} ${q.x},${q.y + 40}`}
                        markerEnd="url(#flow-arrow)"
                      />
                      <text x={(p.x + 230 + q.x) / 2} y={(p.y + q.y) / 2 + 30}>
                        {edge.label || "接続"}
                      </text>
                    </g>
                  );
                })}
              </svg>
              {board.nodes.map((n) => {
                const p = position(n);
                return (
                  <article
                    key={n.id}
                    className={`flow-node ${selected === n.id ? "selected" : ""} ${board.currentNodeId === n.id ? "current" : ""}`}
                    style={{ left: p.x, top: p.y, borderLeftColor: n.color }}
                  >
                    <button
                      className="flow-node-handle"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.currentTarget.setPointerCapture(e.pointerId);
                        activeDrag.current = {
                          id: n.id,
                          x: e.clientX,
                          y: e.clientY,
                          nx: n.x,
                          ny: n.y,
                          pointer: e.pointerId,
                        };
                        setSelected(n.id);
                      }}
                      onClick={() => {
                        if (connect && connect !== n.id) {
                          save((b) => ({
                            ...b,
                            edges: [
                              ...b.edges,
                              { id: sid(), from: connect, to: n.id, label: "" },
                            ],
                          }));
                          setConnect("");
                        }
                        setSelected(n.id);
                      }}
                    >
                      {board.currentNodeId === n.id ? "● " : ""}
                      {n.title}
                    </button>
                    {!n.collapsed && <p>{n.memo || "メモを追加できます"}</p>}
                    <div>
                      <button
                        onClick={() => {
                          setSelected(n.id);
                          setConnect(n.id);
                        }}
                      >
                        接続
                      </button>
                      <button
                        onClick={() => patch(n.id, { collapsed: !n.collapsed })}
                      >
                        {n.collapsed ? "展開" : "折りたたむ"}
                      </button>
                      {n.sceneId &&
                        studioOf(data).scenes.some(
                          (s) => s.id === n.sceneId,
                        ) && (
                          <button onClick={() => onWrite(n.sceneId)}>
                            本文へ
                          </button>
                        )}
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="flow-zoom">
              <button
                aria-label="ボードを拡大"
                onClick={() => zoomTo(zoom + 0.1)}
              >
                ＋
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                aria-label="ボードを縮小"
                onClick={() => zoomTo(zoom - 0.1)}
              >
                −
              </button>
              <button aria-label="ボードを全体表示" onClick={fit}>
                全体
              </button>
            </div>
            <svg
              className="flow-minimap"
              viewBox="0 0 180 100"
              aria-label="ボードのミニマップ"
              onClick={fit}
            >
              {board.nodes.map((n) => (
                <rect
                  key={n.id}
                  x={((n.x - bounds.x) / (bounds.right - bounds.x)) * 165 + 5}
                  y={((n.y - bounds.y) / (bounds.bottom - bounds.y)) * 85 + 5}
                  width="8"
                  height="5"
                />
              ))}
            </svg>
          </div>
          <div className="flow-properties panel">
            <label>
              ボード名
              <input
                value={board.name}
                onChange={(e) => save((b) => ({ ...b, name: e.target.value }))}
              />
            </label>
            {node && (
              <>
                <label>
                  カード名
                  <input
                    value={node.title}
                    onChange={(e) => patch(node.id, { title: e.target.value })}
                  />
                </label>
                <label>
                  カードのメモ
                  <textarea
                    rows={4}
                    value={node.memo}
                    onChange={(e) => patch(node.id, { memo: e.target.value })}
                  />
                </label>
                <label>
                  カードの色
                  <input
                    type="color"
                    value={node.color}
                    onChange={(e) => patch(node.id, { color: e.target.value })}
                  />
                </label>
                <div className="creation-field-grid">
                  <label>
                    横位置
                    <input
                      type="number"
                      value={node.x}
                      onChange={(e) => {
                        if (Number.isFinite(Number(e.target.value)))
                          patch(node.id, {
                            x: Math.max(
                              -10000,
                              Math.min(10000, Number(e.target.value)),
                            ),
                          });
                      }}
                    />
                  </label>
                  <label>
                    縦位置
                    <input
                      type="number"
                      value={node.y}
                      onChange={(e) => {
                        if (Number.isFinite(Number(e.target.value)))
                          patch(node.id, {
                            y: Math.max(
                              -10000,
                              Math.min(10000, Number(e.target.value)),
                            ),
                          });
                      }}
                    />
                  </label>
                </div>
                <label>
                  関連する設定
                  <select
                    value={node.entryId}
                    onChange={(e) =>
                      patch(node.id, { entryId: e.target.value })
                    }
                  >
                    <option value="">設定なし</option>
                    {data.entries
                      .filter((e) =>
                        sharedProjectIds(data, projectId).has(e.projectId),
                      )
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                  </select>
                </label>
                {node.entryId && (
                  <button
                    className="button subtle"
                    onClick={() => onEntry(node.entryId)}
                  >
                    関連設定を開く
                  </button>
                )}
                <button
                  className="button subtle"
                  onClick={() =>
                    save((b) => ({ ...b, currentNodeId: node.id }))
                  }
                >
                  現在地にする
                </button>
                {board.edges
                  .filter((e) => e.from === node.id || e.to === node.id)
                  .map((edge) => (
                    <div className="flow-edge-edit" key={edge.id}>
                      <label>
                        分岐条件
                        <input
                          value={edge.label}
                          onChange={(e) =>
                            save((b) => ({
                              ...b,
                              edges: b.edges.map((x) =>
                                x.id === edge.id
                                  ? { ...x, label: e.target.value }
                                  : x,
                              ),
                            }))
                          }
                        />
                      </label>
                      <button
                        className="button subtle"
                        onClick={() =>
                          save((b) => ({
                            ...b,
                            edges: b.edges.filter((x) => x.id !== edge.id),
                          }))
                        }
                      >
                        線を外す
                      </button>
                    </div>
                  ))}
                <button
                  className="button subtle"
                  onClick={() =>
                    confirm({
                      title: "カードを削除しますか？",
                      message:
                        "このボードのカードと接続線を削除します。元のシーン・設定は残ります。",
                      action: () => {
                        save((b) => ({
                          ...b,
                          nodes: b.nodes.filter((x) => x.id !== node.id),
                          edges: b.edges.filter(
                            (e) => e.from !== node.id && e.to !== node.id,
                          ),
                          currentNodeId:
                            b.currentNodeId === node.id ? "" : b.currentNodeId,
                        }));
                        setSelected("");
                      },
                    })
                  }
                >
                  カードを削除
                </button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}

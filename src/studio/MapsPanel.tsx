import { sharedProjectIds } from "../model";
import { useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import Modal from "../Modal";
import { ImageInput } from "../Editors";
import FreeTextInput from "../FreeTextInput";
import {
  attachImage,
  collectAssets,
  editStudio,
  imageOf,
  putItem,
  sid,
  studioOf,
} from "./model";
import type { MapMarker, Point, Territory, WorldMap } from "./model";
import {
  boundedPoint,
  mapHeight,
  mapWidth,
  polygonArea,
  translated,
} from "./geometry";
import { Empty, EntrySelect, SaveCancel } from "./ui";
import type { StudioProps } from "./ui";
type Selection = { type: "marker" | "territory"; id: string };
export default function MapsPanel({
  data,
  projectId,
  focusId,
  change,
  confirm,
  notice,
  onOpen,
}: StudioProps) {
  const s = studioOf(data),
    maps = s.maps.filter((map) =>
      sharedProjectIds(data, projectId).has(map.projectId),
    );
  const [mapId, setMapId] = useState(
    maps.find((map) => map.id === focusId)?.id || maps[0]?.id || "",
  );
  const map = maps.find((item) => item.id === mapId) || maps[0];
  const [draft, setDraft] = useState<WorldMap | null>(null),
    [picture, setPicture] = useState("");
  const [mode, setMode] = useState<"view" | "select" | "place" | "territory">(
    "view",
  );
  const [selected, setSelected] = useState<Selection | null>(null);
  const [zoom, setZoom] = useState(1);
  const [points, setPoints] = useState<Point[]>([]),
    [territoryName, setTerritoryName] = useState("");
  const [preview, setPreview] = useState<{
    selected: Selection;
    dx: number;
    dy: number;
  } | null>(null);
  const canvas = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    selected: Selection;
    start: Point;
    points: Point[];
    moved: boolean;
  } | null>(null);
  const ignoreClick = useRef(false);
  const tap = useRef<Point | null>(null);
  const marker = map?.markers.find(
    (item) => selected?.type === "marker" && item.id === selected.id,
  );
  const territory = map?.territories.find(
    (item) => selected?.type === "territory" && item.id === selected.id,
  );
  const mutate = (fn: (map: WorldMap) => WorldMap) => {
    if (map)
      change(
        (d) =>
          editStudio(d, (s) => ({
            ...s,
            maps: s.maps.map((item) => (item.id === map.id ? fn(item) : item)),
          })),
        `map:${map.id}`,
      );
  };
  const position = (clientX: number, clientY: number): Point => {
    const matrix = canvas.current?.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    return boundedPoint(
      new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse()),
    );
  };
  const startDrag = (
    event: React.PointerEvent<SVGElement>,
    selection: Selection,
    initial: Point[],
  ) => {
    if (mode !== "select") return;
    event.stopPropagation();
    ignoreClick.current = false;
    setSelected(selection);
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      selected: selection,
      start: position(event.clientX, event.clientY),
      points: initial,
      moved: false,
    };
  };
  const shownPoints = (selection: Selection, original: Point[]) =>
    preview?.selected.id === selection.id &&
    preview.selected.type === selection.type
      ? translated(original, preview.dx, preview.dy)
      : original;
  const activate = (selection: Selection, entryId: string) => {
    if (ignoreClick.current) {
      ignoreClick.current = false;
      return;
    }
    if (mode === "view" && entryId) {
      onOpen(entryId);
      return;
    }
    if (mode === "view" || mode === "select") setSelected(selection);
  };
  return (
    <section className="studio-section">
      <h2>世界地図エディタ</h2>
      <p className="muted">
        下絵を読み込み、国家・都市・拠点を配置できます。領土は3点以上で囲みます。編集モードで地点や領土をドラッグでき、詳細欄からも位置を調整できます。
      </p>
      <div className="studio-actions">
        <button
          className="button primary"
          disabled={!projectId}
          onClick={() => {
            setPicture("");
            setDraft({
              id: sid(),
              projectId,
              name: "",
              imageId: "",
              markers: [],
              territories: [],
            });
          }}
        >
          地図を作成
        </button>
        {maps.length > 0 && (
          <select
            aria-label="表示する地図"
            value={map?.id || ""}
            onChange={(event) => {
              setMapId(event.target.value);
              setSelected(null);
              setPoints([]);
              setMode("view");
            }}
          >
            {maps.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        )}
        {map && (
          <button
            className="button subtle"
            onClick={() => {
              setDraft(structuredClone(map));
              setPicture(imageOf(data, map.imageId));
            }}
          >
            地図名・下絵を編集
          </button>
        )}
      </div>
      {!map ? (
        <Empty>
          地図を作成してください。下絵なしでも地点・領土を描けます。
        </Empty>
      ) : (
        <>
          <div className="map-toolbar panel">
            <button
              className={mode === "view" ? "button primary" : "button subtle"}
              onClick={() => {
                setMode("view");
                setPoints([]);
              }}
            >
              閲覧
            </button>
            <button
              className={mode === "select" ? "button primary" : "button subtle"}
              onClick={() => {
                setMode("select");
                setPoints([]);
              }}
            >
              配置を編集
            </button>
            <button
              className="button subtle"
              onClick={() => {
                ignoreClick.current = false;
                setMode("place");
                setPoints([]);
              }}
            >
              地点を置く
            </button>
            <button
              className="button subtle"
              onClick={() => {
                ignoreClick.current = false;
                setMode("territory");
                setPoints([]);
                setTerritoryName("");
              }}
            >
              領土を描く
            </button>
            <button
              className="icon-button"
              aria-label="地図を縮小"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            >
              <Minus size={17} />
            </button>
            <span>{Math.round(zoom * 100)}%</span>
            <button
              className="icon-button"
              aria-label="地図を拡大"
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            >
              <Plus size={17} />
            </button>
          </div>
          {mode === "place" && (
            <p className="studio-map-instruction" role="status">
              地図をタップすると地点を追加します。
            </p>
          )}
          {mode === "territory" && (
            <div className="panel studio-form">
              <label>
                描いている領土の名前
                <input
                  aria-label="描いている領土の名前"
                  value={territoryName}
                  onChange={(event) => setTerritoryName(event.target.value)}
                />
              </label>
              <p role="status">
                地図をタップして頂点を追加：{points.length} 点
              </p>
              <div className="studio-actions">
                <button
                  className="button primary"
                  disabled={points.length < 3 || !territoryName.trim()}
                  onClick={() => {
                    if (polygonArea(points) < 1) {
                      notice(
                        "一直線ではなく、面積のある領土を描いてください。",
                      );
                      return;
                    }
                    const territory: Territory = {
                      id: sid(),
                      name: territoryName.trim(),
                      entryId: "",
                      color: "#738c66",
                      points,
                    };
                    mutate((map) => ({
                      ...map,
                      territories: [...map.territories, territory],
                    }));
                    setSelected({ type: "territory", id: territory.id });
                    setPoints([]);
                    setMode("select");
                  }}
                >
                  領土を確定
                </button>
                <button
                  className="button subtle"
                  disabled={!points.length}
                  onClick={() => setPoints(points.slice(0, -1))}
                >
                  1点戻す
                </button>
                <button
                  className="button subtle"
                  onClick={() => {
                    setPoints([]);
                    setMode("select");
                  }}
                >
                  描画をキャンセル
                </button>
              </div>
            </div>
          )}
          <div className="map-viewport">
            <svg
              ref={canvas}
              className={`map-canvas ${mode === "view" ? "" : "editing"}`}
              style={{ width: `${zoom * 100}%` }}
              viewBox={`0 0 ${mapWidth} ${mapHeight}`}
              role="group"
              aria-label="世界地図キャンバス"
              onContextMenu={(event) => event.preventDefault()}
              onPointerDown={(event) => {
                if (mode === "place" || mode === "territory") {
                  tap.current = { x: event.clientX, y: event.clientY };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }
              }}
              onPointerMove={(event) => {
                const active = drag.current;
                if (!active) return;
                const point = position(event.clientX, event.clientY);
                const dx = point.x - active.start.x,
                  dy = point.y - active.start.y;
                if (Math.hypot(dx, dy) > 2) active.moved = true;
                setPreview({ selected: active.selected, dx, dy });
              }}
              onPointerUp={(event) => {
                const active = drag.current;
                if (active && active.moved) {
                  const end = position(event.clientX, event.clientY);
                  const next = translated(
                    active.points,
                    end.x - active.start.x,
                    end.y - active.start.y,
                  );
                  mutate((map) =>
                    active.selected.type === "marker"
                      ? {
                          ...map,
                          markers: map.markers.map((item) =>
                            item.id === active.selected.id
                              ? { ...item, ...next[0] }
                              : item,
                          ),
                        }
                      : {
                          ...map,
                          territories: map.territories.map((item) =>
                            item.id === active.selected.id
                              ? { ...item, points: next }
                              : item,
                          ),
                        },
                  );
                  ignoreClick.current = true;
                } else if (
                  tap.current &&
                  Math.hypot(
                    event.clientX - tap.current.x,
                    event.clientY - tap.current.y,
                  ) < 8
                ) {
                  const point = position(event.clientX, event.clientY);
                  if (mode === "place") {
                    const marker: MapMarker = {
                      id: sid(),
                      name: "新しい地点",
                      entryId: "",
                      type: "都市",
                      color: "#426a7a",
                      ...point,
                    };
                    mutate((map) => ({
                      ...map,
                      markers: [...map.markers, marker],
                    }));
                    setSelected({ type: "marker", id: marker.id });
                    setMode("select");
                  } else if (mode === "territory")
                    setPoints((current) => [...current, point]);
                }
                tap.current = null;
                drag.current = null;
                setPreview(null);
              }}
              onPointerCancel={() => {
                tap.current = null;
                drag.current = null;
                setPreview(null);
              }}
            >
              <rect width={mapWidth} height={mapHeight} fill="#f1eedf" />
              {Array.from({ length: 11 }, (_, i) => (
                <line
                  key={`x${i}`}
                  x1={i * 100}
                  x2={i * 100}
                  y1={0}
                  y2={mapHeight}
                  stroke="#d8ddc9"
                  strokeWidth="1"
                />
              ))}
              {Array.from({ length: 7 }, (_, i) => (
                <line
                  key={`y${i}`}
                  y1={i * 100}
                  y2={i * 100}
                  x1={0}
                  x2={mapWidth}
                  stroke="#d8ddc9"
                  strokeWidth="1"
                />
              ))}
              {imageOf(data, map.imageId) && (
                <image
                  href={imageOf(data, map.imageId)}
                  width={mapWidth}
                  height={mapHeight}
                  preserveAspectRatio="xMidYMid meet"
                />
              )}
              {map.territories.map((item) => (
                <polygon
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`領土：${item.name}`}
                  points={shownPoints(
                    { type: "territory", id: item.id },
                    item.points,
                  )
                    .map((p) => `${p.x},${p.y}`)
                    .join(" ")}
                  fill={item.color}
                  fillOpacity=".3"
                  stroke={selected?.id === item.id ? "#253e45" : item.color}
                  strokeWidth={selected?.id === item.id ? 4 : 2}
                  onPointerDown={(event) =>
                    startDrag(
                      event,
                      { type: "territory", id: item.id },
                      item.points,
                    )
                  }
                  onClick={(event) => {
                    if (mode === "view" || mode === "select") {
                      event.stopPropagation();
                      activate(
                        { type: "territory", id: item.id },
                        item.entryId,
                      );
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      activate(
                        { type: "territory", id: item.id },
                        item.entryId,
                      );
                    }
                  }}
                />
              ))}
              {map.markers.map((item) => {
                const point = shownPoints({ type: "marker", id: item.id }, [
                  item,
                ])[0];
                return (
                  <g
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`地点：${item.name}`}
                    transform={`translate(${point.x} ${point.y})`}
                    onPointerDown={(event) =>
                      startDrag(event, { type: "marker", id: item.id }, [item])
                    }
                    onClick={(event) => {
                      if (mode === "view" || mode === "select") {
                        event.stopPropagation();
                        activate({ type: "marker", id: item.id }, item.entryId);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        activate({ type: "marker", id: item.id }, item.entryId);
                      }
                    }}
                  >
                    <circle
                      className="map-marker-hit"
                      r="32"
                      fill="transparent"
                    />
                    <circle
                      className="map-marker-dot"
                      r={selected?.id === item.id ? 11 : 8}
                      fill={item.color}
                      stroke="#fff"
                      strokeWidth="3"
                    />
                    <text
                      x="15"
                      y="-14"
                      fontSize="18"
                      fill="#253e45"
                      stroke="#fff"
                      strokeWidth="4"
                      paintOrder="stroke"
                      style={{ pointerEvents: "none" }}
                    >
                      {item.name}
                    </text>
                  </g>
                );
              })}
              {points.length > 0 && (
                <>
                  <polyline
                    points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="#253e45"
                    strokeDasharray="7 4"
                    strokeWidth="3"
                  />
                  {points.map((point, index) => (
                    <circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r="6"
                      fill="#253e45"
                    />
                  ))}
                </>
              )}
            </svg>
          </div>
          <div className="studio-split">
            <div className="panel studio-form">
              <h3>地点・領土の一覧</h3>
              {!map.markers.length && !map.territories.length && (
                <p className="muted small">まだ配置されていません。</p>
              )}
              <div className="map-item-list">
                {map.markers.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected({ type: "marker", id: item.id })}
                  >
                    {item.type}：{item.name}
                  </button>
                ))}
                {map.territories.map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      setSelected({ type: "territory", id: item.id })
                    }
                  >
                    領土：{item.name}
                  </button>
                ))}
              </div>
              <button
                className="button danger-outline space-top"
                onClick={() =>
                  confirm({
                    title: "この地図を削除しますか？",
                    message:
                      "地図上の地点・領土も削除します。国家・都市などの設定自体は残ります。",
                    action: () => {
                      change((d) =>
                        editStudio(d, (s) =>
                          collectAssets({
                            ...s,
                            maps: s.maps.filter((item) => item.id !== map.id),
                          }),
                        ),
                      );
                      setSelected(null);
                      setMapId("");
                    },
                  })
                }
              >
                地図を削除
              </button>
            </div>
            <section className="panel studio-form">
              <h3>選択した地点・領土</h3>
              {!marker && !territory ? (
                <p className="muted">地図上か一覧から選んでください。</p>
              ) : (
                <>
                  <p className="muted small">
                    {mode === "view"
                      ? "変更する場合は「配置を編集」を選んでください。"
                      : "変更は自動保存されます。"}
                  </p>
                  <fieldset disabled={mode === "view"}>
                    <label>
                      {marker ? "地点の名前" : "領土の名前"}
                      <input
                        aria-label={marker ? "地点の名前" : "領土の名前"}
                        value={marker?.name ?? territory?.name ?? ""}
                        onChange={(event) =>
                          mutate((map) =>
                            marker
                              ? {
                                  ...map,
                                  markers: map.markers.map((item) =>
                                    item.id === marker.id
                                      ? { ...item, name: event.target.value }
                                      : item,
                                  ),
                                }
                              : {
                                  ...map,
                                  territories: map.territories.map((item) =>
                                    item.id === territory!.id
                                      ? { ...item, name: event.target.value }
                                      : item,
                                  ),
                                },
                          )
                        }
                      />
                    </label>
                    {marker && (
                      <>
                        <label>
                          地点の種類
                          <FreeTextInput
                            label="地点の種類"
                            value={marker.type}
                            onChange={(type) =>
                              mutate((map) => ({
                                ...map,
                                markers: map.markers.map((item) =>
                                  item.id === marker.id
                                    ? { ...item, type }
                                    : item,
                                ),
                              }))
                            }
                            suggestions={[
                              "国家",
                              "都市",
                              "拠点",
                              "建築",
                              "遺跡",
                            ]}
                          />
                        </label>
                        <div className="form-row">
                          {(["x", "y"] as const).map((key) => (
                            <label key={key}>
                              {key.toUpperCase()} 座標
                              <input
                                type="number"
                                aria-label={`地点の${key.toUpperCase()}座標`}
                                min={0}
                                max={key === "x" ? mapWidth : mapHeight}
                                value={Math.round(marker[key])}
                                onChange={(event) =>
                                  mutate((map) => ({
                                    ...map,
                                    markers: map.markers.map((item) =>
                                      item.id === marker.id
                                        ? {
                                            ...item,
                                            ...boundedPoint({
                                              ...item,
                                              [key]: Number(event.target.value),
                                            }),
                                          }
                                        : item,
                                    ),
                                  }))
                                }
                              />
                            </label>
                          ))}
                        </div>
                      </>
                    )}
                    <label>
                      表示色
                      <input
                        aria-label="地図の表示色"
                        type="color"
                        value={marker?.color || territory?.color || "#557755"}
                        onChange={(event) =>
                          mutate((map) =>
                            marker
                              ? {
                                  ...map,
                                  markers: map.markers.map((item) =>
                                    item.id === marker.id
                                      ? { ...item, color: event.target.value }
                                      : item,
                                  ),
                                }
                              : {
                                  ...map,
                                  territories: map.territories.map((item) =>
                                    item.id === territory!.id
                                      ? { ...item, color: event.target.value }
                                      : item,
                                  ),
                                },
                          )
                        }
                      />
                    </label>
                    <EntrySelect
                      data={data}
                      kind="world"
                      label="関連する国家・都市などの設定"
                      value={marker?.entryId || territory?.entryId || ""}
                      onChange={(entryId) =>
                        mutate((map) =>
                          marker
                            ? {
                                ...map,
                                markers: map.markers.map((item) =>
                                  item.id === marker.id
                                    ? { ...item, entryId }
                                    : item,
                                ),
                              }
                            : {
                                ...map,
                                territories: map.territories.map((item) =>
                                  item.id === territory!.id
                                    ? { ...item, entryId }
                                    : item,
                                ),
                              },
                        )
                      }
                    />
                    {territory && (
                      <>
                        <p className="muted small">
                          {territory.points.length}{" "}
                          点で囲まれた領土。ドラッグまたは下の操作で移動できます。
                        </p>
                        <div className="studio-actions">
                          {[
                            ["左へ", -10, 0],
                            ["右へ", 10, 0],
                            ["上へ", 0, -10],
                            ["下へ", 0, 10],
                          ].map(([label, dx, dy]) => (
                            <button
                              type="button"
                              className="button subtle"
                              key={label}
                              onClick={() =>
                                mutate((map) => ({
                                  ...map,
                                  territories: map.territories.map((item) =>
                                    item.id === territory.id
                                      ? {
                                          ...item,
                                          points: translated(
                                            item.points,
                                            Number(dx),
                                            Number(dy),
                                          ),
                                        }
                                      : item,
                                  ),
                                }))
                              }
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                    <button
                      className="button danger-outline space-top"
                      onClick={() =>
                        confirm({
                          title: marker
                            ? "この地点を削除しますか？"
                            : "この領土を削除しますか？",
                          message: "関連する世界観の設定は残ります。",
                          action: () => {
                            mutate((map) =>
                              marker
                                ? {
                                    ...map,
                                    markers: map.markers.filter(
                                      (item) => item.id !== marker.id,
                                    ),
                                  }
                                : {
                                    ...map,
                                    territories: map.territories.filter(
                                      (item) => item.id !== territory!.id,
                                    ),
                                  },
                            );
                            setSelected(null);
                          },
                        })
                      }
                    >
                      選択した配置を削除
                    </button>
                  </fieldset>
                  {(marker?.entryId || territory?.entryId) && (
                    <button
                      className="button subtle space-top"
                      onClick={() =>
                        onOpen(marker?.entryId || territory!.entryId)
                      }
                    >
                      関連設定を開く
                    </button>
                  )}
                </>
              )}
            </section>
          </div>
        </>
      )}
      {draft && (
        <Modal wide label="地図を編集" onClose={() => setDraft(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.name.trim()) return;
              change((d) =>
                editStudio(d, (s) => {
                  const attached = attachImage(s, picture);
                  return collectAssets({
                    ...attached.studio,
                    maps: putItem(s.maps, {
                      ...draft,
                      name: draft.name.trim(),
                      imageId: attached.imageId,
                    }),
                  });
                }),
              );
              setMapId(draft.id);
              setDraft(null);
              setMode("select");
              notice("地図を保存しました。");
            }}
          >
            <h2>地図名・下絵を編集</h2>
            <label>
              地図の名前
              <input
                required
                autoFocus
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </label>
            <ImageInput
              value={picture}
              onChange={setPicture}
              onError={notice}
            />
            <p className="muted small">
              下絵はなくても使えます。地点や領土の位置は地図ごとに保存します。
            </p>
            <SaveCancel onCancel={() => setDraft(null)} />
          </form>
        </Modal>
      )}
    </section>
  );
}

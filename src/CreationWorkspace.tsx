import EditorSplit from "./EditorSplit";
import SceneTimelineGraph from "./SceneTimelineGraph";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import {
  categoryOptions,
  isWorldLibrary,
  newEntry,
  referencedWorldIds,
  now,
  sharedProjectIds,
} from "./model";
import type { Data, Entry, Kind, Project } from "./model";
import { editStudio, putItem, sid, studioOf } from "./studio/model";
import type { Scene } from "./studio/model";
import {
  creationEntries,
  createSceneSetting,
  makeScene,
  orderedCreationScenes,
  patchScene,
  putPortrayal,
  sceneCast,
} from "./studio/creation";
import { saveTextFile } from "./native";
import { storyManuscript } from "./studio/creation";
import { moveScene } from "./studio/plot";
import type { Confirm, Mutation } from "./studio/ui";
import Modal from "./Modal";
import StoryPlanner from "./StoryPlanner";
import SettingGenrePicker, { matchesSettingGenre } from "./SettingGenrePicker";
import FreeTextInput from "./FreeTextInput";
import BaseWritingField from "./WritingField";
import type { ComponentProps } from "react";
const SaveContext = createContext("");
function WritingField(
  props: Omit<ComponentProps<typeof BaseWritingField>, "saveState">,
) {
  return <BaseWritingField {...props} saveState={useContext(SaveContext)} />;
}
interface Props {
  notice: (message: string) => void;
  saveState: string;
  data: Data;
  projectId: string;
  change: Mutation;
  confirm: Confirm;
  onOpen: (id: string) => void;
  onEditProject: () => void;
  onRelation: (id?: string) => void;
  onOverview: () => void;
  onStartStory: () => void;
  initialSceneId?: string;
  initialSection?: string;
  onSelectionChange?: (id: string) => void;
}
const text = (
  event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
) => event.target.value;
export default function CreationWorkspace(props: Props) {
  const project = props.data.projects.find((p) => p.id === props.projectId);
  if (!project)
    return (
      <section className="panel empty-state">
        <p>ストーリーまたは世界観を作成して始めましょう。</p>
      </section>
    );
  return (
    <SaveContext.Provider value={props.saveState}>
      {isWorldLibrary(project) ? (
        <WorldBuilder {...props} project={project} />
      ) : (
        <StoryMaker {...props} project={project} />
      )}
    </SaveContext.Provider>
  );
}
function StoryMaker({
  data,
  projectId,
  project,
  change,
  confirm,
  onOpen,
  onEditProject,
  onRelation,
  onOverview,
  initialSceneId,
  initialSection,
  notice,
}: Props & { project: Project }) {
  const entries = useMemo(
    () => creationEntries(data, projectId),
    [data.entries, data.projects, projectId],
  );
  const s = studioOf(data);
  const scenes = s.scenes.filter((item) => item.projectId === projectId);
  const columns = s.columns
    .filter((item) => item.projectId === projectId)
    .slice()
    .sort((a, b) => a.order - b.order);
  const initialPortrayal = (s.portrayals || []).find(
    (p) => p.id === initialSceneId,
  );
  const [tab, setTab] = useState(
      initialSection &&
        ["planning", "scenes", "cast", "references", "timeline"].includes(
          initialSection,
        )
        ? initialSection
        : initialPortrayal
          ? data.entries.find((e) => e.id === initialPortrayal.entryId)
              ?.kind === "character"
            ? "cast"
            : "references"
          : initialSceneId && scenes.some((item) => item.id === initialSceneId)
            ? "scenes"
            : (() => {
                try {
                  const saved = localStorage.getItem(
                    `tsuzuriniwa:workbench:${projectId}`,
                  );
                  return saved &&
                    [
                      "planning",
                      "scenes",
                      "cast",
                      "references",
                      "timeline",
                    ].includes(saved)
                    ? saved
                    : "planning";
                } catch {
                  return "planning";
                }
              })(),
    ),
    [sceneId, setSceneId] = useState(() => {
      let saved = "";
      try {
        saved = localStorage.getItem(`tsuzuriniwa:scene:${projectId}`) || "";
      } catch {}
      return (
        (scenes.some((item) => item.id === initialSceneId)
          ? initialSceneId
          : "") ||
        (scenes.some((item) => item.id === saved) ? saved : scenes[0]?.id || "")
      );
    }),
    [columnId, setColumnId] = useState(
      () => scenes.find((item) => item.id === sceneId)?.columnId || "",
    ),
    [chapterName, setChapterName] = useState(""),
    [personId, setPersonId] = useState(initialPortrayal?.entryId || ""),
    [referenceId, setReferenceId] = useState(initialPortrayal?.entryId || ""),
    [quick, setQuick] = useState<"character" | "world" | "event" | null>(null);
  useEffect(() => {
    if (sceneId) {
      try {
        localStorage.setItem(`tsuzuriniwa:scene:${projectId}`, sceneId);
      } catch {}
    }
  }, [projectId, sceneId]);
  useEffect(() => {
    try {
      localStorage.setItem(`tsuzuriniwa:workbench:${projectId}`, tab);
    } catch {}
  }, [projectId, tab]);
  const [detailRequested, setDetailRequested] = useState(
    Boolean(initialSceneId),
  );
  const [timelineView, setTimelineView] = useState("graph");
  const [chronological, setChronological] = useState(false);
  const [personQuery, setPersonQuery] = useState(""),
    [referenceQuery, setReferenceQuery] = useState(""),
    [referenceGenre, setReferenceGenre] = useState("");
  const scene = scenes.find((item) => item.id === sceneId);
  const cast = scene ? sceneCast(scene, data.entries) : [];
  const people = entries.filter((entry) => entry.kind === "character");
  const portrayals = (s.portrayals || []).filter(
    (item) => item.projectId === projectId,
  );
  const person = people.find((entry) => entry.id === personId) || people[0];
  const reference = entries.find(
    (entry) => entry.id === referenceId && entry.kind !== "character",
  );
  function update(patch: Partial<Scene>) {
    if (scene)
      change((d) => patchScene(d, scene.id, patch), `scene:${scene.id}`);
  }
  function addScene() {
    const item = makeScene(projectId, scene?.columnId || columnId, scenes);
    change((d) =>
      editStudio(d, (studio) => ({
        ...studio,
        scenes: [...studio.scenes, item],
      })),
    );
    setSceneId(item.id);
    setDetailRequested(true);
    setTab("scenes");
  }
  function selectCast(id: string, checked: boolean) {
    if (!scene) return;
    change((d) => {
      const current = studioOf(d).scenes.find((item) => item.id === scene.id)!;
      let next = patchScene(d, current.id, {
        castIds: checked
          ? [...new Set([...sceneCast(current, d.entries), id])]
          : sceneCast(current, d.entries).filter((value) => value !== id),
      });
      if (checked) next = putPortrayal(next, projectId, id);
      return next;
    }, `scene:${scene.id}`);
  }
  const names = (id?: string) =>
    data.entries.find((entry) => entry.id === id)?.name || "未設定";
  const chapters = [...columns, { id: "", name: "未分類" }];
  return (
    <section className="creation-workspace" aria-label="ストーリー制作画面">
      <header className="page-title">
        <div className="hero-content">
          <span className="eyebrow">STORY WORKSPACE</span>
          <h1>{project.name}</h1>
          <p>
            {project.description ||
              "章とシーンを組み立て、人物・舞台・時間をつなぎながら書く。"}
          </p>
        </div>
        <div className="page-actions">
          <button className="button subtle" onClick={onEditProject}>
            ストーリーを編集
          </button>
          <button className="button subtle" onClick={onOverview}>
            作品概要
          </button>
          <button
            className="button subtle"
            onClick={async () => {
              try {
                const filename = `${project.name.replace(/[\\/:*?"<>|]/g, "_") || "ストーリー"}-本文.md`;
                const saved = await saveTextFile(
                  storyManuscript(data, projectId),
                  "text/markdown;charset=utf-8",
                  filename,
                );
                notice(
                  saved
                    ? "本文をMarkdownで書き出しました。"
                    : "保存をキャンセルしました。",
                );
              } catch {
                notice("本文を書き出せませんでした。");
              }
            }}
          >
            本文を書き出す
          </button>
        </div>
      </header>
      <section
        className="creation-reference-strip"
        aria-label="ストーリーと参照資料"
      >
        <span>
          参照する世界観：
          {referencedWorldIds(data, project)
            .map((id) => data.projects.find((p) => p.id === id)?.name)
            .filter(Boolean)
            .join("、") || "未選択"}
        </span>
        <small>
          参照資料の設定：
          {entries.filter((entry) => entry.projectId !== projectId).length}件
        </small>
        <button className="text-button" onClick={onEditProject}>
          参照する世界観を変更
        </button>
      </section>
      <nav className="creation-tabs" aria-label="制作の作業切替">
        {[
          ["planning", "プロット設計"],
          ["scenes", "構成・執筆"],
          ["cast", "登場人物・関係"],
          ["references", "舞台・設定資料"],
          ["timeline", "シーンの時間軸"],
        ].map(([id, label]) => (
          <button
            className="button subtle"
            key={id}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="creation-summary">
        <span>{columns.length}章</span>
        <span>{scenes.length}シーン</span>
        <span>
          {
            portrayals.filter(
              (p) =>
                data.entries.find((e) => e.id === p.entryId)?.kind ===
                "character",
            ).length
          }
          人の登場人物
        </span>
        <small>編集内容は自動保存されます。</small>
      </div>
      {tab === "planning" && (
        <StoryPlanner
          data={data}
          project={project}
          change={change}
          onWrite={(id) => {
            setSceneId(id);
            setColumnId(
              studioOf(data).scenes.find((s) => s.id === id)?.columnId || "",
            );
            setDetailRequested(true);
            setTab("scenes");
          }}
          onCast={() => setTab("cast")}
          onTimeline={() => setTab("timeline")}
        />
      )}
      {tab === "scenes" && (
        <EditorSplit
          mode={data.appearance?.mobileEditor}
          selection={sceneId}
          label="シーン"
          initialDetail={detailRequested}
        >
          <aside className="panel creation-outline" aria-label="章とシーン">
            <form
              className="creation-inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!chapterName.trim()) return;
                const id = sid();
                change((d) =>
                  editStudio(d, (studio) => ({
                    ...studio,
                    columns: [
                      ...studio.columns,
                      {
                        id,
                        projectId,
                        name: chapterName.trim(),
                        chapterId: "",
                        order: columns.length,
                      },
                    ],
                  })),
                );
                setColumnId(id);
                setSceneId("");
                setChapterName("");
              }}
            >
              <label>
                章の名前
                <input
                  aria-label="追加する章の名前"
                  value={chapterName}
                  onChange={(e) => setChapterName(text(e))}
                  placeholder="第1章、序幕…"
                />
              </label>
              <button className="button subtle" type="submit">
                <Plus size={16} />
                章を追加
              </button>
            </form>
            <button className="button primary full" onClick={addScene}>
              <Plus size={16} />
              シーンを作成
            </button>
            {chapters.map((chapter) => {
              const members = scenes
                .filter(
                  (item) =>
                    item.columnId === chapter.id ||
                    (!chapter.id &&
                      !columns.some((c) => c.id === item.columnId)),
                )
                .slice()
                .sort((a, b) => a.order - b.order);
              return (
                <div className="creation-chapter" key={chapter.id}>
                  <button
                    className="text-button"
                    aria-pressed={columnId === chapter.id}
                    onClick={() => {
                      setColumnId(chapter.id);
                      setSceneId(members[0]?.id || "");
                    }}
                  >
                    <BookOpen size={15} />
                    {chapter.name}
                    <small>{members.length}</small>
                  </button>
                  {members.map((item) => (
                    <button
                      key={item.id}
                      className="creation-scene-link"
                      aria-current={scene?.id === item.id ? "page" : undefined}
                      onClick={() => {
                        setSceneId(item.id);
                        setColumnId(chapter.id);
                      }}
                    >
                      <strong>{item.name || "名前未設定"}</strong>
                      <small>
                        {item.status} · {item.manuscript?.length || 0}字
                      </small>
                    </button>
                  ))}
                </div>
              );
            })}
            {columnId && columns.some((c) => c.id === columnId) && (
              <details>
                <summary>章の編集</summary>
                <label>
                  章の名前
                  <input
                    value={columns.find((c) => c.id === columnId)?.name || ""}
                    onChange={(e) =>
                      change(
                        (d) =>
                          editStudio(d, (studio) => ({
                            ...studio,
                            columns: studio.columns.map((c) =>
                              c.id === columnId ? { ...c, name: text(e) } : c,
                            ),
                          })),
                        `chapter:${columnId}`,
                      )
                    }
                  />
                </label>
                <button
                  className="button danger-outline"
                  onClick={() =>
                    confirm({
                      title: "この章を削除しますか？",
                      message: "シーンは残し、未分類に移します。",
                      action: () => {
                        change((d) =>
                          editStudio(d, (studio) => ({
                            ...studio,
                            columns: studio.columns.filter(
                              (c) => c.id !== columnId,
                            ),
                            scenes: studio.scenes.map((item) =>
                              item.columnId === columnId
                                ? { ...item, columnId: "" }
                                : item,
                            ),
                          })),
                        );
                        setColumnId("");
                      },
                    })
                  }
                >
                  章を削除
                </button>
              </details>
            )}
          </aside>
          {scene ? (
            <div className="creation-scene-editor" key={scene.id}>
              <section className="panel creation-section">
                <div className="creation-heading">
                  <h2>シーンを書く</h2>
                  <button
                    className="button subtle"
                    onClick={() => setTab("planning")}
                  >
                    設計図へ戻る
                  </button>
                  <div className="creation-inline-actions">
                    {[-1, 1].map((offset) => {
                      const siblings = scenes
                        .filter((item) => item.columnId === scene.columnId)
                        .slice()
                        .sort((a, b) => a.order - b.order);
                      const index = siblings.findIndex(
                        (item) => item.id === scene.id,
                      );
                      return (
                        <button
                          className="icon-button"
                          key={offset}
                          aria-label={
                            offset < 0 ? "シーンを前へ" : "シーンを後へ"
                          }
                          disabled={
                            index + offset < 0 ||
                            index + offset >= siblings.length
                          }
                          onClick={() =>
                            change((d) =>
                              editStudio(d, (studio) => ({
                                ...studio,
                                scenes: moveScene(
                                  studio.scenes,
                                  scene.id,
                                  scene.columnId,
                                  index + offset,
                                ),
                              })),
                            )
                          }
                        >
                          {offset < 0 ? (
                            <ArrowUp size={16} />
                          ) : (
                            <ArrowDown size={16} />
                          )}
                        </button>
                      );
                    })}
                    <button
                      className="icon-button danger"
                      aria-label="このシーンを削除"
                      onClick={() =>
                        confirm({
                          title: "このシーンを削除しますか？",
                          message:
                            "本文も削除します。人物・世界観資料は残ります。操作は取り消せます。",
                          action: () => {
                            change((d) =>
                              editStudio(d, (studio) => ({
                                ...studio,
                                scenes: studio.scenes.filter(
                                  (item) => item.id !== scene.id,
                                ),
                                knowledge: studio.knowledge.map((k) =>
                                  k.sceneId === scene.id
                                    ? { ...k, sceneId: "" }
                                    : k,
                                ),
                              })),
                            );
                            setSceneId("");
                          },
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <label>
                  シーン名
                  <input
                    value={scene.name}
                    onChange={(e) => update({ name: text(e) })}
                  />
                </label>
                <div className="creation-field-grid">
                  <label>
                    章
                    <select
                      aria-label="制作シーンの章"
                      value={scene.columnId}
                      onChange={(e) => {
                        const target = e.target.value;
                        change((d) =>
                          editStudio(d, (studio) => ({
                            ...studio,
                            scenes: moveScene(
                              studio.scenes,
                              scene.id,
                              target,
                              studio.scenes.length,
                            ),
                          })),
                        );
                        setColumnId(target);
                      }}
                    >
                      {chapters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    進行状態
                    <FreeTextInput
                      label="執筆の進行状態"
                      value={scene.status}
                      onChange={(status) => update({ status })}
                      suggestions={["構想中", "執筆中", "推敲中", "完成"]}
                    />
                  </label>
                </div>
                {(scene.purpose ||
                  scene.conflict ||
                  scene.outcome ||
                  scene.povId) && (
                  <div
                    className="scene-writing-guide"
                    aria-label="執筆中のプロット参照"
                  >
                    <strong>この場面の設計</strong>
                    {scene.povId && <span>視点：{names(scene.povId)}</span>}
                    {scene.purpose && <p>目的：{scene.purpose}</p>}
                    {scene.conflict && <p>対立：{scene.conflict}</p>}
                    {scene.outcome && <p>変化：{scene.outcome}</p>}
                  </div>
                )}
                <WritingField
                  label="シーンの本文"
                  value={scene.manuscript || ""}
                  onChange={(manuscript) => update({ manuscript })}
                  rows={16}
                  placeholder="ここから物語を書き始める。構想中の断片でも、そのまま残せます。"
                />
                <details>
                  <summary>このシーンで起こすこと・制作メモ</summary>
                  <WritingField
                    label="シーンのあらすじ"
                    value={scene.summary}
                    onChange={(summary) => update({ summary })}
                    rows={4}
                  />
                  <WritingField
                    label="シーンの制作メモ"
                    value={scene.note}
                    onChange={(note) => update({ note })}
                    rows={4}
                  />
                </details>
              </section>
              <section className="panel creation-section">
                <h2>いつ・どこで</h2>
                <div className="creation-field-grid">
                  <label>
                    世界の事件・歴史
                    <select
                      aria-label="シーンが参照する事件"
                      value={scene.eventId || ""}
                      onChange={(e) => {
                        const event = entries.find(
                          (entry) => entry.id === e.target.value,
                        );
                        const year = event?.fields.年代?.trim();
                        update({
                          eventId: e.target.value,
                          ...(scene.year === undefined &&
                          year &&
                          Number.isFinite(Number(year))
                            ? { year: Number(year) }
                            : {}),
                        });
                      }}
                    >
                      <option value="">事件を指定しない</option>
                      {scene.eventId &&
                        !entries.some(
                          (entry) => entry.id === scene.eventId,
                        ) && (
                          <option value={scene.eventId}>
                            参照外：{names(scene.eventId)}
                          </option>
                        )}
                      {entries
                        .filter((e) => e.kind === "event")
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.name}
                            {e.fields.年代 ? `（${e.fields.年代}年）` : ""}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    共通年（任意）
                    <input
                      aria-label="制作シーンの共通年"
                      type="number"
                      step="any"
                      value={scene.year ?? ""}
                      onChange={(e) =>
                        update({
                          year: e.target.value.trim()
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                    />
                  </label>
                </div>
                {scene.eventId && (
                  <p className="creation-reference-note">
                    参照する大きな出来事：{names(scene.eventId)}
                    。以下の時点・描写はこのシーンだけに保存します。
                  </p>
                )}
                <label>
                  細かな時点・前後関係
                  <input
                    aria-label="細かな時点・前後関係"
                    value={scene.timeText || ""}
                    onChange={(e) => update({ timeText: text(e) })}
                    placeholder="103年4月2日 午前5時／戦闘の翌朝／前の場面から30分後"
                  />
                </label>
                <label>
                  舞台・場所
                  <select
                    aria-label="シーンの舞台"
                    value={scene.placeId || ""}
                    onChange={(e) => update({ placeId: e.target.value })}
                  >
                    <option value="">場所を指定しない</option>
                    {scene.placeId &&
                      !entries.some((entry) => entry.id === scene.placeId) && (
                        <option value={scene.placeId}>
                          参照外：{names(scene.placeId)}
                        </option>
                      )}
                    {entries
                      .filter((e) => e.kind === "world")
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} · {e.category || "設定"}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="creation-inline-actions">
                  <button
                    className="button subtle"
                    onClick={() => setQuick("world")}
                  >
                    ＋ 場所をその場で作る
                  </button>
                  <button
                    className="button subtle"
                    onClick={() => setQuick("event")}
                  >
                    ＋ 出来事をその場で作る
                  </button>
                </div>
                {scene.placeId && (
                  <WritingField
                    label="このシーンでの場所の状態"
                    value={scene.placeState || ""}
                    onChange={(placeState) => update({ placeState })}
                    rows={3}
                    placeholder="この場面では門が壊れている／雨が降り始める…"
                  />
                )}
                {scene.placeId && (
                  <LocalSetting
                    key={scene.placeId}
                    entry={data.entries.find((e) => e.id === scene.placeId)}
                    data={data}
                    projectId={projectId}
                    change={change}
                    onOpen={onOpen}
                    compact
                  />
                )}
              </section>
              <section className="panel creation-section">
                <div className="creation-heading">
                  <h2>誰が・どう動く</h2>
                  <button
                    className="button subtle"
                    onClick={() => setQuick("character")}
                  >
                    ＋ 人物をその場で作る
                  </button>
                </div>
                <p className="muted">
                  この場面に登場する人物を選びます。場面ごとの状態は元の人物設定を変更しません。
                </p>
                <label>
                  このシーンの人物を探す
                  <input
                    aria-label="このシーンの人物を探す"
                    value={personQuery}
                    onChange={(e) => setPersonQuery(text(e))}
                    placeholder="名前・タグで絞り込み"
                  />
                </label>
                <div className="creation-cast-picker">
                  {people
                    .filter((entry) =>
                      `${entry.name} ${entry.subtitle} ${entry.tags.join(" ")}`
                        .toLocaleLowerCase()
                        .includes(personQuery.trim().toLocaleLowerCase()),
                    )
                    .map((entry) => (
                      <label key={entry.id}>
                        <input
                          type="checkbox"
                          checked={cast.includes(entry.id)}
                          onChange={(e) =>
                            selectCast(entry.id, e.target.checked)
                          }
                        />
                        {entry.name}
                      </label>
                    ))}
                  {!people.length && (
                    <p>人物がまだいません。上のボタンから追加できます。</p>
                  )}
                </div>
                {cast.map((id) => (
                  <label key={id}>
                    {names(id)}：このシーンの状態・行動
                    <textarea
                      aria-label={`${names(id)}の場面での状態`}
                      rows={3}
                      value={scene.participantStates?.[id] || ""}
                      placeholder={
                        portrayals.find((p) => p.entryId === id)?.state ||
                        "負傷している／秘密を知る／まだ仲間を疑っている…"
                      }
                      onChange={(e) =>
                        update({
                          participantStates: {
                            ...scene.participantStates,
                            [id]: text(e),
                          },
                        })
                      }
                    />
                  </label>
                ))}
                <WritingField
                  label="このシーンでの人物関係の変化"
                  value={scene.relationshipNotes || ""}
                  onChange={(relationshipNotes) =>
                    update({ relationshipNotes })
                  }
                  rows={3}
                  placeholder="信頼が揺らぐ、ここで初めて敵対する…"
                />
              </section>
            </div>
          ) : (
            <div className="panel empty-state">
              <BookOpen size={32} />
              <h2>最初のシーンから始める</h2>
              <p>章を作ってからでも、場面を先に書いてからでも構いません。</p>
              <button className="button primary" onClick={addScene}>
                シーンを作成
              </button>
            </div>
          )}
        </EditorSplit>
      )}
      {tab === "cast" && (
        <EditorSplit
          mode={data.appearance?.mobileEditor}
          selection={person?.id || ""}
          label="人物"
          initialDetail={Boolean(initialSceneId)}
        >
          <aside className="panel creation-index">
            <h2>人物を選ぶ</h2>
            <label>
              登場人物を探す
              <input
                aria-label="登場人物を探す"
                value={personQuery}
                onChange={(e) => setPersonQuery(text(e))}
              />
            </label>
            {people
              .filter((entry) =>
                `${entry.name} ${entry.subtitle} ${entry.tags.join(" ")}`
                  .toLocaleLowerCase()
                  .includes(personQuery.trim().toLocaleLowerCase()),
              )
              .map((entry) => (
                <button
                  className="creation-person"
                  key={entry.id}
                  aria-current={person?.id === entry.id ? "page" : undefined}
                  onClick={() => setPersonId(entry.id)}
                >
                  {entry.image ? (
                    <img src={entry.image} alt="" />
                  ) : (
                    <span>{entry.name.slice(0, 1)}</span>
                  )}
                  <span>
                    <strong>{entry.name}</strong>
                    <small>
                      {portrayals.some((p) => p.entryId === entry.id)
                        ? "登場人物に設定済み"
                        : "参照できる人物"}
                    </small>
                  </span>
                </button>
              ))}
            {!people.length && (
              <p>
                シーンの「人物をその場で作る」か、人物管理から追加できます。
              </p>
            )}
          </aside>
          <div>
            {person && (
              <>
                <LocalSetting
                  key={person.id}
                  entry={person}
                  data={data}
                  projectId={projectId}
                  change={change}
                  onOpen={onOpen}
                />
                <section className="panel creation-section">
                  <div className="creation-heading">
                    <h2>{person.name}を中心にした関係</h2>
                    <button
                      className="button subtle"
                      onClick={() => onRelation(person.id)}
                    >
                      関係を追加・整理
                    </button>
                  </div>
                  <p className="muted">
                    親子以外にも友人・敵対・師弟・恋愛など、関係名を自由に記述できます。
                  </p>
                  {data.relations
                    .filter(
                      (r) =>
                        sharedProjectIds(data, projectId).has(r.projectId) &&
                        (r.from === person.id || r.to === person.id),
                    )
                    .map((r) => (
                      <div className="creation-relation" key={r.id}>
                        <strong>
                          {r.from === person.id ? names(r.to) : names(r.from)}
                        </strong>
                        <span>{r.type}</span>
                        <small>
                          {r.projectId === projectId
                            ? "このストーリーの関係"
                            : "世界観の関係"}
                        </small>
                        <p>{r.note}</p>
                      </div>
                    ))}
                </section>
              </>
            )}
          </div>
        </EditorSplit>
      )}
      {tab === "timeline" && (
        <section
          className="panel creation-section"
          aria-label="作品のシーン時間軸"
        >
          <h2>世界の出来事と、物語の細かな場面</h2>
          <div className="creation-inline-actions">
            <button
              className="button subtle"
              aria-pressed={timelineView === "graph"}
              onClick={() => setTimelineView("graph")}
            >
              グラフ
            </button>
            <button
              className="button subtle"
              aria-pressed={timelineView === "list"}
              onClick={() => setTimelineView("list")}
            >
              一覧
            </button>
          </div>
          {timelineView === "graph" && (
            <SceneTimelineGraph
              data={data}
              projectId={projectId}
              onScene={(id) => {
                const item = scenes.find((s) => s.id === id);
                if (item) {
                  setSceneId(id);
                  setColumnId(item.columnId);
                  setDetailRequested(true);
                  setTab("scenes");
                }
              }}
              onEvent={onOpen}
            />
          )}
          {timelineView === "list" && (
            <>
              <div className="creation-inline-actions">
                <button
                  className="button subtle"
                  aria-pressed={!chronological}
                  onClick={() => setChronological(false)}
                >
                  章・シーンの順番
                </button>
                <button
                  className="button subtle"
                  aria-pressed={chronological}
                  onClick={() => setChronological(true)}
                >
                  共通年の順番
                </button>
              </div>
              <p className="muted">
                共通年の順番では年代未定を最後に表示します。「翌朝」などの自由な時点表記は自動計算せず、同じ年は章・シーンの順番で並べます。
              </p>
              {!scenes.length && (
                <p>
                  シーンを作成し、世界の事件や細かな時点を設定すると、ここで全体を確認できます。
                </p>
              )}
              {orderedCreationScenes(data, projectId, chronological).map(
                (item) => (
                  <button
                    key={item.id}
                    className="creation-timeline-scene"
                    onClick={() => {
                      setSceneId(item.id);
                      setColumnId(item.columnId);
                      setDetailRequested(true);
                      setTab("scenes");
                    }}
                  >
                    <small>
                      {columns.find((column) => column.id === item.columnId)
                        ?.name || "未分類"}{" "}
                      · {item.status}
                    </small>
                    <strong>{item.name}</strong>
                    <span>
                      {item.year === undefined ? "年代未定" : `${item.year}年`}
                      {item.timeText ? ` · ${item.timeText}` : ""}
                    </span>
                    <small>
                      世界の出来事：{names(item.eventId)} ／ 舞台：
                      {names(item.placeId)}
                    </small>
                    <small>
                      登場人物：
                      {sceneCast(item, data.entries)
                        .map((id) => names(id))
                        .join("、") || "未設定"}
                    </small>
                  </button>
                ),
              )}
            </>
          )}
        </section>
      )}
      {tab === "references" && (
        <EditorSplit
          mode={data.appearance?.mobileEditor}
          selection={referenceId}
          label="資料"
          initialDetail={Boolean(initialSceneId)}
        >
          <aside className="panel creation-index">
            <h2>使える設定資料</h2>
            <SettingGenrePicker
              entries={entries.filter((e) => e.kind !== "character")}
              categories={categoryOptions(data)}
              value={referenceGenre}
              onChange={setReferenceGenre}
              label="参照資料のジャンル"
            />
            <label>
              資料を絞り込む
              <input
                aria-label="作品内の参照資料を探す"
                value={referenceQuery}
                onChange={(e) => setReferenceQuery(text(e))}
              />
            </label>
            {entries
              .filter(
                (e) =>
                  e.kind !== "character" &&
                  matchesSettingGenre(e, referenceGenre) &&
                  `${e.name} ${e.category} ${e.tags.join(" ")}`
                    .toLocaleLowerCase()
                    .includes(referenceQuery.trim().toLocaleLowerCase()),
              )
              .map((entry) => (
                <button
                  className="creation-scene-link"
                  key={entry.id}
                  aria-current={reference?.id === entry.id ? "page" : undefined}
                  onClick={() => setReferenceId(entry.id)}
                >
                  <strong>{entry.name}</strong>
                  <small>
                    {entry.category || entry.kind === "event"
                      ? entry.category || "事件・歴史"
                      : "設定"}
                  </small>
                </button>
              ))}
            <button className="button subtle" onClick={onEditProject}>
              参照する世界観を変更
            </button>
          </aside>
          {reference ? (
            <LocalSetting
              key={reference.id}
              entry={reference}
              data={data}
              projectId={projectId}
              change={change}
              onOpen={onOpen}
            />
          ) : (
            <div className="panel empty-state">
              <p>
                世界観の資料を選び、このストーリーでの使い方や変化を書き加えられます。
              </p>
            </div>
          )}
        </EditorSplit>
      )}
      {quick && scene && (
        <QuickSetting
          kind={quick}
          data={data}
          projectId={projectId}
          onClose={() => setQuick(null)}
          onCreate={(name, saveTo, category) => {
            change(
              (d) =>
                createSceneSetting(d, scene.id, saveTo, quick, name, category)
                  .data,
            );
            setQuick(null);
          }}
        />
      )}
    </section>
  );
}
function LocalSetting({
  entry,
  data,
  projectId,
  change,
  onOpen,
  compact = false,
}: {
  entry?: Entry;
  data: Data;
  projectId: string;
  change: Mutation;
  onOpen: (id: string) => void;
  compact?: boolean;
}) {
  if (!entry) return <p>参照先の設定がありません。</p>;
  const portrayal = (studioOf(data).portrayals || []).find(
    (p) => p.projectId === projectId && p.entryId === entry.id,
  );
  const person = entry.kind === "character";
  const patch = (values: Parameters<typeof putPortrayal>[3]) =>
    change(
      (d) => putPortrayal(d, projectId, entry.id, values),
      `portrayal:${projectId}:${entry.id}`,
    );
  return (
    <section
      className={compact ? "creation-local-setting" : "panel creation-section"}
      aria-label={`${entry.name}のストーリー設定`}
    >
      <h2>{entry.name}</h2>
      <details open={!compact}>
        <summary>元の設定を確認</summary>
        <p className="creation-base-text">
          {entry.body || entry.subtitle || "基本設定はまだありません。"}
        </p>
        {Object.entries(entry.fields)
          .filter(([, value]) => value)
          .map(([key, value]) => (
            <p key={key}>
              <strong>{key}：</strong>
              {value}
            </p>
          ))}
        <button className="text-button" onClick={() => onOpen(entry.id)}>
          元の設定の詳細を開く
        </button>
      </details>
      <p className="muted">
        以下はこのストーリーだけの設定です。元の資料やほかのストーリーには反映しません。
      </p>
      {person && !portrayal ? (
        <button className="button primary" onClick={() => patch({})}>
          <Users size={16} />
          登場人物に追加
        </button>
      ) : (
        <>
          <label>
            {person ? "このストーリーでの役割" : "このストーリーでの使い方"}
            <input
              value={portrayal?.role || ""}
              onChange={(e) => patch({ role: text(e) })}
            />
          </label>
          {person && (
            <label>
              目的・動機
              <textarea
                rows={3}
                value={portrayal?.goal || ""}
                onChange={(e) => patch({ goal: text(e) })}
              />
            </label>
          )}
          <WritingField
            label={
              person ? "このストーリーでの状態" : "このストーリーでの変化・状態"
            }
            value={portrayal?.state || ""}
            onChange={(state) => patch({ state })}
            rows={3}
            placeholder={
              person
                ? "年齢、立場、能力、傷病、秘密など"
                : "戦争で街が壊れている／この地域だけの症状など"
            }
          />
          <WritingField
            label="作品内での補足"
            value={portrayal?.notes || ""}
            onChange={(notes) => patch({ notes })}
            rows={3}
          />
          {(portrayal?.custom || []).map((field, index) => (
            <div className="creation-custom-field" key={index}>
              <label>
                作品固有の項目名
                <input
                  aria-label={`作品固有の項目${index + 1}の名前`}
                  value={field.name}
                  onChange={(event) =>
                    patch({
                      custom: (portrayal?.custom || []).map((item, i) =>
                        i === index ? { ...item, name: text(event) } : item,
                      ),
                    })
                  }
                />
              </label>
              <label>
                内容
                <textarea
                  aria-label={`作品固有の項目${index + 1}の内容`}
                  value={field.value}
                  rows={3}
                  onChange={(event) =>
                    patch({
                      custom: (portrayal?.custom || []).map((item, i) =>
                        i === index ? { ...item, value: text(event) } : item,
                      ),
                    })
                  }
                />
              </label>
            </div>
          ))}
          <button
            className="button subtle"
            onClick={() =>
              patch({
                custom: [...(portrayal?.custom || []), { name: "", value: "" }],
              })
            }
          >
            ＋ 作品固有の項目を追加
          </button>
        </>
      )}
    </section>
  );
}
function QuickSetting({
  kind,
  data,
  projectId,
  onClose,
  onCreate,
}: {
  kind: "character" | "world" | "event";
  data: Data;
  projectId: string;
  onClose: () => void;
  onCreate: (name: string, saveTo: string, category: string) => void;
}) {
  const [name, setName] = useState(""),
    [saveTo, setSaveTo] = useState(projectId),
    [category, setCategory] = useState(kind === "world" ? "場所" : "");
  return (
    <Modal label="シーン内で設定を作成" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onCreate(name, saveTo, category);
        }}
      >
        <h2>
          {kind === "character"
            ? "登場人物"
            : kind === "world"
              ? "舞台・場所"
              : "出来事"}
          を作成
        </h2>
        <label>
          名前
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => setName(text(e))}
          />
        </label>
        {kind === "world" && (
          <label>
            カテゴリ
            <FreeTextInput
              label="作成する場所のカテゴリ"
              value={category}
              onChange={setCategory}
              suggestions={categoryOptions(data)}
            />
          </label>
        )}
        <label>
          保存先
          <select value={saveTo} onChange={(e) => setSaveTo(e.target.value)}>
            {data.projects
              .filter((p) => sharedProjectIds(data, projectId).has(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.id === projectId ? "（この作品専用）" : "（共有資料）"}
                </option>
              ))}
          </select>
        </label>
        <p className="muted">
          この作品専用なら元の世界観は変わりません。共有資料を選ぶと、その資料を使うほかの作品でも参照できます。
        </p>
        <div className="creation-inline-actions">
          <button type="button" className="button subtle" onClick={onClose}>
            キャンセル
          </button>
          <button className="button primary" type="submit">
            作成してシーンに使う
          </button>
        </div>
      </form>
    </Modal>
  );
}
function WorldBuilder({
  data,
  projectId,
  project,
  change,
  onOpen,
  onEditProject,
  onOverview,
  onStartStory,
  onSelectionChange,
}: Props & { project: Project }) {
  const entries = useMemo(
    () => data.entries.filter((e) => e.projectId === projectId),
    [data.entries, projectId],
  );
  const [selectedId, setSelectedId] = useState(() => {
      try {
        const saved = localStorage.getItem(
          `tsuzuriniwa:world-setting:${projectId}`,
        );
        return entries.some((e) => e.id === saved) ? saved || "" : "";
      } catch {
        return "";
      }
    }),
    [query, setQuery] = useState(""),
    [genre, setGenre] = useState(""),
    [name, setName] = useState(""),
    [kind, setKind] = useState<Kind>("world"),
    [category, setCategory] = useState("国家・地域");
  useEffect(() => {
    if (selectedId) {
      try {
        localStorage.setItem(
          `tsuzuriniwa:world-setting:${projectId}`,
          selectedId,
        );
      } catch {}
    }
  }, [projectId, selectedId]);
  useEffect(() => {
    onSelectionChange?.(selectedId);
  }, [selectedId, onSelectionChange]);
  const selected = entries.find((e) => e.id === selectedId);
  const update = (entry: Entry) =>
    change(
      (d) => ({
        ...d,
        entries: d.entries.map((e) =>
          e.id === entry.id ? { ...entry, updatedAt: now() } : e,
        ),
      }),
      entry.id,
    );
  const presets: [string, Kind, string][] = [
    ["時間・暦", "world", "時間・暦"],
    ["世界の法則", "world", "基本設定"],
    ["人物", "character", ""],
    ["国", "world", "国家・地域"],
    ["街", "world", "都市・建築物"],
    ["村", "world", "村・集落"],
    ["病気", "world", "病気"],
    ["症候群", "world", "症候群"],
    ["歴史・戦争", "event", ""],
  ];
  return (
    <section className="creation-workspace" aria-label="世界観の制作画面">
      <header className="page-title">
        <div>
          <span className="eyebrow">WORLD BUILDING</span>
          <h1>{project.name}</h1>
          <p>人物、国、街、村、病気、歴史。その世界で成り立つものを作る。</p>
        </div>
        <div className="page-actions">
          <button className="button subtle" onClick={onEditProject}>
            世界観の名前・説明を編集
          </button>
          <button className="button subtle" onClick={onOverview}>
            世界観の概要
          </button>
          <button className="button primary" onClick={onStartStory}>
            この世界観を使うストーリーを作成
          </button>
        </div>
      </header>
      <EditorSplit
        mode={data.appearance?.mobileEditor}
        selection={selectedId}
        label="設定"
      >
        <aside className="panel creation-index">
          <SettingGenrePicker
            entries={entries}
            categories={categoryOptions(data)}
            value={genre}
            label="世界観の設定ジャンル"
            onChange={(next) => {
              setGenre(next);
              if (next.startsWith("world:")) {
                setKind("world");
                setCategory(next.slice(6));
              } else if (next.startsWith("kind:")) {
                setKind(next.slice(5) as Kind);
                setCategory("");
              }
            }}
            onAdd={(name) => {
              change((d) => ({
                ...d,
                categories: [...new Set([...d.categories, name])],
              }));
              setGenre(`world:${name}`);
              setKind("world");
              setCategory(name);
            }}
          />
          <form
            className="creation-new-setting"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              const entry = {
                ...newEntry(projectId, kind),
                name: name.trim(),
                category: kind === "world" ? category.trim() : "",
              };
              change((d) => ({ ...d, entries: [...d.entries, entry] }));
              setSelectedId(entry.id);
              setGenre(
                entry.kind === "world"
                  ? `world:${entry.category || "未分類"}`
                  : `kind:${entry.kind}`,
              );
              setQuery("");
              setName("");
            }}
          >
            <h2>設定を作成</h2>
            <div className="creation-presets">
              {presets.map(([label, k, c]) => (
                <button
                  type="button"
                  className="button subtle"
                  key={label}
                  aria-pressed={kind === k && category === c}
                  onClick={() => {
                    setKind(k);
                    setCategory(c);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <label>
              設定の種類
              <select
                aria-label="世界観で作成する設定の種類"
                value={kind}
                onChange={(e) => setKind(e.target.value as Kind)}
              >
                <option value="world">設定資料</option>
                <option value="character">人物</option>
                <option value="event">歴史・出来事</option>
                <option value="clue">秘密・謎</option>
              </select>
            </label>
            {kind === "world" && (
              <label>
                自由なカテゴリ
                <FreeTextInput
                  label="世界観制作のカテゴリ"
                  value={category}
                  onChange={setCategory}
                  suggestions={categoryOptions(data)}
                />
              </label>
            )}
            <label>
              名前
              <input
                aria-label="世界観で作成する設定の名前"
                required
                value={name}
                onChange={(e) => setName(text(e))}
                placeholder="名前をつけて作り始める"
              />
            </label>
            <button className="button primary full" type="submit">
              <Plus size={16} />
              設定を作成
            </button>
          </form>
          <label>
            資料を探す
            <input
              aria-label="制作画面で資料を探す"
              value={query}
              onChange={(e) => setQuery(text(e))}
            />
          </label>
          {!entries.some(
            (e) =>
              matchesSettingGenre(e, genre) &&
              `${e.name} ${e.category} ${e.tags.join(" ")} ${e.body}`
                .toLocaleLowerCase()
                .includes(query.trim().toLocaleLowerCase()),
          ) && (
            <p className="muted">
              このジャンル・検索条件の設定はまだありません。上の作成欄から追加できます。
            </p>
          )}
          {entries
            .filter(
              (e) =>
                matchesSettingGenre(e, genre) &&
                `${e.name} ${e.category} ${e.tags.join(" ")} ${e.body}`
                  .toLocaleLowerCase()
                  .includes(query.trim().toLocaleLowerCase()),
            )
            .map((entry) => (
              <button
                className="creation-scene-link"
                key={entry.id}
                aria-current={selected?.id === entry.id ? "page" : undefined}
                onClick={() => setSelectedId(entry.id)}
              >
                <strong>{entry.name}</strong>
                <small>
                  {entry.kind === "character"
                    ? "人物"
                    : entry.kind === "event"
                      ? "歴史・出来事"
                      : entry.category || "設定"}
                </small>
              </button>
            ))}
        </aside>
        {selected ? (
          <section className="panel creation-section" key={selected.id}>
            <h2>{selected.name || "名前未設定"}</h2>
            <label>
              設定の名前
              <input
                value={selected.name}
                onChange={(e) => update({ ...selected, name: text(e) })}
              />
            </label>
            {selected.kind === "world" && (
              <label>
                カテゴリ
                <FreeTextInput
                  label="選んだ資料のカテゴリ"
                  value={selected.category}
                  onChange={(category) => update({ ...selected, category })}
                  suggestions={categoryOptions(data)}
                />
              </label>
            )}
            <WritingField
              label="世界観の設定本文"
              value={selected.body}
              onChange={(body) => update({ ...selected, body })}
              rows={16}
              placeholder="この世界の事前情報を書きます。細かな項目は自由に追加できます。"
            />
            {selected.kind === "event" && (
              <label>
                共通年
                <input
                  type="number"
                  aria-label="世界観制作の共通年"
                  step="any"
                  value={selected.fields.年代 || ""}
                  onChange={(e) =>
                    update({
                      ...selected,
                      fields: { ...selected.fields, 年代: text(e) },
                    })
                  }
                />
              </label>
            )}
            <div className="creation-field-grid">
              {selected.custom.map((field, index) => (
                <div className="creation-custom-field" key={index}>
                  <input
                    aria-label={`資料の自由項目${index + 1}の名前`}
                    placeholder="項目名"
                    value={field.name}
                    onChange={(e) =>
                      update({
                        ...selected,
                        custom: selected.custom.map((f, i) =>
                          i === index ? { ...f, name: text(e) } : f,
                        ),
                      })
                    }
                  />
                  <textarea
                    aria-label={`資料の自由項目${index + 1}の内容`}
                    rows={3}
                    value={field.value}
                    onChange={(e) =>
                      update({
                        ...selected,
                        custom: selected.custom.map((f, i) =>
                          i === index ? { ...f, value: text(e) } : f,
                        ),
                      })
                    }
                  />
                </div>
              ))}
            </div>
            <button
              className="button subtle"
              onClick={() =>
                update({
                  ...selected,
                  custom: [...selected.custom, { name: "", value: "" }],
                })
              }
            >
              ＋ 自由な項目を追加
            </button>
            <button
              className="button subtle"
              onClick={() => onOpen(selected.id)}
            >
              画像・関連リンク・詳細を設定
            </button>
          </section>
        ) : (
          <div className="panel empty-state">
            <BookOpen size={34} />
            <h2>一つの設定から世界を作る</h2>
            <p>
              国からでも、一人の人物からでも始められます。カテゴリや項目は自由に増やせます。
            </p>
          </div>
        )}
      </EditorSplit>
    </section>
  );
}

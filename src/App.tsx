import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Sprout,
  LayoutDashboard,
  Users,
  BookOpen,
  GitFork,
  Clock3,
  Sparkles,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  ArrowUpRight,
  ArrowRight,
  Download,
  Upload,
  Settings2,
  Sun,
  Moon,
  ShieldCheck,
  Check,
  X,
  Menu,
  Undo2,
  FolderOpen,
  MoreHorizontal,
  FileText,
  Link2,
  Globe2,
  Flower2,
  Leaf,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  Trash2,
  Pencil,
  SlidersHorizontal,
  Palette,
  LayoutGrid,
  List,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { load, persist } from "./storage";
import {
  deleteEntry,
  deleteProject,
  descendants,
  kindLabels,
  markdown,
  newEntry,
  newProject,
  now,
  searchEntries,
  sortEvents,
  statusOptions,
  categoryOptions,
  fieldOptions,
  validateBackup,
} from "./model";
import type { Data, Entry, Kind, Project } from "./model";
import { EntryEditor, ProjectForm } from "./Editors";
import { FamilyGraph, RelationForm } from "./Graph";
import InstallApp from "./InstallApp";
import GitHubSync from "./GitHubSync";
import AppearanceSettings from "./AppearanceSettings";
import { defaultAppearance } from "./appearance";
import type { DashboardSection } from "./appearance";
type View =
  | "dashboard"
  | "character"
  | "world"
  | "family"
  | "event"
  | "clue"
  | "projects"
  | "settings";
const nav: { id: View; label: string; icon: LucideIcon; en: string }[] = [
  {
    id: "dashboard",
    label: "ダッシュボード",
    icon: LayoutDashboard,
    en: "OVERVIEW",
  },
  { id: "character", label: "キャラクター", icon: Users, en: "CHARACTERS" },
  {
    id: "world",
    label: "世界観データベース",
    icon: BookOpen,
    en: "WORLD ARCHIVE",
  },
  {
    id: "family",
    label: "家系図・人物相関図",
    icon: GitFork,
    en: "CONNECTIONS",
  },
  { id: "event", label: "年表", icon: Clock3, en: "TIMELINE" },
  { id: "clue", label: "伏線・謎", icon: Sparkles, en: "UNTOLD STORIES" },
];
const kindIcons: Record<Kind, LucideIcon> = {
  character: Users,
  world: BookOpen,
  event: Clock3,
  clue: Sparkles,
};
function download(content: string, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Botanical() {
  return (
    <svg
      className="botanical"
      viewBox="0 0 420 330"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="botanic"
          x1="80"
          x2="360"
          y1="20"
          y2="330"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#bdc99b" />
          <stop offset="1" stopColor="#536c50" />
        </linearGradient>
      </defs>
      <circle cx="243" cy="174" r="121" stroke="#8d9a6b" strokeOpacity=".13" />
      <circle cx="243" cy="174" r="145" stroke="#8d9a6b" strokeOpacity=".06" />
      <g stroke="url(#botanic)" strokeWidth="1.3" opacity=".7">
        <path d="M163 330C167 268 251 194 287 45M194 274C135 249 125 211 129 176M228 225C287 221 323 190 337 156M250 170C207 150 196 119 202 90M269 119C311 108 326 77 329 53" />
        <path
          d="M204 264C243 250 255 233 249 217 222 220 207 238 204 264ZM179 295C156 275 151 259 156 243 177 250 186 270 179 295ZM225 231C199 224 178 207 179 189 204 193 222 211 225 231ZM248 190C271 177 282 159 277 144 256 151 246 171 248 190ZM264 145C245 138 228 120 232 104 254 113 264 127 264 145ZM284 59C268 46 265 24 271 11 289 27 291 44 284 59ZM292 104C317 102 333 86 336 73 310 74 296 85 292 104ZM306 78C302 57 310 37 323 30 326 50 321 68 306 78ZM135 210C112 204 95 184 97 168 117 173 133 190 135 210ZM151 242C159 216 150 194 136 188 130 212 136 229 151 242ZM292 207C290 184 303 164 318 160 319 181 308 199 292 207ZM316 189C340 190 361 179 367 163 343 161 326 173 316 189ZM202 116C184 106 174 85 179 69 197 80 205 98 202 116ZM214 143C229 124 227 103 218 94 205 110 203 128 214 143Z"
          fill="#6c8059"
          fillOpacity=".12"
        />
        <path d="M336 156L346 129M346 129C328 133 321 120 325 110 340 109 349 116 346 129ZM346 129C355 112 372 111 379 119 373 132 357 137 346 129ZM346 129C348 111 339 99 329 99 321 110 330 123 346 129Z" />
        <path d="M202 90L197 57M197 57C180 63 169 53 171 43 187 38 199 44 197 57ZM197 57C204 39 219 34 230 41 227 54 212 62 197 57ZM197 57C196 39 184 28 175 31 170 44 182 55 197 57Z" />
        <circle cx="197" cy="57" r="3" fill="#b9bd87" />
        <circle cx="346" cy="129" r="3" fill="#b9bd87" />
      </g>
      <g fill="#c4cba9" opacity=".5">
        <circle cx="130" cy="80" r="1.5" />
        <circle cx="360" cy="230" r="1.5" />
        <circle cx="313" cy="280" r="2" />
        <circle cx="163" cy="150" r="1" />
        <circle cx="242" cy="37" r="1.5" />
      </g>
    </svg>
  );
}
function Modal({
  children,
  onClose,
  wide = false,
}: {
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const nodes = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not([type=hidden]),select,textarea,[tabindex="0"]',
          ) || [],
        ).filter((n) => n.getClientRects().length);
        if (!nodes.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.removeEventListener("keydown", key);
      prev?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="編集・確認"
      >
        {children}
      </div>
    </div>
  );
}
function Badge({ status }: { status: string }) {
  return (
    <span className={`status status-${status}`}>
      <i />
      {status || "未設定"}
    </span>
  );
}
function EntryCard({ entry, onOpen }: { entry: Entry; onOpen: () => void }) {
  const Icon = kindIcons[entry.kind];
  return (
    <button className={`entry-card panel kind-${entry.kind}`} onClick={onOpen}>
      <div className="card-top">
        <div className="card-symbol">
          {entry.image ? (
            <img src={entry.image} alt="" />
          ) : entry.kind === "character" ? (
            <span className="initial">{entry.name[0] || "人"}</span>
          ) : (
            <Icon size={21} strokeWidth={1.4} />
          )}
        </div>
        <Badge status={entry.status} />
      </div>
      <span className="card-eyebrow">
        {entry.kind === "character"
          ? entry.fields.一族 || "CHARACTER"
          : entry.kind === "clue"
            ? entry.fields.回収状況 || "未回収"
            : entry.category || kindLabels[entry.kind]}
      </span>
      <h3>{entry.name || "名前未設定"}</h3>
      <p>{entry.subtitle || entry.body || "まだ綴られていない設定"}</p>
      <div className="card-bottom">
        <div className="tag-list">
          {entry.tags.slice(0, 2).map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>
        <ArrowUpRight size={16} />
      </div>
    </button>
  );
}
export default function App() {
  const [data, setData] = useState<Data | null>(null),
    [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState("保存済み");
  const [saveError, setSaveError] = useState("");
  const saveQueue = useRef(Promise.resolve());
  const saveRevision = useRef(0);
  const history = useRef<Data[]>([]);
  const lastHistory = useRef({ id: "", at: 0 });
  const [projectId, setProjectId] = useState(""),
    [view, setView] = useState<View>("dashboard"),
    [entryId, setEntryId] = useState(""),
    [search, setSearch] = useState("");
  const [projectMenu, setProjectMenu] = useState(false),
    [mobileMenu, setMobileMenu] = useState(false),
    [quick, setQuick] = useState(false),
    [projectDraft, setProjectDraft] = useState<Project | null>(null),
    [projectNew, setProjectNew] = useState(false);
  const [newKind, setNewKind] = useState<Kind | null>(null),
    [newName, setNewName] = useState(""),
    [relationOpen, setRelationOpen] = useState(false);
  const [category, setCategory] = useState("すべて"),
    [statusFilter, setStatusFilter] = useState("すべて"),
    [timelineScope, setTimelineScope] = useState(""),
    [clueFilter, setClueFilter] = useState("すべて");
  const [categoryDraft, setCategoryDraft] = useState(""),
    [categoryOpen, setCategoryOpen] = useState(false);
  const [notice, setNotice] = useState(""),
    [confirm, setConfirm] = useState<{
      title: string;
      message: string;
      action: () => void;
      label?: string;
    } | null>(null);
  const [imported, setImported] = useState<Data | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error) {
      console.warn("オフライン登録:", error);
    },
  });
  useEffect(() => {
    let active = true;
    load()
      .then((d) => {
        if (active) {
          setData(d);
          setProjectId(d.projects[0]?.id || "");
        }
      })
      .catch((e) => active && setLoadError(String(e)));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    const preferences = data.appearance || defaultAppearance();
    root.dataset.theme = data.theme;
    root.dataset.accent = preferences.accent;
    root.dataset.font = preferences.font;
    root.dataset.density = preferences.density;
    root.dataset.layout = preferences.layout;
    root.style.setProperty(
      "--text-scale",
      String({ small: 1, medium: 1.1, large: 1.25 }[preferences.fontSize]),
    );
    const revision = ++saveRevision.current;
    setSaveState("保存中…");
    const timer = setTimeout(() => {
      saveQueue.current = saveQueue.current
        .catch(() => {})
        .then(() => persist(data))
        .then(() => {
          if (revision === saveRevision.current) {
            setSaveState("保存済み");
            setSaveError("");
          }
        })
        .catch((e) => {
          setSaveState("保存失敗");
          setSaveError(
            `保存できませんでした。ストレージ容量やブラウザの設定を確認し、JSONを書き出して保護してください。 (${e instanceof Error ? e.message : "不明なエラー"})`,
          );
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [data]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (saveState !== "保存済み") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [saveState]);
  useEffect(() => {
    const fn = () => setOnline(navigator.onLine);
    window.addEventListener("online", fn);
    window.addEventListener("offline", fn);
    return () => {
      window.removeEventListener("online", fn);
      window.removeEventListener("offline", fn);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  function change(fn: (d: Data) => Data, group = "") {
    if (!data) return;
    const t = Date.now();
    if (
      !group ||
      lastHistory.current.id !== group ||
      t - lastHistory.current.at > 1500
    ) {
      history.current = [...history.current.slice(-29), data];
    }
    lastHistory.current = { id: group, at: t };
    saveRevision.current += 1;
    setSaveState("保存中…");
    setData(fn(data));
  }
  function undo() {
    const prev = history.current.pop();
    if (prev) {
      saveRevision.current += 1;
      setSaveState("保存中…");
      setData(prev);
      lastHistory.current = { id: "", at: 0 };
      setNotice("直前の操作を取り消しました");
    }
  }
  function navigate(v: View) {
    setView(v);
    setEntryId("");
    setSearch("");
    setMobileMenu(false);
    setCategory("すべて");
    setStatusFilter("すべて");
    setTimelineScope("");
    setClueFilter("すべて");
    window.scrollTo({ top: 0 });
  }
  function open(id: string) {
    const e = data?.entries.find((x) => x.id === id);
    if (e) {
      setEntryId(id);
      setProjectId(e.projectId);
      setSearch("");
      setView(e.kind);
      window.scrollTo({ top: 0 });
    }
  }
  function selectProject(id: string) {
    setProjectId(id);
    navigate("dashboard");
    setProjectMenu(false);
  }
  function makeProject() {
    setProjectDraft(newProject());
    setProjectNew(true);
    setProjectMenu(false);
  }
  function quickEntry(kind: Kind) {
    if (!data?.projects.length) {
      setNotice("先にプロジェクトを作成してください。");
      makeProject();
      return;
    }
    setNewKind(kind);
    setNewName("");
    setQuick(false);
  }
  function backup() {
    if (!data) return;
    const stamp = now();
    download(
      JSON.stringify({ ...data, lastBackup: stamp }, null, 2),
      "application/json",
      `綴庭-backup-${stamp.slice(0, 10)}.json`,
    );
    change((d) => ({ ...d, lastBackup: stamp }));
    setNotice(
      "全プロジェクトのJSONを書き出しました。安全な場所に保管してください。",
    );
  }
  async function readBackup(file: File) {
    try {
      if (file.size > 100 * 1024 * 1024)
        throw new Error("100MB以下のバックアップを選択してください。");
      const raw = JSON.parse(await file.text());
      setImported(validateBackup(raw));
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "バックアップを読み込めませんでした。",
      );
    }
  }
  if (loadError)
    return (
      <div className="loading-screen">
        <AlertTriangle size={34} />
        <h1>データを読み込めませんでした</h1>
        <p>既存データを保護するため、初期データでの上書きは行っていません。</p>
        <p>{loadError}</p>
        <button className="button primary" onClick={() => location.reload()}>
          再読み込み
        </button>
      </div>
    );
  if (!data)
    return (
      <div className="loading-screen">
        <Sprout size={40} />
        <p>物語の庭をひらいています…</p>
      </div>
    );
  const project =
    data.projects.find((p) => p.id === projectId) || data.projects[0];
  const currentId = project?.id || "";
  const projectEntries = data.entries.filter((e) => e.projectId === currentId);
  const selected = data.entries.find((e) => e.id === entryId);
  const currentNav = nav.find((n) => n.id === view);
  const recent = [...projectEntries]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);
  const allSearch = searchEntries(data.entries, search);
  const searchProjects = data.projects.filter((p) =>
    [p.name, p.description, p.tags.join(" "), p.lore, p.truth]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const preferences = data.appearance || defaultAppearance();
  const customize = () => {
    navigate("settings");
    requestAnimationFrame(() => {
      const section = document.getElementById("appearance-settings");
      section?.scrollIntoView({ block: "start", behavior: "smooth" });
      section?.focus({ preventScroll: true });
    });
  };
  const homeSection = (id: DashboardSection) => ({
    "data-home-section": id,
    hidden: !preferences.dashboard.includes(id),
    style: { order: preferences.dashboard.indexOf(id) },
  });
  const updateEntry = (entry: Entry) =>
    change(
      (d) => ({
        ...d,
        entries: d.entries.map((e) =>
          e.id === entry.id ? { ...entry, updatedAt: now() } : e,
        ),
      }),
      entry.id,
    );
  const deleteSelected = () =>
    selected &&
    setConfirm({
      title: "この設定を削除しますか？",
      message: `「${selected.name}」と、この設定へのリンク・人物関係も削除されます。操作は取り消せます。`,
      action: () => {
        change((d) => deleteEntry(d, selected.id));
        setEntryId("");
        setNotice("設定を削除しました。取り消しボタンで戻せます。");
      },
    });
  const removeProject = (p: Project) =>
    setConfirm({
      title: "プロジェクトを削除しますか？",
      message: `「${p.name}」と下位の作品・章、すべての設定を削除します。必要に応じて先にバックアップしてください。操作は取り消せます。`,
      action: () => {
        change((d) => deleteProject(d, p.id));
        setProjectId("");
        setNotice("プロジェクトを削除しました。");
      },
    });
  function projectCrumb(p: Project): string {
    const parent = data?.projects.find((x) => x.id === p.parentId);
    return parent ? `${projectCrumb(parent)} / ${p.name}` : p.name;
  }
  function empty(kind: Kind) {
    return (
      <div className="empty-state panel">
        <Flower2 size={42} strokeWidth={1} />
        <h2>最初の{kindLabels[kind]}を綴りましょう</h2>
        <p>小さな設定から、物語の世界が広がります。</p>
        <button className="button primary" onClick={() => quickEntry(kind)}>
          <Plus size={16} />
          新しく追加
        </button>
      </div>
    );
  }
  const visible = searchEntries(
    projectEntries.filter((e) => e.kind === view),
    "",
  ).filter(
    (e) =>
      (category === "すべて" || e.category.trim() === category) &&
      (statusFilter === "すべて" || e.status.trim() === statusFilter) &&
      (clueFilter === "すべて" ||
        (e.fields.回収状況 || "").trim() === clueFilter),
  );
  const timeline = sortEvents(
    projectEntries.filter(
      (e) =>
        e.kind === "event" &&
        (!timelineScope || e.links.includes(timelineScope)) &&
        (statusFilter === "すべて" || e.status.trim() === statusFilter),
    ),
  );
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "mobile-open" : ""}`}>
        <a
          href="#"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("dashboard");
          }}
        >
          <span className="brand-mark">
            <Sprout size={26} strokeWidth={1.4} />
          </span>
          <span>
            綴庭<small>TSUZURINIWA</small>
          </span>
        </a>
        <div className="workspace-label">
          MY WORKSPACE<span>個人用</span>
        </div>
        <div className="project-switch-wrap">
          <button
            className="project-switch"
            onClick={() => setProjectMenu(!projectMenu)}
            aria-expanded={projectMenu}
          >
            <span className="project-icon">
              <BookOpen size={18} />
            </span>
            <span>
              <small>現在のプロジェクト</small>
              <strong>{project?.name || "プロジェクトを作成"}</strong>
            </span>
            <ChevronDown size={15} />
          </button>
          {projectMenu && (
            <div className="project-menu">
              {data.projects.map((p) => (
                <button key={p.id} onClick={() => selectProject(p.id)}>
                  <span>{p.name}</span>
                  {currentId === p.id && <Check size={14} />}
                </button>
              ))}
              <button onClick={makeProject}>
                <Plus size={15} />
                新規プロジェクト
              </button>
              <button
                onClick={() => {
                  navigate("projects");
                  setProjectMenu(false);
                }}
              >
                <FolderOpen size={15} />
                プロジェクトを管理
              </button>
            </div>
          )}
        </div>
        <div className="nav-label">物語のアトリエ</div>
        <nav className="main-nav" aria-label="メインナビゲーション">
          {nav.map((n) => (
            <button
              className={view === n.id && !search ? "active" : ""}
              key={n.id}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={18} strokeWidth={1.6} />
              <span>{n.label}</span>
              {["character", "world", "clue"].includes(n.id) && (
                <small>
                  {projectEntries.filter((e) => e.kind === n.id).length}
                </small>
              )}
            </button>
          ))}
        </nav>
        <button
          className="sidebar-add"
          onClick={() => {
            setQuick(true);
            setMobileMenu(false);
          }}
        >
          <Plus size={17} />
          クイック追加<span>＋</span>
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-thought">
            <Leaf size={19} strokeWidth={1.3} />
            <p>
              まだ見ぬ世界は、
              <br />
              あなたの一行から。
            </p>
          </div>
          <button
            className={view === "projects" ? "active" : ""}
            onClick={() => navigate("projects")}
          >
            <FolderOpen size={17} />
            プロジェクト管理
          </button>
          <button
            className={view === "settings" ? "active" : ""}
            onClick={() => navigate("settings")}
          >
            <Settings2 size={17} />
            設定・バックアップ
          </button>
          <div className="local-label">
            <span className="dot green" />
            あなたの端末だけに保存
            <ShieldCheck size={13} />
          </div>
        </div>
      </aside>
      {mobileMenu && (
        <div className="sidebar-scrim" onClick={() => setMobileMenu(false)} />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="メニューを開く"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <Menu size={20} />
            </button>
            <span>ワークスペース</span>
            <ChevronRight size={13} />
            <button onClick={() => navigate("dashboard")}>
              {project?.name || "綴庭"}
            </button>
          </div>
          <div className="top-actions">
            <div className="global-search">
              <Search size={15} />
              <input
                ref={searchRef}
                aria-label="すべての設定を検索"
                placeholder="世界の中を検索…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setEntryId("");
                }}
              />
              {search ? (
                <button
                  className="icon-button"
                  aria-label="検索をクリア"
                  onClick={() => setSearch("")}
                >
                  <X size={13} />
                </button>
              ) : (
                <kbd>⌘ K</kbd>
              )}
            </div>
            <span
              className={`save-indicator ${saveState === "保存失敗" ? "error-text" : ""}`}
              role="status"
            >
              {saveState === "保存済み" ? (
                <Check size={13} />
              ) : saveState === "保存失敗" ? (
                <AlertTriangle size={13} />
              ) : (
                <RefreshCw size={13} />
              )}
              <span>{saveState}</span>
            </span>
            <button
              className="icon-button"
              title="直前の操作を取り消す"
              aria-label="直前の操作を取り消す"
              disabled={!history.current.length}
              onClick={undo}
            >
              <Undo2 size={17} />
            </button>
            <button
              className="icon-button theme-toggle"
              aria-label={
                data.theme === "dark"
                  ? "ライトモードに切替"
                  : "ダークモードに切替"
              }
              onClick={() =>
                change((d) => ({
                  ...d,
                  theme: d.theme === "dark" ? "light" : "dark",
                }))
              }
            >
              {data.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <span className="profile">私</span>
          </div>
        </header>
        {saveError && (
          <div className="error-banner" role="alert">
            <AlertTriangle size={17} />
            <span>{saveError}</span>
            <button onClick={() => setData({ ...data })}>再試行</button>
            <button onClick={backup}>JSON書き出し</button>
          </div>
        )}
        {!online && (
          <div className="offline-banner">
            <WifiOff size={14} />
            オフラインで編集中 · 内容はこの端末に保存されます
          </div>
        )}
        {needRefresh && (
          <div className="offline-banner">
            <RefreshCw size={14} />
            新しいバージョンがあります。
            <button
              onClick={() => {
                if (saveState === "保存済み") void updateServiceWorker(true);
                else setNotice("保存が完了してから更新してください。");
              }}
            >
              更新する
            </button>
          </div>
        )}
        <InstallApp />
        <main className="main-content">
          <GitHubSync
            data={data}
            saveState={saveState}
            expanded={view === "settings" && !search && !selected}
            onOpen={() => navigate("settings")}
            onReplace={(incoming) => change(() => incoming)}
          />
          {search.trim() ? (
            <>
              <div className="page-title">
                <div>
                  <span className="eyebrow">SEARCH YOUR UNIVERSE</span>
                  <h1>「{search}」の検索結果</h1>
                  <p className="muted">
                    全プロジェクトから、本文・真相・自由項目・タグまで検索します。
                  </p>
                </div>
                <span className="count">
                  {allSearch.length + searchProjects.length} 件
                </span>
              </div>
              {searchProjects.length > 0 && (
                <section className="section">
                  <h2>プロジェクト</h2>
                  <div className="project-grid">
                    {searchProjects.map((p) => (
                      <button
                        className="panel search-project"
                        key={p.id}
                        onClick={() => selectProject(p.id)}
                      >
                        <BookOpen size={20} />
                        <span>
                          {p.name}
                          <small>{p.description}</small>
                        </span>
                        <ArrowRight size={17} />
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <div className="card-grid">
                {allSearch.map((e) => (
                  <EntryCard key={e.id} entry={e} onOpen={() => open(e.id)} />
                ))}
              </div>
              {!allSearch.length && !searchProjects.length && (
                <div className="empty-state">
                  <Search size={35} />
                  <h2>見つかりませんでした</h2>
                  <p>別のキーワードや #タグ をお試しください。</p>
                </div>
              )}
            </>
          ) : selected ? (
            <EntryEditor
              key={selected.id}
              entry={selected}
              data={data}
              onChange={updateEntry}
              onBack={() => setEntryId("")}
              onOpen={open}
              onDelete={deleteSelected}
              onError={setNotice}
              onRelation={() => setRelationOpen(true)}
            />
          ) : (
            <>
              {view === "dashboard" && (
                <>
                  <div className="page-title dashboard-title">
                    <div>
                      <span className="eyebrow">YOUR STORY, YOUR UNIVERSE</span>
                      <h1>物語の庭へ、おかえりなさい。</h1>
                      <p>ひとつひとつの設定が、あなたの世界をつくっていく。</p>
                    </div>
                    <div className="page-actions">
                      <button className="button subtle" onClick={customize}>
                        <Palette size={16} />
                        カスタマイズ
                      </button>
                      <button
                        className="button primary"
                        onClick={() => setQuick(true)}
                      >
                        <Plus size={17} />
                        新しい設定<span className="desktop-only">を追加</span>
                      </button>
                    </div>
                  </div>
                  {project ? (
                    <div className="dashboard-content">
                      <section
                        className="project-hero"
                        {...homeSection("hero")}
                      >
                        <div className="hero-content">
                          <span className="hero-kicker">
                            <i />
                            いま、育てている物語<span>{project.type}</span>
                          </span>
                          <h2>{project.name}</h2>
                          <p>
                            {project.description ||
                              "この物語の最初の一行を、ここから。"}
                          </p>
                          <div className="hero-tags">
                            {project.tags.map((t) => (
                              <span key={t}>{t}</span>
                            ))}
                            <Badge status={project.status} />
                          </div>
                          <button
                            className="hero-link"
                            onClick={() => {
                              setProjectDraft({ ...project });
                              setProjectNew(false);
                            }}
                          >
                            プロジェクトを編集
                            <ArrowRight size={15} />
                          </button>
                        </div>
                        {project.image ? (
                          <img
                            className="hero-image"
                            src={project.image}
                            alt="作品イメージ"
                          />
                        ) : (
                          <Botanical />
                        )}
                        <span className="hero-corner">
                          EVERY WORLD BEGINS WITH A SEED.
                        </span>
                      </section>
                      <div className="stats-grid" {...homeSection("stats")}>
                        {(
                          [
                            {
                              kind: "character",
                              label: "キャラクター",
                              caption: "この世界を生きる人々",
                              icon: Users,
                            },
                            {
                              kind: "world",
                              label: "世界観の設定",
                              caption: "物語を支えるかけら",
                              icon: Globe2,
                            },
                            {
                              kind: "event",
                              label: "年表の出来事",
                              caption: "積み重なっていく歴史",
                              icon: Clock3,
                            },
                            {
                              kind: "clue",
                              label: "未回収の伏線",
                              caption: "まだ語られない秘密",
                              icon: Sparkles,
                            },
                          ] as {
                            kind: Kind;
                            label: string;
                            caption: string;
                            icon: LucideIcon;
                          }[]
                        ).map((s) => (
                          <button
                            key={s.kind}
                            className={`stat-card panel stat-${s.kind}`}
                            onClick={() => navigate(s.kind)}
                          >
                            <div className="stat-header">
                              <span className="stat-icon">
                                <s.icon size={19} strokeWidth={1.5} />
                              </span>
                              <ArrowUpRight size={15} />
                            </div>
                            <div className="stat-number">
                              {
                                projectEntries.filter(
                                  (e) =>
                                    e.kind === s.kind &&
                                    (s.kind !== "clue" ||
                                      e.fields.回収状況 !== "回収済み"),
                                ).length
                              }
                              <span>{s.label}</span>
                            </div>
                            <small>{s.caption}</small>
                          </button>
                        ))}
                      </div>
                      <section className="section" {...homeSection("recent")}>
                        <div className="section-heading">
                          <h2>
                            <span className="section-mark" />
                            最近綴った設定
                            <span className="section-en">RECENT NOTES</span>
                          </h2>
                          <button
                            className="text-button"
                            onClick={() => navigate("world")}
                          >
                            世界観をひらく
                            <ArrowRight size={14} />
                          </button>
                        </div>
                        {recent.length ? (
                          <div className="card-grid recent-grid">
                            {recent.map((e) => (
                              <EntryCard
                                entry={e}
                                key={e.id}
                                onOpen={() => open(e.id)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="empty-state panel">
                            <p>
                              まだ設定がありません。最初のひとつを追加しましょう。
                            </p>
                            <button
                              className="button subtle"
                              onClick={() => setQuick(true)}
                            >
                              <Plus size={15} />
                              設定を追加
                            </button>
                          </div>
                        )}
                      </section>
                      <div className="dashboard-bottom">
                        <section
                          className="panel story-thread"
                          {...homeSection("mysteries")}
                        >
                          <div className="section-heading">
                            <h2>
                              <Sparkles size={17} />
                              物語に残る問い
                            </h2>
                            <button
                              className="icon-button"
                              aria-label="伏線・謎を開く"
                              onClick={() => navigate("clue")}
                            >
                              <ArrowUpRight size={16} />
                            </button>
                          </div>
                          {projectEntries
                            .filter(
                              (e) =>
                                e.kind === "clue" &&
                                e.fields.回収状況 !== "回収済み",
                            )
                            .slice(0, 2)
                            .map((e) => (
                              <button
                                className="thread-row"
                                key={e.id}
                                onClick={() => open(e.id)}
                              >
                                <span className="thread-dot" />
                                <span>
                                  <strong>{e.name}</strong>
                                  <small>{e.subtitle || e.body}</small>
                                </span>
                                <span className="chip gold-chip">
                                  {e.fields.回収状況 || "未回収"}
                                </span>
                              </button>
                            ))}
                          {!projectEntries.some((e) => e.kind === "clue") && (
                            <p className="muted small">
                              謎を残して、物語の先へ。
                            </p>
                          )}
                        </section>
                        <section
                          className="panel backup-callout"
                          {...homeSection("backup")}
                        >
                          <div className="backup-icon">
                            <ShieldCheck size={26} strokeWidth={1.3} />
                          </div>
                          <div>
                            <h3>大切な世界に、もうひとつの居場所を。</h3>
                            <p>
                              データはこのブラウザに保存されています。
                              <br />
                              ときどきバックアップしておきましょう。
                            </p>
                            <button className="text-button" onClick={backup}>
                              JSONバックアップ
                              <Download size={13} />
                            </button>
                          </div>
                        </section>
                      </div>
                      {!preferences.dashboard.length && (
                        <div className="empty-state panel">
                          <Palette size={32} />
                          <p>ホーム画面の項目はすべて非表示になっています。</p>
                          <button className="button subtle" onClick={customize}>
                            表示項目を選ぶ
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="empty-state panel">
                      <Sprout size={45} />
                      <h2>あなたの物語を、ここから。</h2>
                      <p>最初のプロジェクトを作成しましょう。</p>
                      <button className="button primary" onClick={makeProject}>
                        <Plus size={16} />
                        プロジェクトを作成
                      </button>
                    </div>
                  )}
                  <footer className="page-footer">
                    <Sprout size={13} />
                    <span>あなただけの世界を、ゆっくりと。</span>
                    <span>LOCAL FIRST · PRIVATE ALWAYS</span>
                  </footer>
                </>
              )}
              {["character", "world", "clue", "event", "family"].includes(
                view,
              ) && (
                <>
                  <div className="page-title">
                    <div>
                      <span className="eyebrow">{currentNav?.en}</span>
                      <h1>
                        {currentNav?.label}
                        <span className="title-count">
                          {view === "family"
                            ? projectEntries.filter(
                                (e) => e.kind === "character",
                              ).length
                            : projectEntries.filter((e) => e.kind === view)
                                .length}
                        </span>
                      </h1>
                      <p>
                        {view === "character"
                          ? "名前の向こうにある、一人ひとりの物語。"
                          : view === "world"
                            ? "国も、神話も、小さな風習も。世界をつくるかけらをここに。"
                            : view === "event"
                              ? "過去から未来へ、物語を流れる時間をたどる。"
                              : view === "clue"
                                ? "まだ語られない秘密を、ふさわしい瞬間まで。"
                                : "血脈と縁でつながる、幾世代もの物語。"}
                      </p>
                    </div>
                    {view !== "family" && (
                      <button
                        className="button primary"
                        onClick={() => quickEntry(view as Kind)}
                      >
                        <Plus size={17} />
                        {view === "character"
                          ? "人物"
                          : view === "world"
                            ? "設定"
                            : view === "event"
                              ? "出来事"
                              : "伏線"}
                        を追加
                      </button>
                    )}
                  </div>
                  {view === "family" ? (
                    <FamilyGraph
                      data={data}
                      projectId={currentId}
                      onOpen={open}
                      onMove={(id, x, y) =>
                        change(
                          (d) => ({
                            ...d,
                            positions: { ...d.positions, [id]: { x, y } },
                          }),
                          "graph-drag",
                        )
                      }
                      onReset={() =>
                        setConfirm({
                          title: "人物の配置をリセットしますか？",
                          message:
                            "この作品の手動配置を解除し、世代と親子関係から並べ直します。",
                          action: () =>
                            change((d) => ({
                              ...d,
                              positions: Object.fromEntries(
                                Object.entries(d.positions).filter(
                                  ([id]) =>
                                    !projectEntries.some((e) => e.id === id),
                                ),
                              ),
                            })),
                        })
                      }
                      onAdd={() => quickEntry("character")}
                      onRelation={() => setRelationOpen(true)}
                    />
                  ) : (
                    <>
                      {view === "world" && (
                        <div className="category-bar">
                          <button
                            className={category === "すべて" ? "active" : ""}
                            onClick={() => setCategory("すべて")}
                          >
                            すべて
                            <span>
                              {
                                projectEntries.filter((e) => e.kind === "world")
                                  .length
                              }
                            </span>
                          </button>
                          {categoryOptions(data).map((c) => (
                            <button
                              key={c}
                              className={category === c ? "active" : ""}
                              onClick={() => setCategory(c)}
                            >
                              {c}
                            </button>
                          ))}
                          <button
                            className="category-add"
                            onClick={() => setCategoryOpen(true)}
                          >
                            <Plus size={14} />
                            カテゴリ
                          </button>
                        </div>
                      )}
                      <div className="list-toolbar">
                        <span className="muted small">
                          {view === "event" ? timeline.length : visible.length}{" "}
                          件の
                          {view === "character"
                            ? "人物"
                            : view === "clue"
                              ? "伏線・謎"
                              : view === "event"
                                ? "出来事"
                                : "設定"}
                        </span>
                        <div>
                          {view === "clue" && (
                            <select
                              aria-label="回収状況で絞り込み"
                              value={clueFilter}
                              onChange={(e) => setClueFilter(e.target.value)}
                            >
                              <option value="すべて">すべての回収状況</option>
                              {fieldOptions(data, "回収状況", [
                                "未回収",
                                "回収予定",
                                "回収済み",
                                "保留",
                              ]).map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          )}
                          {view === "event" && (
                            <select
                              aria-label="年表の対象"
                              value={timelineScope}
                              onChange={(e) => setTimelineScope(e.target.value)}
                            >
                              <option value="">世界共通の年表</option>
                              {projectEntries
                                .filter(
                                  (e) =>
                                    e.kind === "character" ||
                                    e.kind === "world",
                                )
                                .map((e) => (
                                  <option key={e.id} value={e.id}>
                                    {e.name}の年表
                                  </option>
                                ))}
                            </select>
                          )}
                          {view !== "event" && (
                            <div
                              className="view-switch"
                              aria-label="一覧の表示方法"
                            >
                              {(
                                [
                                  ["cards", "カード表示", LayoutGrid],
                                  ["list", "リスト表示", List],
                                ] as const
                              ).map(([id, label, Icon]) => (
                                <button
                                  key={id}
                                  className="icon-button"
                                  aria-label={label}
                                  aria-pressed={preferences.layout === id}
                                  onClick={() =>
                                    change((d) => ({
                                      ...d,
                                      appearance: {
                                        ...preferences,
                                        layout: id,
                                      },
                                    }))
                                  }
                                >
                                  <Icon size={17} />
                                </button>
                              ))}
                            </div>
                          )}
                          <SlidersHorizontal size={14} />
                          <select
                            aria-label="設定の状態で絞り込み"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                          >
                            <option value="すべて">すべての状態</option>
                            {statusOptions(data).map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {view === "event" ? (
                        timeline.length ? (
                          <div className="timeline">
                            {timeline.map((e, i) => (
                              <div className="timeline-row" key={e.id}>
                                <div className="timeline-date">
                                  <span>
                                    {e.fields.年代?.trim()
                                      ? e.fields.年代 + " 年"
                                      : "年代未確定"}
                                  </span>
                                  <small>{e.fields.時期}</small>
                                </div>
                                <div className="timeline-line">
                                  <i />
                                </div>
                                <button
                                  className="panel timeline-card"
                                  onClick={() => open(e.id)}
                                >
                                  <div>
                                    <span className="eyebrow">
                                      EVENT {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <Badge status={e.status} />
                                  </div>
                                  <h2>{e.name}</h2>
                                  <p>{e.body}</p>
                                  <div className="tag-list">
                                    {e.links.map((id) => {
                                      const linked = data.entries.find(
                                        (x) => x.id === id,
                                      );
                                      return (
                                        linked && (
                                          <span key={id}>
                                            <Link2 size={11} />
                                            {linked.name}
                                          </span>
                                        )
                                      );
                                    })}
                                  </div>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          empty("event")
                        )
                      ) : visible.length ? (
                        <div className="card-grid">
                          {visible.map((e) => (
                            <EntryCard
                              key={e.id}
                              entry={e}
                              onOpen={() => open(e.id)}
                            />
                          ))}
                        </div>
                      ) : projectEntries.some((e) => e.kind === view) ? (
                        <div className="empty-state panel">
                          <p>この条件に合う設定はありません。</p>
                          <button
                            className="button subtle"
                            onClick={() => {
                              setStatusFilter("すべて");
                              setCategory("すべて");
                              setClueFilter("すべて");
                            }}
                          >
                            絞り込みを解除
                          </button>
                        </div>
                      ) : (
                        empty(view as Kind)
                      )}
                    </>
                  )}
                </>
              )}
              {view === "projects" && (
                <>
                  <div className="page-title">
                    <div>
                      <span className="eyebrow">A SHELF OF YOUR WORLDS</span>
                      <h1>プロジェクト</h1>
                      <p>シリーズから一章まで、物語の居場所を整える。</p>
                    </div>
                    <button className="button primary" onClick={makeProject}>
                      <Plus size={16} />
                      新しいプロジェクト
                    </button>
                  </div>
                  <div className="project-grid">
                    {data.projects.map((p) => (
                      <section className="panel project-card" key={p.id}>
                        {p.image ? (
                          <img className="project-cover" src={p.image} alt="" />
                        ) : (
                          <div className="project-cover empty-cover">
                            <Sprout size={38} strokeWidth={1} />
                          </div>
                        )}
                        <div className="project-card-body">
                          <div className="section-heading">
                            <span className="eyebrow">{p.type}</span>
                            <Badge status={p.status} />
                          </div>
                          <small className="muted">
                            {p.parentId
                              ? projectCrumb(p)
                                  .split(" / ")
                                  .slice(0, -1)
                                  .join(" / ")
                              : "独立したプロジェクト"}
                          </small>
                          <h2>{p.name || "名前未設定"}</h2>
                          <p>{p.description || "説明はまだありません。"}</p>
                          <div className="tag-list">
                            {p.tags.map((t) => (
                              <span key={t}>#{t}</span>
                            ))}
                          </div>
                          <div className="project-card-actions">
                            <button
                              className="text-button"
                              onClick={() => selectProject(p.id)}
                            >
                              物語をひらく
                              <ArrowRight size={14} />
                            </button>
                            <button
                              className="icon-button"
                              aria-label={`${p.name}を編集`}
                              onClick={() => {
                                setProjectDraft({ ...p });
                                setProjectNew(false);
                              }}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="icon-button danger"
                              aria-label={`${p.name}を削除`}
                              onClick={() => removeProject(p)}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      </section>
                    ))}
                  </div>
                  {!data.projects.length && (
                    <div className="empty-state">
                      <p>新しいプロジェクトを作成して始めましょう。</p>
                    </div>
                  )}
                </>
              )}
              {view === "settings" && (
                <>
                  <div className="page-title">
                    <div>
                      <span className="eyebrow">KEEP YOUR WORLD SAFE</span>
                      <h1>設定・バックアップ</h1>
                      <p>あなたの物語は、あなたの手元に。</p>
                    </div>
                  </div>
                  <AppearanceSettings
                    value={preferences}
                    theme={data.theme}
                    onChange={(appearance) =>
                      change((d) => ({ ...d, appearance }), "appearance")
                    }
                    onTheme={(theme) => change((d) => ({ ...d, theme }))}
                    onReset={() =>
                      change((d) => ({
                        ...d,
                        theme: "dark",
                        appearance: defaultAppearance(),
                      }))
                    }
                  />
                  <div className="settings-grid">
                    <section className="panel settings-panel">
                      <span className="settings-icon">
                        <ShieldCheck size={27} />
                      </span>
                      <h2>大切なデータを守る</h2>
                      <p>
                        すべての情報はこのブラウザの IndexedDB
                        に自動保存されます。非公開GitHubとの同期を接続すると端末間でも共有できます。ブラウザのデータ削除や端末故障に備えて、定期的にJSONを書き出してください。
                      </p>
                      <div className="backup-info">
                        <span>前回のJSON書き出し</span>
                        <strong>
                          {data.lastBackup
                            ? new Date(data.lastBackup).toLocaleString("ja-JP")
                            : "まだ書き出していません"}
                        </strong>
                      </div>
                      <button className="button primary full" onClick={backup}>
                        <Download size={17} />
                        全データをJSONでバックアップ
                      </button>
                      <button
                        className="button subtle full"
                        onClick={() => fileRef.current?.click()}
                      >
                        <Upload size={17} />
                        JSONから復元・別の端末へ移行
                      </button>
                      <small>
                        JSONには画像・リンク・人物関係・全プロジェクトが含まれます。復元は現在のデータを置き換えます。
                      </small>
                      <button
                        className="text-button space-top"
                        onClick={async () => {
                          try {
                            const ok = await navigator.storage?.persist?.();
                            setNotice(
                              ok
                                ? "ブラウザの永続保存が許可されました。バックアップも続けてください。"
                                : "永続保存は許可されませんでした。JSONバックアップをご利用ください。",
                            );
                          } catch {
                            setNotice(
                              "このブラウザでは永続保存を要求できません。JSONバックアップをご利用ください。",
                            );
                          }
                        }}
                      >
                        <ShieldCheck size={15} />
                        ブラウザに永続保存をリクエスト
                      </button>
                    </section>
                    <div>
                      <section className="panel settings-panel">
                        <h2>
                          <FileText size={20} />
                          Markdownで持ち出す
                        </h2>
                        <p>
                          現在のプロジェクトと下位の作品・章を、読みやすいテキストとして書き出します。画像はJSONバックアップをご利用ください。
                        </p>
                        <button
                          className="button subtle full"
                          disabled={!project}
                          onClick={() => {
                            download(
                              markdown(data, currentId),
                              "text/markdown;charset=utf-8",
                              `${project?.name || "設定集"}.md`,
                            );
                            setNotice("Markdownを書き出しました。");
                          }}
                        >
                          <Download size={16} />「{project?.name || "未選択"}
                          」を書き出す
                        </button>
                      </section>
                      <section className="panel settings-panel">
                        <h2>
                          <Sun size={20} />
                          表示とオフライン
                        </h2>
                        <div className="setting-line">
                          <span>カラーテーマ</span>
                          <button
                            className="button subtle"
                            onClick={() =>
                              change((d) => ({
                                ...d,
                                theme: d.theme === "dark" ? "light" : "dark",
                              }))
                            }
                          >
                            {data.theme === "dark" ? "ダーク" : "ライト"}モード
                          </button>
                        </div>
                        <p>
                          {offlineReady
                            ? "オフライン用のアプリを保存済みです。"
                            : "オフライン対応は本番ビルドで有効になります。"}
                        </p>
                        <p className="small">
                          インストール：AndroidのChromeではメニューから「ホーム画面に追加」、PCではブラウザのインストール操作を使用します。ログイン・有料APIは不要です。
                        </p>
                      </section>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
      <nav className="bottom-nav" aria-label="スマートフォンナビゲーション">
        {nav.slice(0, 4).map((n) => (
          <button
            key={n.id}
            className={view === n.id ? "active" : ""}
            onClick={() => navigate(n.id)}
          >
            <n.icon size={20} />
            <span>
              {n.id === "dashboard"
                ? "ホーム"
                : n.id === "world"
                  ? "世界観"
                  : n.id === "family"
                    ? "家系図"
                    : "人物"}
            </span>
          </button>
        ))}
        <button
          className={mobileMenu ? "active" : ""}
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          <MoreHorizontal size={22} />
          <span>その他</span>
        </button>
      </nav>
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="通知を閉じる"
            onClick={() => setNotice("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {quick && (
        <Modal onClose={() => setQuick(false)}>
          <div className="modal-heading">
            <div>
              <span className="eyebrow">A NEW SEED FOR YOUR STORY</span>
              <h2>何を綴りますか？</h2>
            </div>
            <button
              className="icon-button"
              aria-label="閉じる"
              onClick={() => setQuick(false)}
            >
              <X size={20} />
            </button>
          </div>
          <div className="quick-grid">
            {(["character", "world", "event", "clue"] as Kind[]).map((k) => {
              const Icon = kindIcons[k];
              return (
                <button className="panel" key={k} onClick={() => quickEntry(k)}>
                  <Icon size={25} strokeWidth={1.3} />
                  <strong>{kindLabels[k]}</strong>
                  <ArrowUpRight size={16} />
                </button>
              );
            })}
          </div>
        </Modal>
      )}
      {newKind && (
        <Modal onClose={() => setNewKind(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newName.trim() || !currentId) return;
              const entry = {
                ...newEntry(currentId, newKind),
                name: newName.trim(),
                category:
                  newKind === "world" && category !== "すべて" ? category : "",
              };
              change((d) => ({ ...d, entries: [...d.entries, entry] }));
              setNewKind(null);
              setEntryId(entry.id);
              setView(newKind);
              setSearch("");
            }}
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">ADD TO YOUR WORLD</span>
                <h2>{kindLabels[newKind]}を追加</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="閉じる"
                onClick={() => setNewKind(null)}
              >
                <X size={20} />
              </button>
            </div>
            <p className="muted small">
              「{project?.name}
              」に追加します。詳細は作成後に自由に編集できます。
            </p>
            <label>
              名前
              <input
                required
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="名前をつけて、物語の中へ。"
              />
            </label>
            <div className="modal-footer">
              <button
                type="button"
                className="button subtle"
                onClick={() => setNewKind(null)}
              >
                キャンセル
              </button>
              <button type="submit" className="button primary">
                作成して編集
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {projectDraft && (
        <Modal wide onClose={() => setProjectDraft(null)}>
          <ProjectForm
            value={projectDraft}
            data={data}
            isNew={projectNew}
            onError={setNotice}
            onChange={(p) => {
              setProjectDraft(p);
              if (!projectNew)
                change(
                  (d) => ({
                    ...d,
                    projects: d.projects.map((x) =>
                      x.id === p.id ? { ...p, updatedAt: now() } : x,
                    ),
                  }),
                  p.id,
                );
            }}
            onCancel={() => setProjectDraft(null)}
            onSave={() => {
              if (projectNew) {
                change((d) => ({
                  ...d,
                  projects: [
                    ...d.projects,
                    {
                      ...projectDraft,
                      name: projectDraft.name.trim(),
                      updatedAt: now(),
                    },
                  ],
                }));
                selectProject(projectDraft.id);
              }
              setProjectDraft(null);
            }}
          />
        </Modal>
      )}
      {relationOpen && (
        <Modal onClose={() => setRelationOpen(false)}>
          <RelationForm
            data={data}
            projectId={currentId}
            initialFrom={
              selected?.kind === "character" ? selected.id : undefined
            }
            onCancel={() => setRelationOpen(false)}
            onSave={(r) => {
              change((d) => ({ ...d, relations: [...d.relations, r] }));
              setNotice("人物の関係を追加しました。");
            }}
            onRemove={(id) =>
              setConfirm({
                title: "この関係を削除しますか？",
                message: "人物の設定は削除されません。操作は取り消せます。",
                action: () =>
                  change((d) => ({
                    ...d,
                    relations: d.relations.filter((r) => r.id !== id),
                  })),
              })
            }
          />
        </Modal>
      )}
      {categoryOpen && (
        <Modal onClose={() => setCategoryOpen(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const c = categoryDraft.trim();
              if (!c) return;
              if (categoryOptions(data).includes(c)) {
                setNotice("同じカテゴリが存在します。");
                return;
              }
              change((d) => ({ ...d, categories: [...d.categories, c] }));
              setCategory(c);
              setCategoryDraft("");
              setCategoryOpen(false);
            }}
          >
            <div className="modal-heading">
              <h2>カテゴリを追加</h2>
              <button
                type="button"
                className="icon-button"
                aria-label="閉じる"
                onClick={() => setCategoryOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <label>
              カテゴリ名
              <input
                required
                autoFocus
                placeholder="例：言語・文字"
                value={categoryDraft}
                onChange={(e) => setCategoryDraft(e.target.value)}
              />
            </label>
            <button className="button primary full" type="submit">
              追加
            </button>
          </form>
        </Modal>
      )}
      {confirm && (
        <Modal onClose={() => setConfirm(null)}>
          <div className="confirm-icon">
            <AlertTriangle size={26} />
          </div>
          <h2>{confirm.title}</h2>
          <p className="confirm-message">{confirm.message}</p>
          <div className="modal-footer">
            <button className="button subtle" onClick={() => setConfirm(null)}>
              キャンセル
            </button>
            <button
              className="button danger-fill"
              onClick={() => {
                confirm.action();
                setConfirm(null);
              }}
            >
              {confirm.label || "実行する"}
            </button>
          </div>
        </Modal>
      )}
      {imported && (
        <Modal onClose={() => setImported(null)}>
          <div className="confirm-icon">
            <Upload size={26} />
          </div>
          <h2>バックアップを復元しますか？</h2>
          <p className="confirm-message">
            読み込んだ {imported.projects.length} プロジェクト・
            {imported.entries.length}{" "}
            件の設定で、現在の全データを置き換えます。復元前に現在のJSONを書き出すことをおすすめします。
          </p>
          <button className="button subtle full" onClick={backup}>
            <Download size={16} />
            現在のデータを先にバックアップ
          </button>
          <div className="modal-footer">
            <button className="button subtle" onClick={() => setImported(null)}>
              キャンセル
            </button>
            <button
              className="button danger-fill"
              onClick={() => {
                change(() => imported);
                setProjectId(imported.projects[0]?.id || "");
                navigate("dashboard");
                setImported(null);
                setNotice("バックアップを復元しました。");
              }}
            >
              全データを置き換えて復元
            </button>
          </div>
        </Modal>
      )}
      <input
        ref={fileRef}
        hidden
        type="file"
        accept=".json,application/json"
        aria-label="JSONバックアップファイル"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void readBackup(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

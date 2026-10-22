import TimelineBoard from "./TimelineBoard";
import ProjectGateway from "./ProjectGateway";
import WorkspaceContext from "./WorkspaceContext";
import MobileProjectMenu from "./MobileProjectMenu";
import {
  parentWorld,
  reparentWorkspace,
  startupChoice,
  workspaceStories,
  workspaceStoryDepth,
} from "./workspaces";
import ProjectPackagePanel from "./ProjectPackagePanel";
import { addProjectPackage, readProjectFile } from "./projectPackages";
import ProjectTree from "./ProjectTree";
import SettingGenrePicker from "./SettingGenrePicker";
import { moveOnShelf, shelfSources } from "./collections";
import { AndroidApp, isAndroidApp, saveTextFile } from "./native";
import AndroidUpdates from "./AndroidUpdates";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
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
  Copy,
  PanelsTopLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { load, persist } from "./storage";
import {
  sharedProjectIds,
  isWorldLibrary,
  referencedWorldIds,
  organizeStories,
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
  syndromeCategory,
} from "./model";
import type { Data, Entry, Kind, Project } from "./model";
import { EntryEditor, ProjectForm } from "./Editors";
import { SyndromeForm } from "./Syndromes";
import { FamilyGraph, RelationForm } from "./Graph";
import InstallApp from "./InstallApp";
import Modal from "./Modal";
import CardSurface, { CardMenuButton } from "./CardSurface";
import GitHubSync from "./GitHubSync";
import AppearanceSettings from "./AppearanceSettings";
import { defaultAppearance } from "./appearance";
import type { DashboardSection } from "./appearance";
import { PublicReader } from "./studio/PublicPanel";
import { searchStudio } from "./studio/search";
import { publicDocument } from "./studio/publication";
import { familyLayout } from "./studio/family";
const CreationWorkspace = lazy(() => import("./CreationWorkspace"));
const StudioHub = lazy(() => import("./studio/StudioHub"));
import { TimeSwitcher, EraEntryPreview } from "./studio/TimeSwitcher";
import { dataAtTime } from "./studio/time";
import type { TimeSelection } from "./studio/time";
import { checkpoint, rememberChanges } from "./studio/model";
import type { StudioTab } from "./studio/model";
type View =
  | "creation"
  | "dashboard"
  | "character"
  | "world"
  | "family"
  | "event"
  | "clue"
  | "projects"
  | "settings"
  | "studio";
const nav: { id: View; label: string; icon: LucideIcon; en: string }[] = [
  { id: "creation", label: "制作画面", icon: PanelsTopLeft, en: "CREATE" },
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
  { id: "studio", label: "創作スタジオ", icon: PanelsTopLeft, en: "STUDIO" },
];
const kindIcons: Record<Kind, LucideIcon> = {
  character: Users,
  world: BookOpen,
  event: Clock3,
  clue: Sparkles,
};
const download = saveTextFile;

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
function Badge({ status }: { status: string }) {
  return (
    <span className={`status status-${status}`}>
      <i />
      {status || "未設定"}
    </span>
  );
}
function EntryCard({
  source,
  entry,
  onOpen,
  onActions,
}: {
  entry: Entry;
  source: string;
  onOpen: () => void;
  onActions: () => void;
}) {
  const Icon = kindIcons[entry.kind];
  return (
    <CardSurface className="entry-card-wrap" onActions={onActions}>
      <button
        className={`entry-card panel kind-${entry.kind}`}
        onClick={onOpen}
      >
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
        <small className="muted">{source}</small>
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
      <CardMenuButton name={entry.name || "名前未設定"} onClick={onActions} />
    </CardSurface>
  );
}
export default function App() {
  const [data, setData] = useState<Data | null>(null),
    [loadError, setLoadError] = useState("");
  const dataRef = useRef<Data | null>(null);
  dataRef.current = data;
  const [session, setSession] = useState<"home" | "picker" | "editor">("home");
  const [settingsTab, setSettingsTab] = useState("general");
  const [launchMode, setLaunchMode] = useState<"home" | "resume">(
    startupChoice,
  );
  const [lastOpenedId, setLastOpenedId] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileProjectHome, setMobileProjectHome] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(() => {
    try {
      return localStorage.getItem("tsuzuriniwa:tools-expanded") === "true";
    } catch {
      return false;
    }
  });
  const [studioTab, setStudioTab] = useState<StudioTab>("history");
  const [studioFocus, setStudioFocus] = useState("");
  const [timeSelection, setTimeSelection] = useState<TimeSelection>({
    eraId: "",
  });
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
  const [libraryKind, setLibraryKind] = useState<"story" | "world">("story");
  const [projectMenu, setProjectMenu] = useState(false),
    [mobileMenu, setMobileMenu] = useState(false),
    [quick, setQuick] = useState(false),
    [projectDraft, setProjectDraft] = useState<Project | null>(null),
    [projectNew, setProjectNew] = useState(false);
  const [newKind, setNewKind] = useState<Kind | null>(null),
    [newName, setNewName] = useState(""),
    [relationOpen, setRelationOpen] = useState(false);
  const [syndromeFor, setSyndromeFor] = useState<{
    projectId: string;
    characterId?: string;
  } | null>(null);
  const [category, setCategory] = useState("すべて"),
    [statusFilter, setStatusFilter] = useState("すべて"),
    [timelineScope, setTimelineScope] = useState(""),
    [clueFilter, setClueFilter] = useState("すべて");
  const [creationSceneId, setCreationSceneId] = useState("");
  const [creationSection, setCreationSection] = useState("");
  const [focusedWorldEntryId, setFocusedWorldEntryId] = useState("");
  const [relationInitialId, setRelationInitialId] = useState<
    string | undefined
  >();
  const [notice, setNotice] = useState(""),
    [confirm, setConfirm] = useState<{
      title: string;
      message: string;
      action: () => void;
      label?: string;
    } | null>(null);
  const [actionTarget, setActionTarget] = useState<{
    kind: "project" | "entry";
    id: string;
  } | null>(null);
  const [publicPreview, setPublicPreview] = useState("");
  const [undoNotice, setUndoNotice] = useState(false);
  const [imported, setImported] = useState<Data | null>(null);
  const [importMode, setImportMode] = useState<"add" | "replace">("replace");
  const fileRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const updateCheck = useRef({ busy: false, last: 0 });
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registered) {
      registration.current = registered;
    },
    onRegisterError(error) {
      console.warn("オフライン登録:", error);
    },
  });
  async function checkAppUpdate(manual = false) {
    if (isAndroidApp) {
      if (manual) window.dispatchEvent(new Event("android-check-update"));
      return;
    }
    if (!navigator.onLine) {
      if (manual)
        setNotice(
          "オフラインです。インターネットにつないでから更新を確認してください。",
        );
      return;
    }
    if (
      updateCheck.current.busy ||
      (!manual && Date.now() - updateCheck.current.last < 60_000)
    )
      return;
    updateCheck.current = { busy: true, last: Date.now() };
    setCheckingUpdate(true);
    try {
      const registered =
        registration.current ||
        (await navigator.serviceWorker?.getRegistration(
          import.meta.env.BASE_URL,
        ));
      if (!registered) {
        if (manual)
          setNotice(
            "更新を確認できませんでした。オンラインでアプリを開き直してください。",
          );
        return;
      }
      await registered.update();
      if (manual)
        setNotice(
          "更新を確認しました。新しいバージョンがある場合は、画面上部に「更新する」が表示されます。",
        );
    } catch {
      if (manual)
        setNotice(
          "更新を確認できませんでした。通信状態を確認して、もう一度お試しください。",
        );
    } finally {
      updateCheck.current.busy = false;
      setCheckingUpdate(false);
    }
  }
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible") void checkAppUpdate();
    };
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.removeEventListener("focus", check);
      window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  useEffect(() => {
    let active = true;
    load()
      .then((d) => {
        if (active) {
          setData(d);
          setProjectId(d.projects[0]?.id || "");
          try {
            const last = localStorage.getItem("tsuzuriniwa:active-workspace");
            if (last && d.projects.some((p) => p.id === last)) {
              setLastOpenedId(last);
              if (startupChoice() === "resume") {
                setProjectId(last);
                setSession("editor");
                const resumeView = localStorage.getItem(
                  "tsuzuriniwa:resume-view",
                );
                setView(
                  resumeView &&
                    [
                      "creation",
                      "dashboard",
                      "character",
                      "world",
                      "event",
                      "family",
                      "clue",
                      "studio",
                    ].includes(resumeView)
                    ? (resumeView as View)
                    : "creation",
                );
              }
            }
          } catch {
            /* Local storage is optional; IndexedDB remains the source of truth. */
          }
        }
      })
      .catch((e) => active && setLoadError(String(e)));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (
      session === "editor" &&
      !["settings", "projects"].includes(view) &&
      data?.projects.some((p) => p.id === projectId)
    ) {
      try {
        localStorage.setItem("tsuzuriniwa:active-workspace", projectId);
        localStorage.setItem("tsuzuriniwa:resume-view", view);
        setLastOpenedId(projectId);
      } catch {}
    }
  }, [view, projectId, data?.projects, session]);
  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    const preferences = data.appearance || defaultAppearance();
    root.dataset.theme = data.theme;
    root.dataset.accent = preferences.accent;
    root.dataset.font = preferences.font;
    root.dataset.density = preferences.density;
    root.dataset.layout = preferences.layout;
    root.dataset.background = preferences.background || "plain";
    root.dataset.surface = preferences.surface || "classic";
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
    if (!isAndroidApp) return;
    const pause = () => {
      const latest = dataRef.current;
      if (latest)
        saveQueue.current = saveQueue.current
          .catch(() => {})
          .then(() => persist(latest));
    };
    const back = () => {
      if (document.querySelector('[role="dialog"],dialog[open]')) {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
        return;
      }
      if (session === "picker") {
        setSession("home");
        return;
      }
      if (session === "home") {
        pause();
        void AndroidApp.minimize();
        return;
      }
      if (inspectorOpen) {
        setInspectorOpen(false);
        return;
      }
      if (publicPreview) {
        setPublicPreview("");
        return;
      }
      if (mobileMenu) {
        setMobileMenu(false);
        return;
      }
      if (entryId) {
        setEntryId("");
        return;
      }
      if (view === "creation") {
        if (!mobileProjectHome) {
          setMobileProjectHome(true);
        } else {
          setSession("picker");
        }
        return;
      }
      navigate("creation");
    };
    window.addEventListener("native-back", back);
    window.addEventListener("native-pause", pause);
    return () => {
      window.removeEventListener("native-back", back);
      window.removeEventListener("native-pause", pause);
    };
  }, [
    view,
    entryId,
    mobileMenu,
    publicPreview,
    session,
    inspectorOpen,
    mobileProjectHome,
  ]);
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
    const timer = setTimeout(() => setNotice(""), undoNotice ? 10000 : 5000);
    return () => clearTimeout(timer);
  }, [notice, undoNotice]);
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
  function change(fn: (d: Data) => Data, group = "", record = true) {
    const current = dataRef.current;
    if (!current) return;
    const requested = fn(current);
    const next = record ? rememberChanges(current, requested) : requested;
    setUndoNotice(false);
    const t = Date.now();
    if (
      !group ||
      lastHistory.current.id !== group ||
      t - lastHistory.current.at > 1500
    ) {
      history.current = [...history.current.slice(-29), current];
    }
    lastHistory.current = { id: group, at: t };
    saveRevision.current += 1;
    setSaveState("保存中…");
    dataRef.current = next;
    setData(next);
  }
  function undo() {
    setUndoNotice(false);
    const prev = history.current.pop();
    if (prev) {
      saveRevision.current += 1;
      setSaveState("保存中…");
      dataRef.current = prev;
      setData(prev);
      lastHistory.current = { id: "", at: 0 };
      setNotice("直前の操作を取り消しました");
    }
  }
  function navigate(v: View) {
    setMobileProjectHome(false);
    setMobileSearchOpen(false);
    if (v === "creation") setTimeSelection({ eraId: "" });
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
  function showStudio(tab: StudioTab, id = "") {
    if (
      tab === "plot" &&
      id &&
      (dataRef.current?.studio?.scenes.some((scene) => scene.id === id) ||
        dataRef.current?.studio?.portrayals?.some((item) => item.id === id))
    ) {
      navigate("creation");
      setCreationSceneId(id);
      return;
    }
    navigate("studio");
    setStudioTab(tab);
    setStudioFocus(id);
  }
  function open(id: string) {
    const e = dataRef.current?.entries.find((x) => x.id === id);
    if (e) {
      if (!sharedProjectIds(dataRef.current!, projectId).has(e.projectId))
        setTimeSelection({ eraId: "" });
      else if (
        (timeSelection.eraId || timeSelection.year !== undefined) &&
        !readingData.entries.some((item) => item.id === id)
      ) {
        setNotice("この時点より後の出来事です。現在に戻ると表示できます。");
        return;
      }
      setEntryId(id);
      if (!sharedProjectIds(dataRef.current!, projectId).has(e.projectId))
        setProjectId(e.projectId);
      setSearch("");
      setView(e.kind);
      window.scrollTo({ top: 0 });
    }
  }
  function selectProject(id: string) {
    setSession("editor");
    setInspectorOpen(false);
    setFocusedWorldEntryId("");
    setTimeSelection({ eraId: "" });
    setProjectId(id);
    setCreationSceneId("");
    setCreationSection("");
    navigate("creation");
    setProjectMenu(false);
  }
  function makeProject(kind: "story" | "world" = "story") {
    setTimeSelection({ eraId: "" });
    setProjectDraft(newProject(kind));
    setProjectNew(true);
    setProjectMenu(false);
  }
  function quickEntry(kind: Kind) {
    setTimeSelection({ eraId: "" });
    if (!data?.projects.length) {
      setNotice("先にストーリーを作成してください。");
      makeProject();
      return;
    }
    setNewKind(kind);
    setNewName("");
    setQuick(false);
  }
  function createSyndrome(character?: Entry) {
    setTimeSelection({ eraId: "" });
    const id = character?.projectId || projectId || data?.projects[0]?.id;
    if (!id) {
      setNotice("先にストーリーを作成してください。");
      makeProject();
      return;
    }
    setSyndromeFor({ projectId: id, characterId: character?.id });
  }
  async function backup() {
    if (!data) return;
    const stamp = now();
    try {
      const saved = await download(
        JSON.stringify({ ...data, lastBackup: stamp }, null, 2),
        "application/json",
        `綴庭-backup-${stamp.slice(0, 10)}.json`,
      );
      if (!saved) {
        setNotice("バックアップの保存をキャンセルしました。");
        return;
      }
      change((d) => ({ ...d, lastBackup: stamp }));
      setNotice(
        "全ストーリーのJSONを書き出しました。安全な場所に保管してください。",
      );
    } catch {
      setNotice(
        "バックアップを保存できませんでした。保存先と空き容量を確認してください。",
      );
    }
  }

  async function readBackup(file: File) {
    try {
      if (file.size > 100 * 1024 * 1024)
        throw new Error("100MB以下のバックアップを選択してください。");
      const raw = JSON.parse(await file.text());
      const parsed = readProjectFile(raw);
      if (parsed.packaged) setImportMode("add");
      setImported(parsed.data);
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
  if (publicPreview)
    return (
      <PublicReader
        document={publicDocument(data, publicPreview)}
        onExit={() => setPublicPreview("")}
      />
    );
  const project =
    data.projects.find((p) => p.id === projectId) || data.projects[0];
  const currentId = project?.id || "";
  const toggleContext = () => {
    if (!project) {
      setNotice("先にプロジェクトを選択してください。");
      return;
    }
    if (["settings", "projects"].includes(view)) navigate("creation");
    setInspectorOpen(!inspectorOpen);
  };
  const readingData = dataAtTime(data, timeSelection);
  const historical =
    Boolean(timeSelection.eraId) || timeSelection.year !== undefined;
  const sharedIds = sharedProjectIds(data, currentId);
  const projectEntries = readingData.entries.filter((e) =>
    sharedIds.has(e.projectId),
  );
  const selected = readingData.entries.find((e) => e.id === entryId);
  const currentNav = nav.find((n) => n.id === view);
  const recent = [...projectEntries]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);
  const studioSearch = searchStudio(data, search);
  const allSearch = searchEntries(readingData.entries, search);
  const searchProjects = data.projects.filter((p) =>
    [p.name, p.description, p.tags.join(" "), p.lore, p.truth]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const preferences = data.appearance || defaultAppearance();
  const customize = () => {
    setSettingsTab("appearance");
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
  const removeEntry = (entry: Entry) =>
    setConfirm({
      title: "この設定を削除しますか？",
      message: `「${entry.name}」と、この設定へのリンク・人物関係も削除されます。操作は取り消せます。`,
      action: () => {
        change((d) => deleteEntry(d, entry.id));
        if (entryId === entry.id) setEntryId("");
        setNotice("設定を削除しました。");
        setUndoNotice(true);
      },
    });
  const removeProject = (p: Project) =>
    setConfirm({
      title: "ストーリーを削除しますか？",
      message: `「${p.name}」と、この保存先の設定を削除します。参照しているほかのストーリーや世界観は残ります。必要に応じて先にバックアップしてください。操作は取り消せます。`,
      action: () => {
        change((d) => deleteProject(d, p.id));
        setProjectId("");
        setNotice("ストーリーを削除しました。");
        setUndoNotice(true);
      },
    });
  function editProject(p: Project) {
    setTimeSelection({ eraId: "" });
    setProjectDraft({ ...p });
    setProjectNew(false);
  }
  function duplicateEntry(source: Entry) {
    setTimeSelection({ eraId: "" });
    const copy: Entry = {
      ...structuredClone(source),
      id: crypto.randomUUID(),
      name: `${source.name || "名前未設定"}（コピー）`,
      updatedAt: now(),
    };
    change((d) => ({ ...d, entries: [...d.entries, copy] }));
    setEntryId(copy.id);
    setProjectId(copy.projectId);
    setView(copy.kind);
    setSearch("");
    window.scrollTo({ top: 0 });
    setNotice("設定を複製しました。人物関係は引き継ぎません。");
    setUndoNotice(true);
  }
  function projectCrumb(p: Project): string {
    return p.name;
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
      (category === "すべて" || (e.category.trim() || "未分類") === category) &&
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
    <div
      className={`app-shell session-${session} settings-${settingsTab} ${project && isWorldLibrary(project) ? "world-editor" : "story-editor"} ${view === "settings" || view === "projects" ? "utility-view" : "workspace-view"} ${mobileProjectHome ? "mobile-project-home" : ""}`}
    >
      {session !== "editor" && (
        <ProjectGateway
          data={data}
          screen={session}
          lastId={lastOpenedId}
          saveState={saveState}
          onScreen={setSession}
          onOpen={(id) => {
            selectProject(id);
            setMobileProjectHome(true);
          }}
          onSettings={() => {
            setSession("editor");
            setSettingsTab("general");
            navigate("settings");
          }}
          onCreate={(kind, parentId = "") => {
            setProjectDraft({
              ...newProject(kind),
              collectionId: parentId,
              worldIds: parentId ? [parentId] : [],
            });
            setProjectNew(true);
          }}
        />
      )}
      {session === "editor" && (
        <>
          <aside className={`sidebar ${mobileMenu ? "mobile-open" : ""}`}>
            <a
              href="#"
              className="brand"
              onClick={(e) => {
                e.preventDefault();
                setSession("home");
                setMobileMenu(false);
                setInspectorOpen(false);
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
                  <small>
                    {project && isWorldLibrary(project)
                      ? "編集中の世界観"
                      : "現在のストーリー"}
                  </small>
                  <strong>{project?.name || "ストーリーを作成"}</strong>
                </span>
                <ChevronDown size={15} />
              </button>
              {projectMenu && (
                <div className="project-menu">
                  {data.projects.map((p) => (
                    <button
                      key={p.id}
                      aria-label={p.name}
                      onClick={() => selectProject(p.id)}
                    >
                      <span>
                        {isWorldLibrary(p) ? "資料：" : "ストーリー："}
                        {p.name}
                      </span>
                      {currentId === p.id && <Check size={14} />}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setLibraryKind("world");
                      navigate("projects");
                      setProjectMenu(false);
                    }}
                  >
                    世界観ライブラリ
                  </button>
                  <button onClick={() => makeProject()}>
                    <Plus size={15} />
                    新規ストーリー
                  </button>
                  <button
                    onClick={() => {
                      navigate("projects");
                      setProjectMenu(false);
                    }}
                  >
                    <FolderOpen size={15} />
                    ストーリーを管理
                  </button>
                </div>
              )}
            </div>
            <div
              className="desktop-project-tree"
              aria-label="プロジェクトツリー"
            >
              <div className="nav-label">PROJECTS</div>
              {data.projects.filter(isWorldLibrary).map((world) => (
                <div className="desktop-world-group" key={world.id}>
                  <button
                    className={currentId === world.id ? "selected" : ""}
                    onClick={() => selectProject(world.id)}
                  >
                    <Globe2 size={16} />
                    <span>{world.name}</span>
                  </button>
                  {workspaceStories(data, world.id).map((child) => (
                    <button
                      className={`desktop-child ${currentId === child.id ? "selected" : ""}`}
                      key={child.id}
                      style={{
                        paddingLeft: `${27 + Math.min(workspaceStoryDepth(data, child), 5) * 12}px`,
                      }}
                      onClick={() => selectProject(child.id)}
                    >
                      <BookOpen size={14} />
                      <span>{child.name}</span>
                    </button>
                  ))}
                </div>
              ))}
              {data.projects
                .filter((p) => !isWorldLibrary(p) && !parentWorld(data, p))
                .map((p) => (
                  <button
                    key={p.id}
                    className={currentId === p.id ? "selected" : ""}
                    onClick={() => selectProject(p.id)}
                  >
                    <BookOpen size={16} />
                    <span>{p.name}</span>
                  </button>
                ))}
            </div>
            <div className="nav-label">物語のアトリエ</div>
            <nav className="main-nav" aria-label="メインナビゲーション">
              <button
                className="workspace-exit"
                onClick={() => {
                  setSession("picker");
                  setMobileMenu(false);
                }}
              >
                <FolderOpen size={18} />
                <span>プロジェクトを選び直す</span>
              </button>
              <div className="workspace-nav-caption">
                {project && isWorldLibrary(project)
                  ? "世界観の編集"
                  : "物語の編集"}
              </div>
              {nav
                .filter((n) =>
                  ["creation", "world", "character"].includes(n.id),
                )
                .map((n) => (
                  <button
                    key={n.id}
                    aria-label={n.label}
                    className={view === n.id && !search ? "active" : ""}
                    onClick={() => navigate(n.id)}
                  >
                    <n.icon size={18} />
                    <span>
                      {n.id === "creation"
                        ? project && isWorldLibrary(project)
                          ? "共通設定を作る"
                          : "構成・本文を作る"
                        : n.id === "world"
                          ? project && isWorldLibrary(project)
                            ? "共通設定の一覧"
                            : "使う設定・専用設定"
                          : "人物を編集"}
                    </span>
                  </button>
                ))}
              <details
                open={toolsExpanded}
                onToggle={(e) => {
                  const open = e.currentTarget.open;
                  setToolsExpanded(open);
                  try {
                    localStorage.setItem(
                      "tsuzuriniwa:tools-expanded",
                      String(open),
                    );
                  } catch {}
                }}
              >
                <summary>補助ツール</summary>
                {nav
                  .filter(
                    (n) => !["creation", "world", "character"].includes(n.id),
                  )
                  .map((n) => (
                    <button
                      className={view === n.id && !search ? "active" : ""}
                      key={n.id}
                      onClick={() =>
                        n.id === "studio"
                          ? showStudio("history")
                          : navigate(n.id)
                      }
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
              </details>
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
                onClick={() => {
                  setLibraryKind("story");
                  navigate("projects");
                }}
              >
                <FolderOpen size={17} />
                ストーリー管理
              </button>
              <button
                className="sidebar-bottom-button"
                onClick={() => {
                  setLibraryKind("world");
                  navigate("projects");
                }}
              >
                <Globe2 size={17} />
                世界観ライブラリ
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
            <div
              className="sidebar-scrim"
              onClick={() => setMobileMenu(false)}
            />
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
                <button
                  className="workspace-picker-back"
                  onClick={() => {
                    setSession("picker");
                    setInspectorOpen(false);
                  }}
                >
                  <FolderOpen size={16} />
                  プロジェクト
                </button>
                <ChevronRight size={13} />
                {project && parentWorld(data, project) && (
                  <>
                    <button
                      className="breadcrumb-parent"
                      onClick={() =>
                        selectProject(parentWorld(data, project)!.id)
                      }
                    >
                      {parentWorld(data, project)!.name}
                    </button>
                    <ChevronRight size={13} />
                  </>
                )}
                <button onClick={() => navigate("dashboard")}>
                  {project?.name || "綴庭"}
                </button>
              </div>
              <div className="top-actions">
                <button
                  className="icon-button mobile-search-toggle"
                  aria-label="設定を検索する"
                  onClick={() => {
                    setMobileSearchOpen(!mobileSearchOpen);
                    requestAnimationFrame(() => searchRef.current?.focus());
                  }}
                >
                  <Search size={18} />
                </button>
                <div
                  className={`global-search ${mobileSearchOpen ? "mobile-search-open" : ""}`}
                >
                  <Search size={15} />
                  <input
                    ref={searchRef}
                    aria-label="すべての設定を検索"
                    placeholder="世界の中を検索…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setMobileProjectHome(false);
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
                  {data.theme === "dark" ? (
                    <Sun size={17} />
                  ) : (
                    <Moon size={17} />
                  )}
                </button>
                <button
                  className="icon-button mobile-context-toggle"
                  aria-label="親の世界観・関連資料を開く"
                  onClick={toggleContext}
                >
                  <Link2 size={18} />
                </button>
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
                    if (saveState === "保存済み")
                      void updateServiceWorker(true);
                    else setNotice("保存が完了してから更新してください。");
                  }}
                >
                  更新する
                </button>
              </div>
            )}
            <InstallApp />
            {isAndroidApp && (
              <AndroidUpdates saveState={saveState} notice={setNotice} />
            )}
            {project && !["settings", "projects"].includes(view) && (
              <div className="workspace-scope-strip">
                <span>
                  {isWorldLibrary(project) ? "世界観を編集中" : "物語を編集中"}
                </span>
                <strong>
                  {isWorldLibrary(project)
                    ? "この世界の共通設定"
                    : parentWorld(data, project)
                      ? `${parentWorld(data, project)!.name} の設定に準拠`
                      : "親の世界観は未設定"}
                </strong>
                {!isWorldLibrary(project) && (
                  <button
                    className="text-button"
                    onClick={() => editProject(project)}
                  >
                    親を選ぶ・変更
                  </button>
                )}
              </div>
            )}
            {project && (
              <MobileProjectMenu
                project={project}
                onEdit={() => navigate("creation")}
                onPeople={() => {
                  if (isWorldLibrary(project)) {
                    navigate("character");
                  } else {
                    navigate("creation");
                    setCreationSection("cast");
                  }
                }}
                onSettings={() => {
                  navigate("creation");
                  setCreationSection("references");
                }}
                onTime={() => navigate("event")}
                onContext={() => setInspectorOpen(true)}
                onProject={() => editProject(project)}
              />
            )}
            <main
              className={`main-content ${mobileProjectHome ? "mobile-home-active" : ""}`}
            >
              <GitHubSync
                data={data}
                saveState={saveState}
                expanded={
                  view === "settings" &&
                  settingsTab === "sync" &&
                  !search &&
                  !selected
                }
                onOpen={() => {
                  setSettingsTab("sync");
                  navigate("settings");
                }}
                onReplace={(incoming) =>
                  change(() => organizeStories(incoming), "", false)
                }
              />
              {project &&
                !["settings", "projects", "creation"].includes(view) && (
                  <TimeSwitcher
                    data={data}
                    projectId={currentId}
                    value={timeSelection}
                    onChange={setTimeSelection}
                    onManage={() => showStudio("eras")}
                  />
                )}
              {project &&
                !selected &&
                !["settings", "projects", "creation"].includes(view) && (
                  <section
                    className="panel workspace-context"
                    aria-label="ストーリーと参照資料"
                  >
                    <strong>
                      {isWorldLibrary(project)
                        ? "世界観の設定資料"
                        : "ストーリー"}
                      ：{project.name}
                    </strong>
                    {isWorldLibrary(project) ? (
                      <>
                        <p>
                          人物・国家・歴史などの事前情報です。参照するストーリーからも同じ資料を使えます。
                        </p>
                        <button
                          className="button subtle"
                          onClick={() => {
                            setProjectDraft({
                              ...newProject(),
                              collectionId: currentId,
                              worldIds: [currentId],
                            });
                            setProjectNew(true);
                          }}
                        >
                          <Plus size={16} />
                          この世界観を使うストーリーを作成
                        </button>
                      </>
                    ) : (
                      <>
                        <p>
                          参照する世界観：
                          {referencedWorldIds(data, project)
                            .map(
                              (id) =>
                                data.projects.find((p) => p.id === id)?.name,
                            )
                            .filter(Boolean)
                            .join("、") ||
                            "未選択（ストーリーだけでも使えます）"}
                        </p>
                        <button
                          className="button subtle"
                          onClick={() => {
                            setProjectDraft({ ...project });
                            setProjectNew(false);
                          }}
                        >
                          参照する世界観を変更
                        </button>
                      </>
                    )}
                    {sharedIds.size > 1 && (
                      <small>
                        参照資料の設定：
                        {
                          projectEntries.filter(
                            (e) => e.projectId !== currentId,
                          ).length
                        }
                        件 ／ この保存先の設定：
                        {
                          projectEntries.filter(
                            (e) => e.projectId === currentId,
                          ).length
                        }
                        件。資料の編集は、参照するストーリーにも反映されます。
                      </small>
                    )}
                  </section>
                )}
              {search.trim() ? (
                <>
                  <div className="page-title">
                    <div>
                      <span className="eyebrow">SEARCH YOUR UNIVERSE</span>
                      <h1>「{search}」の検索結果</h1>
                      <p className="muted">
                        全ストーリーから、本文・真相・自由項目・タグまで検索します。
                      </p>
                    </div>
                    <span className="count">
                      {allSearch.length +
                        searchProjects.length +
                        studioSearch.length}{" "}
                      件
                    </span>
                  </div>
                  {searchProjects.length > 0 && (
                    <section className="section">
                      <h2>ストーリー・世界観資料</h2>
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
                      <EntryCard
                        key={e.id}
                        entry={e}
                        source={`${e.projectId === currentId ? "この物語" : sharedIds.has(e.projectId) ? "世界観資料" : "別の保存先"}：${data.projects.find((p) => p.id === e.projectId)?.name || ""}`}
                        onOpen={() => open(e.id)}
                        onActions={() =>
                          setActionTarget({ kind: "entry", id: e.id })
                        }
                      />
                    ))}
                  </div>
                  {studioSearch.length > 0 && (
                    <section className="section">
                      <h2>創作スタジオ</h2>
                      <div className="studio-list">
                        {studioSearch.map((item) => (
                          <button
                            key={`${item.tab}:${item.id}`}
                            className="panel studio-result"
                            onClick={() => {
                              setSearch("");
                              setTimeSelection({ eraId: "" });
                              if (item.projectId) setProjectId(item.projectId);
                              showStudio(item.tab, item.id);
                            }}
                          >
                            <span>
                              <strong>{item.title}</strong>
                              <small>
                                {item.detail} ·{" "}
                                {data.projects.find(
                                  (p) => p.id === item.projectId,
                                )?.name || "すべての作品"}
                              </small>
                            </span>
                            <ArrowRight size={17} />
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                  {!allSearch.length &&
                    !searchProjects.length &&
                    !studioSearch.length && (
                      <div className="empty-state">
                        <Search size={35} />
                        <h2>見つかりませんでした</h2>
                        <p>別のキーワードや #タグ をお試しください。</p>
                      </div>
                    )}
                </>
              ) : selected && historical ? (
                <EraEntryPreview
                  entry={selected}
                  data={readingData}
                  onOpen={open}
                  onBack={() => setEntryId("")}
                  onEdit={() => {
                    setTimeSelection({ eraId: "" });
                  }}
                />
              ) : selected ? (
                <>
                  <div className="entry-studio-tools">
                    <button
                      className="button subtle"
                      onClick={() => navigate("creation")}
                    >
                      制作画面へ戻る
                    </button>
                    <button
                      className="button subtle"
                      onClick={() => showStudio("history", selected.id)}
                    >
                      変更履歴
                    </button>
                    <button
                      className="button subtle"
                      onClick={() => showStudio("impact", selected.id)}
                    >
                      変更の影響を見る
                    </button>
                    <button
                      className="button subtle"
                      onClick={() => showStudio("knowledge", selected.id)}
                    >
                      人物の認識
                    </button>
                    <button
                      className="button subtle"
                      onClick={() => showStudio("eras", selected.id)}
                    >
                      時代別の案
                    </button>
                    <button
                      className="button subtle"
                      onClick={() => {
                        change((d) => checkpoint(d, "entry", selected));
                        setNotice("現在の版を履歴に保存しました。");
                      }}
                    >
                      版を保存
                    </button>
                  </div>
                  {project && selected.projectId !== currentId && (
                    <div className="editing-owner-banner">
                      <Globe2 size={20} />
                      <div>
                        <strong>
                          親・共有元「
                          {
                            data.projects.find(
                              (p) => p.id === selected.projectId,
                            )?.name
                          }
                          」の共通設定を編集中
                        </strong>
                        <p>
                          変更はこの設定を使う物語にも反映されます。物語だけの役割や状態は、制作画面の専用設定で編集してください。
                        </p>
                      </div>
                      <button
                        className="button subtle"
                        onClick={() => {
                          setEntryId("");
                          navigate("creation");
                        }}
                      >
                        物語の編集へ戻る
                      </button>
                    </div>
                  )}
                  <EntryEditor
                    key={selected.id}
                    entry={selected}
                    saveState={saveState}
                    onCreateSyndrome={() => createSyndrome(selected)}
                    data={data}
                    onChange={updateEntry}
                    onBack={() => setEntryId("")}
                    onOpen={open}
                    onDelete={() => removeEntry(selected)}
                    onError={setNotice}
                    onRelation={() => setRelationOpen(true)}
                  />
                </>
              ) : (
                <>
                  {view === "creation" && (
                    <Suspense
                      fallback={
                        <div className="studio-empty" role="status">
                          制作画面を開いています…
                        </div>
                      }
                    >
                      <CreationWorkspace
                        key={`${currentId}:${creationSceneId}:${creationSection}`}
                        data={data}
                        projectId={currentId}
                        saveState={saveState}
                        notice={setNotice}
                        change={change}
                        confirm={setConfirm}
                        onOpen={open}
                        initialSceneId={creationSceneId}
                        initialSection={creationSection}
                        onSelectionChange={setFocusedWorldEntryId}
                        onOverview={() => navigate("dashboard")}
                        onStartStory={() => {
                          setProjectDraft({
                            ...newProject(),
                            collectionId: currentId,
                            worldIds: [currentId],
                          });
                          setProjectNew(true);
                        }}
                        onEditProject={() => {
                          if (project) {
                            setProjectDraft({ ...project });
                            setProjectNew(false);
                          }
                        }}
                        onRelation={(id) => {
                          setRelationInitialId(id);
                          setRelationOpen(true);
                        }}
                      />
                    </Suspense>
                  )}
                  {view === "studio" && (
                    <Suspense
                      fallback={
                        <div className="studio-empty" role="status">
                          スタジオを開いています…
                        </div>
                      }
                    >
                      <StudioHub
                        data={data}
                        projectId={currentId}
                        change={change}
                        onOpen={open}
                        notice={setNotice}
                        confirm={setConfirm}
                        focusId={studioFocus}
                        onNavigate={showStudio}
                        onWriteScene={(id) => {
                          setCreationSceneId(id);
                          navigate("creation");
                        }}
                        tab={studioTab}
                        selection={timeSelection}
                        onTimeChange={setTimeSelection}
                        onPublicPreview={setPublicPreview}
                        key={`${studioTab}:${studioFocus}`}
                      />
                    </Suspense>
                  )}
                  {view === "dashboard" && (
                    <>
                      {project && (
                        <button
                          className="button primary creation-launch"
                          onClick={() => navigate("creation")}
                        >
                          <PanelsTopLeft size={18} />
                          {isWorldLibrary(project)
                            ? "世界観を作る"
                            : "ストーリーを作る"}{" "}
                          · 制作画面を開く
                        </button>
                      )}
                      <div className="page-title dashboard-title">
                        <div>
                          <span className="eyebrow">
                            YOUR STORY, YOUR UNIVERSE
                          </span>
                          <h1>物語の庭へ、おかえりなさい。</h1>
                          <p>
                            ひとつひとつの設定が、あなたの世界をつくっていく。
                          </p>
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
                            新しい設定
                            <span className="desktop-only">を追加</span>
                          </button>
                        </div>
                      </div>
                      {project ? (
                        <div className="dashboard-content">
                          <CardSurface
                            onActions={() =>
                              setActionTarget({
                                kind: "project",
                                id: project.id,
                              })
                            }
                            className="project-hero"
                            {...homeSection("hero")}
                          >
                            <button
                              className="hero-open"
                              aria-label={`${project.name}を編集`}
                              onClick={() => editProject(project)}
                            />
                            <CardMenuButton
                              name={project.name}
                              onClick={() =>
                                setActionTarget({
                                  kind: "project",
                                  id: project.id,
                                })
                              }
                            />
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
                                ストーリーを編集
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
                          </CardSurface>
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
                          <section
                            className="section"
                            {...homeSection("recent")}
                          >
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
                                    source={`${e.projectId === currentId ? "この物語" : sharedIds.has(e.projectId) ? "世界観資料" : "別の保存先"}：${data.projects.find((p) => p.id === e.projectId)?.name || ""}`}
                                    key={e.id}
                                    onOpen={() => open(e.id)}
                                    onActions={() =>
                                      setActionTarget({
                                        kind: "entry",
                                        id: e.id,
                                      })
                                    }
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
                              {!projectEntries.some(
                                (e) => e.kind === "clue",
                              ) && (
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
                                <button
                                  className="text-button"
                                  onClick={backup}
                                >
                                  JSONバックアップ
                                  <Download size={13} />
                                </button>
                              </div>
                            </section>
                          </div>
                          {!preferences.dashboard.length && (
                            <div className="empty-state panel">
                              <Palette size={32} />
                              <p>
                                ホーム画面の項目はすべて非表示になっています。
                              </p>
                              <button
                                className="button subtle"
                                onClick={customize}
                              >
                                表示項目を選ぶ
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="empty-state panel">
                          <Sprout size={45} />
                          <h2>あなたの物語を、ここから。</h2>
                          <p>最初のストーリーを作成しましょう。</p>
                          <button
                            className="button primary"
                            onClick={() => makeProject()}
                          >
                            <Plus size={16} />
                            ストーリーを作成
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
                          <div className="page-actions">
                            {view === "world" && (
                              <button
                                className="button subtle"
                                onClick={() => createSyndrome()}
                              >
                                <Plus size={17} />
                                症候群を追加
                              </button>
                            )}
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
                          </div>
                        )}
                      </div>
                      {view === "family" ? (
                        <FamilyGraph
                          data={readingData}
                          readOnly={historical}
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
                          onAutoLayout={() =>
                            setConfirm({
                              title: "血縁から自動配置しますか？",
                              message:
                                "この作品の手動位置を置き換えます。人物の内容や関係は変更しません。取り消しもできます。",
                              action: () =>
                                change((d) => ({
                                  ...d,
                                  positions: {
                                    ...d.positions,
                                    ...familyLayout(d, currentId),
                                  },
                                })),
                            })
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
                                        !projectEntries.some(
                                          (e) => e.id === id,
                                        ),
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
                            <SettingGenrePicker
                              entries={projectEntries.filter(
                                (e) => e.kind === "world",
                              )}
                              categories={categoryOptions(data)}
                              value={
                                category === "すべて" ? "" : `world:${category}`
                              }
                              label="設定のジャンル"
                              kinds={false}
                              onChange={(next) =>
                                setCategory(next ? next.slice(6) : "すべて")
                              }
                              onAdd={(name) => {
                                change((d) => ({
                                  ...d,
                                  categories: [
                                    ...new Set([...d.categories, name]),
                                  ],
                                }));
                                setCategory(name);
                              }}
                              addLabel="カテゴリ"
                            />
                          )}
                          <div className="list-toolbar">
                            <span className="muted small">
                              {view === "event"
                                ? timeline.length
                                : visible.length}{" "}
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
                                  onChange={(e) =>
                                    setClueFilter(e.target.value)
                                  }
                                >
                                  <option value="すべて">
                                    すべての回収状況
                                  </option>
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
                                  onChange={(e) =>
                                    setTimelineScope(e.target.value)
                                  }
                                >
                                  <option value="">すべての人物・国家</option>
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
                                onChange={(e) =>
                                  setStatusFilter(e.target.value)
                                }
                              >
                                <option value="すべて">すべての状態</option>
                                {statusOptions(data).map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          {view === "event" ? (
                            <TimelineBoard
                              key={currentId}
                              data={readingData}
                              projectId={currentId}
                              entries={timeline}
                              onOpen={open}
                              onActions={(id) =>
                                setActionTarget({ kind: "entry", id })
                              }
                              readOnly={historical}
                              onOrder={(ids) =>
                                change(
                                  (d) => ({
                                    ...d,
                                    projects: d.projects.map((p) =>
                                      p.id === currentId
                                        ? {
                                            ...p,
                                            eventOrder: ids,
                                            updatedAt: now(),
                                          }
                                        : p,
                                    ),
                                  }),
                                  `timeline:${currentId}`,
                                )
                              }
                            />
                          ) : visible.length ? (
                            <div className="card-grid">
                              {visible.map((e) => (
                                <EntryCard
                                  key={e.id}
                                  entry={e}
                                  source={`${e.projectId === currentId ? "この物語" : sharedIds.has(e.projectId) ? "世界観資料" : "別の保存先"}：${data.projects.find((p) => p.id === e.projectId)?.name || ""}`}
                                  onOpen={() => open(e.id)}
                                  onActions={() =>
                                    setActionTarget({ kind: "entry", id: e.id })
                                  }
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
                          <span className="eyebrow">
                            A SHELF OF YOUR WORLDS
                          </span>
                          <h1>
                            {libraryKind === "world"
                              ? "世界観ライブラリ"
                              : "ストーリー"}
                          </h1>
                          <p>
                            世界観・シリーズ・作品をツリーで整理し、ストーリーから世界観の設定を参照できます。
                          </p>
                        </div>
                        <button
                          className="button primary"
                          onClick={() => makeProject(libraryKind)}
                        >
                          <Plus size={16} />
                          {libraryKind === "world"
                            ? "世界観を作成"
                            : "新しいストーリー"}
                        </button>
                      </div>
                      <ProjectTree
                        data={data}
                        onOpen={selectProject}
                        onEdit={editProject}
                        onCreate={(kind, parentId) => {
                          setProjectDraft({
                            ...newProject(kind === "world" ? "world" : "story"),
                            type:
                              kind === "series"
                                ? "シリーズ"
                                : kind === "world"
                                  ? "世界観"
                                  : "作品",
                            collectionId: parentId,
                            worldIds: shelfSources(data, parentId),
                          });
                          setProjectNew(true);
                        }}
                        onMove={(id, parentId) => {
                          try {
                            const moved = moveOnShelf(data, id, parentId);
                            validateBackup(moved);
                            change(() => moved);
                            setNotice(
                              "ツリーの所属を変更しました。以前の参照も保持しています。",
                            );
                          } catch {
                            setNotice(
                              "この場所へ移動できません。参照関係やシリーズの所属を確認してください。",
                            );
                          }
                        }}
                      />
                      <div
                        className="library-tabs"
                        aria-label="ストーリーと世界観の切替"
                      >
                        <button
                          className="button subtle"
                          aria-pressed={libraryKind === "story"}
                          onClick={() => setLibraryKind("story")}
                        >
                          ストーリー
                        </button>
                        <button
                          className="button subtle"
                          aria-pressed={libraryKind === "world"}
                          onClick={() => setLibraryKind("world")}
                        >
                          世界観ライブラリ
                        </button>
                      </div>
                      <div className="project-grid">
                        {data.projects
                          .filter(
                            (p) =>
                              isWorldLibrary(p) === (libraryKind === "world"),
                          )
                          .map((p) => (
                            <CardSurface
                              className="panel project-card"
                              key={p.id}
                              onActions={() =>
                                setActionTarget({ kind: "project", id: p.id })
                              }
                            >
                              <CardMenuButton
                                name={p.name}
                                onClick={() =>
                                  setActionTarget({ kind: "project", id: p.id })
                                }
                              />
                              {p.image ? (
                                <img
                                  className="project-cover"
                                  src={p.image}
                                  alt=""
                                />
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
                                  {isWorldLibrary(p)
                                    ? "独立した設定資料"
                                    : `参照世界観：${
                                        referencedWorldIds(data, p)
                                          .map(
                                            (id) =>
                                              data.projects.find(
                                                (source) => source.id === id,
                                              )?.name,
                                          )
                                          .filter(Boolean)
                                          .join("、") || "なし"
                                      }`}
                                </small>
                                <h2>{p.name || "名前未設定"}</h2>
                                <p>
                                  {p.description || "説明はまだありません。"}
                                </p>
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
                                    {isWorldLibrary(p)
                                      ? "資料をひらく"
                                      : "ストーリーをひらく"}
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
                            </CardSurface>
                          ))}
                      </div>
                      {!data.projects.some(
                        (p) => isWorldLibrary(p) === (libraryKind === "world"),
                      ) && (
                        <div className="empty-state">
                          <p>新しいストーリーを作成して始めましょう。</p>
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
                      <nav
                        className="settings-sections-nav"
                        aria-label="アプリ設定の分類"
                      >
                        {[
                          ["general", "基本設定"],
                          ["appearance", "見た目"],
                          ["transfer", "データの受け渡し"],
                          ["sync", "端末間同期"],
                        ].map(([id, label]) => (
                          <button
                            key={id}
                            className={`button ${settingsTab === id ? "primary" : "subtle"}`}
                            aria-pressed={settingsTab === id}
                            onClick={() => setSettingsTab(id)}
                          >
                            {label}
                          </button>
                        ))}
                      </nav>
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
                      <section className="panel launch-settings">
                        <h2>起動時に開く画面</h2>
                        <p>この端末で次回からどこを開くかを選べます。</p>
                        <div className="choice-group">
                          {(
                            [
                              ["home", "開始画面から始める"],
                              ["resume", "前回のプロジェクトを開く"],
                            ] as const
                          ).map(([id, label]) => (
                            <button
                              key={id}
                              className={launchMode === id ? "selected" : ""}
                              aria-pressed={launchMode === id}
                              onClick={() => {
                                setLaunchMode(id);
                                try {
                                  localStorage.setItem(
                                    "tsuzuriniwa:launch-mode",
                                    id,
                                  );
                                  setNotice("起動方法を保存しました。");
                                } catch {
                                  setNotice(
                                    "この端末に起動設定を保存できませんでした。",
                                  );
                                }
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <button
                          className="text-button"
                          onClick={() => {
                            setSession("home");
                            setMobileMenu(false);
                          }}
                        >
                          開始画面へ戻る
                        </button>
                      </section>
                      <div className="settings-grid">
                        <ProjectPackagePanel
                          data={data}
                          currentId={currentId}
                          notice={setNotice}
                          onImport={() => {
                            setImportMode("add");
                            fileRef.current?.click();
                          }}
                        />
                        <section className="panel settings-panel settings-backup-panel">
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
                                ? new Date(data.lastBackup).toLocaleString(
                                    "ja-JP",
                                  )
                                : "まだ書き出していません"}
                            </strong>
                          </div>
                          <button
                            className="button primary full"
                            onClick={backup}
                          >
                            <Download size={17} />
                            全データをJSONでバックアップ
                          </button>
                          <button
                            className="button subtle full"
                            onClick={() => {
                              setImportMode("replace");
                              fileRef.current?.click();
                            }}
                          >
                            <Upload size={17} />
                            JSONから復元・別の端末へ移行
                          </button>
                          <small>
                            JSONには画像・リンク・人物関係・全ストーリーが含まれます。復元は現在のデータを置き換えます。
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
                          <section className="panel settings-panel settings-export-panel">
                            <h2>
                              <FileText size={20} />
                              Markdownで持ち出す
                            </h2>
                            <p>
                              現在のストーリーと参照する世界観の設定を、読みやすいテキストとして書き出します。画像はJSONバックアップをご利用ください。
                            </p>
                            <button
                              className="button subtle full"
                              disabled={!project}
                              onClick={async () => {
                                try {
                                  const saved = await download(
                                    markdown(data, currentId),
                                    "text/markdown;charset=utf-8",
                                    `${project?.name || "設定集"}.md`,
                                  );
                                  setNotice(
                                    saved
                                      ? "Markdownを書き出しました。"
                                      : "保存をキャンセルしました。",
                                  );
                                } catch {
                                  setNotice("ファイルを保存できませんでした。");
                                }
                              }}
                            >
                              <Download size={16} />「
                              {project?.name || "未選択"}
                              」を書き出す
                            </button>
                          </section>
                          <section className="panel settings-panel settings-general-panel">
                            <h2>
                              <RefreshCw size={20} />
                              アプリの更新
                            </h2>
                            <p>
                              {isAndroidApp
                                ? "新しいAPKを確認します。更新が見つかったら、表示される確認画面の「APKを更新」を押してください。Androidの確認画面から更新すると作品データを引き継ぎます。"
                                : "新しい機能や修正を確認できます。更新が見つかったら、保存を確認してから画面上部の「更新する」を押してください。"}
                            </p>
                            <button
                              className="button subtle full"
                              disabled={checkingUpdate}
                              onClick={() => void checkAppUpdate(true)}
                            >
                              <RefreshCw size={17} />
                              {checkingUpdate
                                ? "更新を確認中…"
                                : "アプリの更新を確認"}
                            </button>
                            <small className="app-version">
                              アプリの版：{__APP_VERSION__}
                            </small>
                          </section>
                          <section className="panel settings-panel settings-general-panel">
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
                                    theme:
                                      d.theme === "dark" ? "light" : "dark",
                                  }))
                                }
                              >
                                {data.theme === "dark" ? "ダーク" : "ライト"}
                                モード
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
          {project && !["settings", "projects"].includes(view) && (
            <div
              className={`workspace-context-panel ${inspectorOpen ? "is-open" : ""}`}
            >
              <button
                className="icon-button context-close"
                aria-label="関連資料を閉じる"
                onClick={() => setInspectorOpen(false)}
              >
                <X size={20} />
              </button>
              <WorkspaceContext
                data={data}
                project={project}
                activeEntryId={
                  entryId || (view === "creation" ? focusedWorldEntryId : "")
                }
                onOpen={selectProject}
                onEntry={(id) => {
                  open(id);
                  setInspectorOpen(false);
                }}
                onParent={() => editProject(project)}
                onOverview={() => {
                  navigate("dashboard");
                  setInspectorOpen(false);
                }}
                onCreate={() => {
                  setProjectDraft({
                    ...newProject(),
                    collectionId: currentId,
                    worldIds: [currentId],
                  });
                  setProjectNew(true);
                }}
              />
            </div>
          )}
          {inspectorOpen && (
            <button
              className="context-scrim"
              aria-label="関連資料を閉じる"
              onClick={() => setInspectorOpen(false)}
            />
          )}
          <nav className="bottom-nav" aria-label="スマートフォンナビゲーション">
            <button
              onClick={() => {
                setSession("picker");
                setInspectorOpen(false);
              }}
            >
              <FolderOpen size={21} />
              <span>プロジェクト</span>
            </button>
            <button
              className={!inspectorOpen && !mobileMenu ? "active" : ""}
              onClick={() => {
                setMobileProjectHome(false);
                setInspectorOpen(false);
                navigate("creation");
              }}
            >
              <PanelsTopLeft size={21} />
              <span>編集</span>
            </button>
            <button
              className={inspectorOpen ? "active" : ""}
              onClick={toggleContext}
            >
              <Link2 size={21} />
              <span>関連資料</span>
            </button>
            <button
              className={mobileMenu ? "active" : ""}
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <MoreHorizontal size={22} />
              <span>その他</span>
            </button>
          </nav>
        </>
      )}
      {notice && (
        <div className="toast" role="status">
          <Check size={16} />
          <span>{notice}</span>
          {undoNotice && (
            <button className="toast-undo" onClick={undo}>
              <Undo2 size={15} />
              元に戻す
            </button>
          )}
          <button
            className="icon-button"
            aria-label="通知を閉じる"
            onClick={() => setNotice("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {actionTarget &&
        (() => {
          const target =
            actionTarget.kind === "project"
              ? data.projects.find((p) => p.id === actionTarget.id)
              : data.entries.find((e) => e.id === actionTarget.id);
          if (!target) return null;
          const act = (fn: () => void) => {
            setActionTarget(null);
            fn();
          };
          return (
            <Modal
              variant="actions"
              label={`${target.name}の操作`}
              onClose={() => setActionTarget(null)}
            >
              <div className="sheet-handle" aria-hidden="true" />
              <div className="modal-heading">
                <div>
                  <span className="eyebrow">
                    {actionTarget.kind === "project"
                      ? "PROJECT"
                      : kindLabels[(target as Entry).kind]}
                  </span>
                  <h2>{target.name || "名前未設定"}</h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="閉じる"
                  onClick={() => setActionTarget(null)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="action-list">
                <button
                  onClick={() =>
                    act(() =>
                      actionTarget.kind === "project"
                        ? editProject(target as Project)
                        : open(target.id),
                    )
                  }
                >
                  <Pencil size={20} />
                  <span>
                    編集する<small>名前や内容を自由に書き換える</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
                {actionTarget.kind === "entry" && (
                  <button
                    onClick={() => act(() => duplicateEntry(target as Entry))}
                  >
                    <Copy size={20} />
                    <span>
                      複製する<small>元の設定を残して、新しい設定を作る</small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                )}
                {actionTarget.kind === "project" && (
                  <>
                    <button
                      onClick={() =>
                        act(() => {
                          void download(
                            markdown(data, target.id),
                            "text/markdown",
                            `${target.name || "作品"}.md`,
                          )
                            .then((saved) =>
                              setNotice(
                                saved
                                  ? "作品の設定をMarkdownで書き出しました。"
                                  : "保存をキャンセルしました。",
                              ),
                            )
                            .catch(() =>
                              setNotice("ファイルを保存できませんでした。"),
                            );
                        })
                      }
                    >
                      <Download size={20} />
                      <span>
                        Markdownで書き出す
                        <small>参照する世界観の設定も含める</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                    <button onClick={() => act(customize)}>
                      <Palette size={20} />
                      <span>
                        ホームをカスタマイズ
                        <small>色・文字・カードの表示順を整える</small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
                <button
                  className="action-danger"
                  onClick={() =>
                    act(() =>
                      actionTarget.kind === "project"
                        ? removeProject(target as Project)
                        : removeEntry(target as Entry),
                    )
                  }
                >
                  <Trash2 size={20} />
                  <span>
                    削除する<small>削除する前に確認します</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              </div>
              <button
                className="button subtle full sheet-cancel"
                onClick={() => setActionTarget(null)}
              >
                キャンセル
              </button>
            </Modal>
          );
        })()}
      {syndromeFor && (
        <Modal label="症候群を作る" onClose={() => setSyndromeFor(null)}>
          <SyndromeForm
            projectId={syndromeFor.projectId}
            characterName={
              syndromeFor.characterId
                ? data.entries.find((e) => e.id === syndromeFor.characterId)
                    ?.name || "名前未設定"
                : undefined
            }
            onClose={() => setSyndromeFor(null)}
            onSave={(syndrome) => {
              const characterId = syndromeFor.characterId;
              change((d) => ({
                ...d,
                categories: [...new Set([...d.categories, syndromeCategory])],
                entries: [
                  ...d.entries.map((e) =>
                    e.id === characterId
                      ? {
                          ...e,
                          links: [...e.links, syndrome.id],
                          updatedAt: now(),
                        }
                      : e,
                  ),
                  syndrome,
                ],
              }));
              setSyndromeFor(null);
              if (!characterId) {
                setEntryId(syndrome.id);
                setProjectId(syndrome.projectId);
                setView("world");
                setCategory(syndromeCategory);
                setSearch("");
                window.scrollTo({ top: 0 });
              }
              setNotice(
                characterId
                  ? "症候群を作成して人物に紐づけました。"
                  : "症候群を作成しました。",
              );
            }}
          />
        </Modal>
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
              if (
                !isWorldLibrary(p) &&
                p.type !== "シリーズ" &&
                data.projects.some((child) => child.collectionId === p.id)
              ) {
                setNotice(
                  "作品を含むシリーズです。先にツリーで中の作品を別の所属へ移動してください。",
                );
                return;
              }
              if (
                !projectNew &&
                JSON.stringify(p.worldIds) !==
                  JSON.stringify(projectDraft.worldIds)
              ) {
                const candidate = {
                  ...data,
                  projects: data.projects.map((item) =>
                    item.id === p.id ? p : item,
                  ),
                };
                if (
                  candidate.relations.some((relation) => {
                    const scope = sharedProjectIds(
                      candidate,
                      relation.projectId,
                    );
                    return [relation.from, relation.to].some(
                      (id) =>
                        !scope.has(
                          candidate.entries.find((entry) => entry.id === id)
                            ?.projectId || "",
                        ),
                    );
                  })
                ) {
                  setNotice(
                    "参照を外すと人物関係が参照範囲の外になります。先に該当する人物関係を整理してください。",
                  );
                  return;
                }
              }
              if (
                !projectNew &&
                !isWorldLibrary(p) &&
                p.collectionId !== projectDraft.collectionId
              ) {
                try {
                  const updated = reparentWorkspace(
                    data,
                    p,
                    p.collectionId || "",
                  );
                  change(() => updated, p.id);
                  setProjectDraft(
                    updated.projects.find((item) => item.id === p.id)!,
                  );
                } catch (error) {
                  setNotice(
                    error instanceof Error
                      ? error.message
                      : "親を変更できませんでした。",
                  );
                }
                return;
              }
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
        <Modal
          onClose={() => {
            setRelationOpen(false);
            setRelationInitialId(undefined);
          }}
        >
          <RelationForm
            data={data}
            projectId={currentId}
            initialFrom={
              relationInitialId ||
              (selected?.kind === "character" ? selected.id : undefined)
            }
            onCancel={() => {
              setRelationOpen(false);
              setRelationInitialId(undefined);
            }}
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
          <h2>
            {importMode === "add"
              ? "世界観・ストーリーを追加しますか？"
              : "バックアップを復元しますか？"}
          </h2>
          <p className="confirm-message">
            読み込んだ {imported.projects.length} ストーリー・
            {imported.entries.length} 件の設定を
            {importMode === "add"
              ? "別のコピーとして追加します。現在のデータ・表示設定は保持します。"
              : "使って、現在の全データを置き換えます。復元前に現在のJSONを書き出すことをおすすめします。"}
          </p>
          <ul className="package-import-preview">
            {imported.projects.map((p) => (
              <li key={p.id}>
                {p.name}（{isWorldLibrary(p) ? "世界観" : p.type}）
              </li>
            ))}
          </ul>
          <button className="button subtle full" onClick={backup}>
            <Download size={16} />
            現在のデータを先にバックアップ
          </button>
          <div className="modal-footer">
            <button className="button subtle" onClick={() => setImported(null)}>
              キャンセル
            </button>
            <button
              className={`button ${importMode === "add" ? "primary" : "danger-fill"}`}
              onClick={() => {
                try {
                  if (importMode === "add") {
                    change((d) => addProjectPackage(d, imported));
                    setNotice(
                      "世界観・ストーリーを追加しました。既存データは保持しています。",
                    );
                  } else {
                    change(() => imported, "", false);
                    setProjectId(imported.projects[0]?.id || "");
                    navigate("dashboard");
                    setNotice("バックアップを復元しました。");
                  }
                  setImported(null);
                } catch (error) {
                  setNotice(
                    error instanceof Error
                      ? error.message
                      : "読み込めませんでした。",
                  );
                }
              }}
            >
              {importMode === "add"
                ? "既存データを残して追加"
                : "全データを置き換えて復元"}
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

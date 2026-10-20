import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Cloud,
  CloudUpload,
  CloudOff,
  Download,
  KeyRound,
  RefreshCw,
  X,
} from "lucide-react";
import {
  fingerprint,
  readRemote,
  syncDecision,
  SyncError,
  verifyPrivate,
  writeRemote,
} from "./githubSync";
import type { RemoteSnapshot, SyncConnection } from "./githubSync";
import type { Data } from "./model";
import { readLocalSetting, writeLocalSetting } from "./storage";

type Pending = {
  connection: SyncConnection;
  remote: RemoteSnapshot | null;
  reason: "initial" | "conflict";
};
const key = "github-sync-connection";
export default function GitHubSync({
  data,
  saveState,
  expanded,
  onReplace,
  onOpen,
}: {
  data: Data;
  saveState: string;
  expanded: boolean;
  onReplace: (data: Data) => void;
  onOpen: () => void;
}) {
  const latest = useRef({ data, saveState, onReplace });
  latest.current = { data, saveState, onReplace };
  const [connection, setConnection] = useState<SyncConnection | null>(null);
  const current = useRef(connection);
  current.current = connection;
  const [owner, setOwner] = useState("raid-arch"),
    [repo, setRepo] = useState("storymaker-data"),
    [token, setToken] = useState("");
  const [remember, setRemember] = useState(true);
  const rememberRef = useRef(remember);
  rememberRef.current = remember;
  const [status, setStatus] = useState("未接続"),
    [problem, setProblem] = useState(""),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<Pending | null>(null),
    [ready, setReady] = useState(false);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const dialog = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const paused = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const active = useRef(true);
  const syncRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    active.current = true;
    void readLocalSetting<SyncConnection>(key)
      .then((saved) => {
        if (
          active.current &&
          saved &&
          typeof saved.token === "string" &&
          typeof saved.hash === "string"
        ) {
          setConnection(saved);
          setOwner(saved.owner);
          setRepo(saved.repo);
          setStatus("接続を確認中");
        }
      })
      .catch(() =>
        setProblem("接続情報を読み込めませんでした。再接続してください。"),
      )
      .finally(() => {
        if (active.current) setReady(true);
      });
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (pending && !dialog.current?.open) dialog.current?.showModal();
  }, [pending]);
  async function rememberConnection(next: SyncConnection) {
    await writeLocalSetting(key, rememberRef.current ? next : undefined);
    if (active.current) {
      current.current = next;
      setConnection(next);
    }
  }
  async function baseline(c: SyncConnection, sha: string | null, hash: string) {
    await rememberConnection({
      ...c,
      sha,
      hash,
      lastSynced: new Date().toISOString(),
    });
  }
  async function replaceSafely(remote: Data, localHash: string) {
    await writeLocalSetting("before-github-sync", latest.current.data);
    if ((await fingerprint(latest.current.data)) !== localHash)
      throw new SyncError(
        "編集中に内容が変わったため、読み込みを止めました。もう一度同期してください。",
      );
    latest.current.onReplace(remote);
  }
  function failure(e: unknown) {
    if (e instanceof DOMException && e.name === "AbortError") return;
    setStatus("同期を停止");
    setProblem(
      e instanceof SyncError
        ? e.message
        : "同期できませんでした。通信状態を確認して再試行してください。端末のデータは保持されています。",
    );
  }
  async function sync(manual = false) {
    if (manual) paused.current = false;
    if (paused.current) return;
    const c = current.current;
    if (
      !c ||
      lock.current ||
      pendingRef.current ||
      latest.current.saveState !== "保存済み"
    )
      return;
    if (!navigator.onLine) {
      setStatus("オフライン・接続後に同期");
      return;
    }
    lock.current = true;
    setBusy(true);
    setStatus("同期中…");
    controller.current = new AbortController();
    try {
      const verified = await verifyPrivate(c, controller.current.signal),
        remote = await readRemote(verified, controller.current.signal),
        local = latest.current.data,
        hash = await fingerprint(local),
        remoteHash = remote ? await fingerprint(remote.data) : null;
      const decision = syncDecision(
        hash,
        c.hash,
        remoteHash,
        remote?.sha || null,
        c.sha,
      );
      if (decision === "conflict") {
        paused.current = true;
        setPending({ connection: verified, remote, reason: "conflict" });
        setStatus("保存する内容を確認");
        return;
      }
      if (decision === "pull" && remote) {
        await replaceSafely(remote.data, hash);
        await baseline(verified, remote.sha, remoteHash!);
      } else if (decision === "push") {
        const sha = await writeRemote(
          verified,
          local,
          remote?.sha || null,
          controller.current.signal,
        );
        await baseline(verified, sha, hash);
      } else if (c.sha !== (remote?.sha || null) || c.hash !== hash) {
        await baseline(verified, remote?.sha || null, hash);
      }
      setProblem("");
      setStatus("同期済み");
    } catch (e) {
      failure(e);
    } finally {
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  syncRef.current = sync;
  useEffect(() => {
    if (
      !ready ||
      !connection ||
      pending ||
      paused.current ||
      saveState !== "保存済み"
    )
      return;
    setStatus(navigator.onLine ? "変更を確認中" : "オフライン・接続後に同期");
    const timer = setTimeout(() => void syncRef.current(), 1800);
    return () => clearTimeout(timer);
  }, [data, connection, ready, pending, saveState]);
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState === "visible") void syncRef.current();
    };
    const timer = setInterval(resume, 60000);
    window.addEventListener("online", resume);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", resume);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);
  async function connect() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setProblem("");
    controller.current = new AbortController();
    try {
      if (!token.trim())
        throw new SyncError("GitHubの接続キーを入力してください。");
      const c = await verifyPrivate(
        {
          owner: owner.trim(),
          repo: repo.trim(),
          token: token.trim(),
          sha: null,
          hash: "",
          lastSynced: "",
        },
        controller.current.signal,
      );
      const remote = await readRemote(c, controller.current.signal);
      setPending({ connection: c, remote, reason: "initial" });
      setStatus("最初に使うデータを選択");
    } catch (e) {
      failure(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function choose(direction: "local" | "cloud") {
    if (!pending || lock.current) return;
    const choice = pending;
    lock.current = true;
    setBusy(true);
    setProblem("");
    controller.current = new AbortController();
    try {
      const c = await verifyPrivate(
          choice.connection,
          controller.current.signal,
        ),
        remote = await readRemote(c, controller.current.signal);
      if ((remote?.sha || null) !== (choice.remote?.sha || null)) {
        setPending({ ...choice, remote });
        throw new SyncError(
          "確認中にクラウドが更新されました。新しい内容を確認して選び直してください。",
        );
      }
      const local = latest.current.data,
        hash = await fingerprint(local);
      if (direction === "cloud") {
        if (!remote) throw new SyncError("クラウドのデータはまだありません。");
        const remoteHash = await fingerprint(remote.data);
        await replaceSafely(remote.data, hash);
        await baseline(c, remote.sha, remoteHash);
      } else {
        if (remote) await writeLocalSetting("before-github-sync", remote.data);
        const sha = await writeRemote(
          c,
          local,
          remote?.sha || null,
          controller.current.signal,
        );
        await baseline(c, sha, hash);
      }
      setToken("");
      setPending(null);
      dialog.current?.close();
      paused.current = false;
      setStatus("同期済み");
      setProblem("");
    } catch (e) {
      failure(e);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function disconnect() {
    if (busy) return;
    try {
      await writeLocalSetting(key, undefined);
      current.current = null;
      setConnection(null);
      setToken("");
      setProblem("");
      setStatus("未接続");
    } catch (e) {
      failure(e);
    }
  }
  async function recover() {
    try {
      const copy = await readLocalSetting<Data>("before-github-sync");
      if (!copy) {
        setProblem("同期前の保護コピーはまだありません。");
        return;
      }
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(copy, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "綴庭-同期前の保護コピー.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setProblem("保護コピーを書き出せませんでした。");
    }
  }
  const localData = latest.current.data;
  return (
    <>
      {expanded ? (
        <section className="panel sync-panel" aria-labelledby="sync-title">
          <div className="section-heading">
            <h2 id="sync-title">
              <Cloud size={22} />
              PC・スマホの自動同期
            </h2>
            <span className="sync-status" role="status">
              {busy ? (
                <RefreshCw size={15} />
              ) : connection ? (
                <CloudUpload size={15} />
              ) : (
                <CloudOff size={15} />
              )}{" "}
              {status}
            </span>
          </div>
          <p className="muted small">
            作品専用の非公開GitHubリポジトリに保存します。起動時・端末に戻ったとき・編集後に最新版を確認し、オンライン中は約1分おきにも確認します。
          </p>
          {connection ? (
            <div className="sync-connected">
              <div>
                <strong>
                  {connection.owner}/{connection.repo}
                </strong>
                <small>
                  最終同期：
                  {connection.lastSynced
                    ? new Date(connection.lastSynced).toLocaleString("ja-JP")
                    : "未完了"}
                </small>
              </div>
              <button
                className="button primary"
                disabled={busy || saveState !== "保存済み" || !!pending}
                onClick={() => void sync(true)}
              >
                <RefreshCw size={15} />
                今すぐ同期
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => void disconnect()}
              >
                接続を解除・キーを削除
              </button>
            </div>
          ) : (
            <div className="sync-setup">
              <ol>
                <li>
                  <a
                    href="https://github.com/new?name=storymaker-data&visibility=private"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHubでデータ専用リポジトリを作成 ↗
                  </a>
                  。「Private」を選んでください。
                </li>
                <li>
                  <a
                    href="https://github.com/settings/personal-access-tokens/new"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Fine-grained personal access tokenを作成 ↗
                  </a>
                  。Repository accessでそのリポジトリだけを選び、Repository
                  permissionsの「Contents」を「Read and write」にします。
                </li>
                <li>
                  両端末で同じ保存先と接続キーを設定します。キーはチャットへ送らず、下の欄に入力してください。
                </li>
              </ol>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void connect();
                }}
              >
                <div className="form-row">
                  <label>
                    GitHubの所有者名
                    <input
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                    />
                  </label>
                  <label>
                    非公開リポジトリ名
                    <input
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      value={repo}
                      onChange={(e) => setRepo(e.target.value)}
                    />
                  </label>
                </div>
                <label>
                  接続キー（Personal access token）
                  <div className="sync-key">
                    <KeyRound size={16} />
                    <input
                      type="password"
                      required
                      autoComplete="off"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="github_pat_…"
                      spellCheck={false}
                    />
                  </div>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  この端末に接続情報を保存する
                </label>
                <p className="muted small">
                  接続キーはこのブラウザにのみ保持し、GitHubへの接続に使います。作品JSON・バックアップ・アプリの公開コードには含めません。チェックを外すと、ページの再読み込みやアプリ終了までの接続になります。
                </p>
                <button
                  className="button primary"
                  type="submit"
                  disabled={busy || saveState !== "保存済み"}
                >
                  <Cloud size={16} />
                  接続してデータを確認
                </button>
              </form>
            </div>
          )}
          {problem && (
            <p className="sync-error" role="alert">
              <AlertTriangle size={16} />
              {problem}
            </p>
          )}
          <div className="sync-notes">
            <p>
              オフラインでも端末に自動保存されます。切り替える前に「同期済み」を確認してください。両方の端末が変更されていた場合は自動上書きしません。画像を含む同期データは10MBまでです。
            </p>
            <button className="text-button" onClick={() => void recover()}>
              <Download size={14} />
              同期前の保護コピーを書き出す
            </button>
          </div>
        </section>
      ) : (
        connection && (
          <button
            className={`sync-strip ${problem ? "has-error" : ""}`}
            onClick={onOpen}
          >
            <Cloud size={14} />
            <span>{problem ? "同期に確認が必要です" : status}</span>
            <span>
              {connection.owner}/{connection.repo}
            </span>
          </button>
        )
      )}
      <dialog
        ref={dialog}
        className="modal sync-dialog"
        aria-labelledby="sync-choice-title"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else {
            paused.current = true;
            setPending(null);
            setStatus(connection ? "同期を保留" : "未接続");
          }
        }}
      >
        {pending && (
          <>
            <div className="modal-heading">
              <div>
                <span className="eyebrow">KEEP BOTH WORLDS SAFE</span>
                <h2 id="sync-choice-title">
                  {pending.reason === "initial"
                    ? "最初に使うデータを選ぶ"
                    : "両端末の変更を確認"}
                </h2>
              </div>
              <button
                className="icon-button"
                aria-label="同期の確認を閉じる"
                disabled={busy}
                onClick={() => {
                  paused.current = true;
                  setPending(null);
                  dialog.current?.close();
                  setStatus("同期を保留");
                }}
              >
                <X size={20} />
              </button>
            </div>
            <p className="muted small">
              {pending.reason === "initial"
                ? "接続しただけではデータを置き換えません。最初にどちらを使うか選んでください。"
                : "この端末とクラウドがそれぞれ変更されたか、保存先のファイルが削除されています。自動で上書きせず停止しました。"}
            </p>
            <div className="sync-comparison">
              <div>
                <h3>この端末</h3>
                <p>
                  {localData.projects.length}作品・{localData.entries.length}
                  件の設定
                </p>
                <small>
                  {localData.projects
                    .slice(0, 3)
                    .map((p) => p.name)
                    .join(" / ")}
                </small>
              </div>
              <div>
                <h3>クラウド</h3>
                {pending.remote ? (
                  <>
                    <p>
                      {pending.remote.data.projects.length}作品・
                      {pending.remote.data.entries.length}件の設定
                    </p>
                    <small>
                      更新：
                      {new Date(pending.remote.updatedAt).toLocaleString(
                        "ja-JP",
                      )}
                    </small>
                    <small>
                      {pending.remote.data.projects
                        .slice(0, 3)
                        .map((p) => p.name)
                        .join(" / ")}
                    </small>
                  </>
                ) : (
                  <p>まだ同期データがありません</p>
                )}
              </div>
            </div>
            <p className="muted small">
              読み込み前の端末データ、または置き換え前のクラウドデータを、この端末の保護コピーに残します。選択した内容で全作品を置き換えます。統合はしません。
            </p>
            {problem && (
              <p className="sync-error" role="alert">
                {problem}
              </p>
            )}
            <div className="sync-choice-actions">
              <button
                className="button subtle"
                disabled={busy || !pending.remote}
                onClick={() => void choose("cloud")}
              >
                クラウドの最新版をこの端末で使う
              </button>
              <button
                className="button primary"
                disabled={busy || saveState !== "保存済み"}
                onClick={() => void choose("local")}
              >
                {pending.remote
                  ? "この端末の内容でクラウドを置き換える"
                  : "この端末の内容を初めてクラウドに保存"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}

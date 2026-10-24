import { useEffect, useRef, useState } from "react";
import type { Data } from "./model";
import { fingerprint, syncDecision, SyncError } from "./githubSync";
import {
  driveAccount,
  readDrive,
  writeDrive,
  type DriveAccount,
  type DriveSnapshot,
} from "./googleDrive";
import { googleToken, clearGoogleToken } from "./googleAuth";
import { readLocalSetting, writeLocalSetting } from "./storage";
import { isAndroidApp, saveTextFile } from "./native";
interface Connection {
  account: DriveAccount;
  hash: string;
  sha: string | null;
  fileId: string | null;
  lastSynced: string;
}
interface Choice {
  connection: Connection;
  remote: DriveSnapshot | null;
  local: Data;
  hash: string;
  initial: boolean;
}
const key = "google-drive-sync";
export default function GoogleSync({
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
  const [connection, setConnection] = useState<Connection | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);
  const [clientId, setClientId] = useState(
    import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
  );
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("未接続"),
    [problem, setProblem] = useState(""),
    [choice, setChoice] = useState<Choice | null>(null);
  const latest = useRef({ data, saveState, onReplace, clientId });
  latest.current = { data, saveState, onReplace, clientId };
  const current = useRef(connection);
  current.current = connection;
  const pending = useRef(choice);
  pending.current = choice;
  const active = useRef(false),
    lock = useRef(false),
    paused = useRef(false),
    needsAuth = useRef(false),
    controller = useRef<AbortController | null>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const armDeadline = () => {
    clearTimeout(deadline.current);
    const request = controller.current;
    deadline.current = setTimeout(() => request?.abort(), 45000);
  };
  const syncRef = useRef<(interactive?: boolean) => Promise<void>>(
    async () => {},
  );
  useEffect(() => {
    active.current = true;
    Promise.all([
      readLocalSetting<Connection>(key),
      readLocalSetting<string>("google-web-client-id"),
    ])
      .then(([c, id]) => {
        if (!active.current) return;
        if (id) setClientId(id);
        setSetupOpen(
          !isAndroidApp && !(id || import.meta.env.VITE_GOOGLE_CLIENT_ID),
        );
        if (c?.account?.id && typeof c.hash === "string") {
          current.current = c;
          setConnection(c);
          setStatus(isAndroidApp ? "接続を確認中" : "Googleに再接続して同期");
        }
      })
      .catch(() => setProblem("接続情報を読み込めませんでした。"))
      .finally(() => {
        if (active.current) setReady(true);
      });
    return () => {
      active.current = false;
      controller.current?.abort();
      clearTimeout(deadline.current);
      clearGoogleToken();
    };
  }, []);
  useEffect(() => {
    if (choice && !dialog.current?.open) dialog.current?.showModal();
  }, [choice]);
  function checkActive() {
    if (!active.current || controller.current?.signal.aborted)
      throw new DOMException("Cancelled", "AbortError");
  }
  async function assertProvider() {
    if ((await readLocalSetting("sync-provider")) !== "google")
      throw new SyncError(
        "同期サービスが変更されました。同期設定でサービスを確認してください。",
      );
    checkActive();
  }
  async function baseline(c: Connection, remote: DriveSnapshot, hash: string) {
    checkActive();
    const next = {
      ...c,
      hash,
      sha: remote.sha,
      fileId: remote.id,
      lastSynced: new Date().toISOString(),
    };
    await writeLocalSetting(key, next);
    checkActive();
    current.current = next;
    setConnection(next);
  }
  async function pull(remote: DriveSnapshot, expected: string) {
    const local = latest.current.data;
    await assertProvider();
    await writeLocalSetting("before-google-sync", local);
    checkActive();
    const snapshot = latest.current.data;
    const actual = await fingerprint(snapshot);
    if (
      latest.current.data !== snapshot ||
      latest.current.saveState !== "保存済み" ||
      actual !== expected
    )
      throw new SyncError(
        "編集中に内容が変わりました。再同期して内容を確認してください。",
      );
    checkActive();
    latest.current.onReplace(remote.data);
  }
  function fail(error: unknown) {
    if (!active.current) return;
    if (error instanceof DOMException && error.name === "AbortError") {
      paused.current = false;
      setStatus("通信待ち・端末への保存は継続");
      setProblem(
        "Driveとの通信が時間切れになりました。接続が戻ると再確認します。",
      );
      return;
    }
    if (error instanceof SyncError && error.status === 401) {
      needsAuth.current = true;
      clearGoogleToken();
    }
    const transient =
      !(error instanceof SyncError) ||
      error.status === 429 ||
      error.status >= 500;
    paused.current = !transient;
    setStatus(
      transient
        ? "通信待ち・端末への保存は継続"
        : error instanceof SyncError && error.status === 401
          ? "Googleに再接続が必要"
          : "同期を停止",
    );
    setProblem(
      error instanceof Error
        ? error.message
        : "同期できませんでした。端末のデータは保持されています。",
    );
  }
  async function sync(interactive = false) {
    if (
      !ready ||
      lock.current ||
      pending.current ||
      latest.current.saveState !== "保存済み"
    )
      return;
    if (
      !interactive &&
      (!current.current || paused.current || needsAuth.current)
    )
      return;
    if (!navigator.onLine) {
      setStatus("オフライン・端末に保存中");
      return;
    }
    lock.current = true;
    setBusy(true);
    setProblem("");
    setStatus("Google Driveを確認中…");
    controller.current = new AbortController();
    try {
      await assertProvider();
      if (interactive)
        await writeLocalSetting(
          "google-web-client-id",
          latest.current.clientId.trim(),
        );
      const token = await googleToken(
        latest.current.clientId.trim(),
        interactive,
        current.current?.account.email,
      );
      checkActive();
      armDeadline();
      const account = await driveAccount(token, controller.current.signal);
      checkActive();
      const remote = await readDrive(token, controller.current.signal);
      checkActive();
      const local = latest.current.data,
        hash = await fingerprint(local),
        remoteHash = remote ? await fingerprint(remote.data) : null;
      if (
        latest.current.data !== local ||
        latest.current.saveState !== "保存済み"
      ) {
        setStatus("編集内容を端末に保存してから同期");
        return;
      }
      await assertProvider();
      const old = current.current;
      const c: Connection =
        old?.account.id === account.id
          ? { ...old, account }
          : { account, hash: "", sha: null, fileId: null, lastSynced: "" };
      needsAuth.current = false;
      if (!old || old.account.id !== account.id || !c.lastSynced) {
        setChoice({
          connection: { ...c, account },
          local,
          hash,
          remote,
          initial: true,
        });
        setStatus("最初に使うデータを選択");
        return;
      }
      const decision = syncDecision(
        hash,
        c.hash,
        remoteHash,
        remote?.sha || null,
        c.sha,
      );
      if (
        decision === "conflict" ||
        (remote && c.fileId && remote.id !== c.fileId)
      ) {
        paused.current = true;
        setChoice({ connection: c, local, hash, remote, initial: false });
        setStatus("両端末の変更を確認");
        return;
      }
      if (
        decision === "pull" &&
        document.activeElement?.matches(
          'input,textarea,[contenteditable="true"]',
        )
      ) {
        setStatus("編集中・入力欄を閉じて同期");
        return;
      }
      if (decision === "pull" && remote) {
        await pull(remote, hash);
        await baseline(c, remote, remoteHash!);
      } else if (decision === "push") {
        await writeDrive(token, local, remote, controller.current.signal);
        const saved = await readDrive(token, controller.current.signal);
        if (!saved || (await fingerprint(saved.data)) !== hash)
          throw new SyncError(
            "保存中にDriveが更新されました。再同期して確認してください。",
            409,
          );
        await baseline(c, saved, hash);
      } else if (remote) await baseline(c, remote, hash);
      paused.current = false;
      setStatus("Google Driveと同期済み");
    } catch (error) {
      fail(error);
    } finally {
      clearTimeout(deadline.current);
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  syncRef.current = sync;
  useEffect(() => {
    if (!ready || !connection || choice || saveState !== "保存済み") return;
    const timer = setTimeout(() => void syncRef.current(), 1800);
    return () => clearTimeout(timer);
  }, [data, saveState, ready, !!connection, choice]);
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState === "visible") void syncRef.current();
    };
    const interval = setInterval(resume, 60000);
    const afterBlur = () => {
      setTimeout(resume, 0);
    };
    document.addEventListener("focusout", afterBlur);
    window.addEventListener("online", resume);
    window.addEventListener("focus", resume);
    window.addEventListener("native-resume", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      document.removeEventListener("focusout", afterBlur);
      clearInterval(interval);
      window.removeEventListener("online", resume);
      window.removeEventListener("focus", resume);
      window.removeEventListener("native-resume", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);
  async function choose(direction: "local" | "cloud") {
    const c = pending.current;
    if (!c || lock.current || latest.current.saveState !== "保存済み") return;
    lock.current = true;
    setBusy(true);
    controller.current = new AbortController();
    try {
      await assertProvider();
      const hash = await fingerprint(latest.current.data);
      if (hash !== c.hash) {
        setChoice({ ...c, hash, local: latest.current.data });
        throw new SyncError(
          "この端末の内容が変わりました。内容を確認し直してください。",
        );
      }
      const token = await googleToken(
        latest.current.clientId.trim(),
        false,
        c.connection.account.email,
      );
      armDeadline();
      const account = await driveAccount(token, controller.current.signal);
      if (account.id !== c.connection.account.id)
        throw new SyncError(
          "Googleアカウントが変わりました。接続し直してください。",
          401,
        );
      const remote = await readDrive(token, controller.current.signal);
      checkActive();
      if (
        (remote?.sha || null) !== (c.remote?.sha || null) ||
        remote?.id !== c.remote?.id
      ) {
        setChoice({ ...c, remote });
        throw new SyncError(
          "Driveが更新されました。新しい内容を確認して選び直してください。",
          409,
        );
      }
      if (direction === "cloud") {
        if (!remote)
          throw new SyncError("Driveにはまだ同期データがありません。");
        await pull(remote, hash);
        await baseline(c.connection, remote, await fingerprint(remote.data));
      } else {
        await writeLocalSetting("before-google-sync", remote?.data || c.local);
        checkActive();
        await assertProvider();
        const snapshot = latest.current.data;
        const currentHash = await fingerprint(snapshot);
        if (
          latest.current.data !== snapshot ||
          latest.current.saveState !== "保存済み" ||
          currentHash !== hash
        )
          throw new SyncError(
            "編集中のため保存を止めました。内容を確認し直してください。",
          );
        await writeDrive(token, c.local, remote, controller.current.signal);
        const saved = await readDrive(token, controller.current.signal);
        if (!saved || (await fingerprint(saved.data)) !== hash)
          throw new SyncError(
            "保存中にDriveが更新されました。再同期して確認してください。",
            409,
          );
        await baseline(c.connection, saved, hash);
      }
      checkActive();
      pending.current = null;
      setChoice(null);
      dialog.current?.close();
      paused.current = false;
      setProblem("");
      setStatus("Google Driveと同期済み");
    } catch (error) {
      fail(error);
    } finally {
      clearTimeout(deadline.current);
      lock.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function disconnect() {
    if (busy) return;
    try {
      await writeLocalSetting(key, undefined);
      current.current = null;
      setConnection(null);
      clearGoogleToken();
      paused.current = false;
      needsAuth.current = false;
      setStatus("未接続");
      setProblem("");
    } catch (e) {
      fail(e);
    }
  }
  async function recover() {
    try {
      const copy = await readLocalSetting<Data>("before-google-sync");
      if (!copy) throw new SyncError("同期前の保護コピーはまだありません。");
      await saveTextFile(
        JSON.stringify(copy, null, 2),
        "application/json",
        "綴庭-Google同期前の保護コピー.json",
      );
    } catch (e) {
      fail(e);
    }
  }
  const closeChoice = () => {
    paused.current = true;
    pending.current = null;
    setChoice(null);
    dialog.current?.close();
    setStatus("同期を保留");
  };
  return (
    <>
      {expanded ? (
        <section className="panel sync-panel" aria-label="Google Drive同期">
          <div className="section-heading">
            <h2>Google Driveで同期</h2>
            <span role="status">{status}</span>
          </div>
          <p>
            PCとスマホで同じGoogleアカウントを使います。データはDrive内のアプリ専用領域に保存し、一般のファイルにはアクセスしません。
          </p>
          {connection && (
            <p>
              <strong>{connection.account.email}</strong>
              <br />
              <small>
                最終同期：
                {connection.lastSynced
                  ? new Date(connection.lastSynced).toLocaleString("ja-JP")
                  : "未完了"}
              </small>
            </p>
          )}
          <div className="page-actions">
            <button
              className="button primary"
              disabled={busy || !ready || saveState !== "保存済み" || !!choice}
              onClick={() => void sync(true)}
            >
              {busy ? "接続・同期中…" : "Googleに接続して同期"}
            </button>
            {connection && (
              <>
                <button
                  className="button subtle"
                  disabled={busy || saveState !== "保存済み" || !!choice}
                  onClick={() => {
                    paused.current = false;
                    needsAuth.current = false;
                    void sync();
                  }}
                >
                  今すぐGoogle同期
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => void disconnect()}
                >
                  この端末のGoogle接続を解除
                </button>
              </>
            )}
          </div>
          {problem && (
            <p className="sync-error" role="alert">
              {problem}
            </p>
          )}
          <p className="muted small">
            編集後・アプリに戻ったとき・オンライン中は約1分おきに確認します。オフライン中は端末に保存し、両端末で変更があれば自動上書きせず確認します。同期は画像を含め10MBまでです。
          </p>
          {!isAndroidApp && (
            <p className="muted small">
              ブラウザ版は再起動時やGoogleの許可の有効期限が切れたときに、上のボタンで再接続してください。接続中は自動同期します。認証トークンはファイルや端末の保存領域に書き出しません。
            </p>
          )}
          <details
            className="google-setup"
            open={setupOpen}
            onToggle={(e) => setSetupOpen(e.currentTarget.open)}
          >
            <summary>初回のGoogle接続設定</summary>
            <p>
              アプリの管理者がGoogle CloudでDrive
              APIとOAuthを設定する必要があります（無料）。同じGoogle
              CloudプロジェクトにWeb用・Android用のアプリを登録してください。
            </p>
            {!isAndroidApp && (
              <label>
                GoogleのWebクライアントID
                <input
                  aria-label="GoogleのWebクライアントID"
                  placeholder="…apps.googleusercontent.com"
                  value={clientId}
                  disabled={busy || !!choice}
                  onChange={(e) => setClientId(e.target.value)}
                  autoCapitalize="none"
                  spellCheck={false}
                />
              </label>
            )}
            <p>
              <a
                href="https://github.com/raid-arch/storymaker/blob/main/docs/google-drive-setup.md"
                target="_blank"
                rel="noreferrer"
              >
                Google同期の設定手順を見る ↗
              </a>
            </p>
            <p className="muted small">
              クライアントIDは公開用の識別子です。クライアントシークレット、Googleのパスワード、認証トークンは入力しないでください。
            </p>
          </details>
          <button className="text-button" onClick={() => void recover()}>
            Google同期前の保護コピーを書き出す
          </button>
        </section>
      ) : (
        connection && (
          <button
            className={`sync-strip ${problem ? "has-error" : ""}`}
            onClick={onOpen}
          >
            <span>{status}</span>
            <span>Google Drive</span>
          </button>
        )
      )}
      <dialog
        ref={dialog}
        className="modal sync-dialog"
        aria-label="Google同期で使うデータを選ぶ"
        onCancel={(e) => {
          if (busy) e.preventDefault();
          else closeChoice();
        }}
      >
        {choice && (
          <>
            <div className="modal-heading">
              <h2>
                {choice.initial
                  ? "Google同期で最初に使うデータ"
                  : "Google同期の変更を確認"}
              </h2>
              <button
                className="icon-button"
                aria-label="Google同期の確認を閉じる"
                disabled={busy}
                onClick={closeChoice}
              >
                ×
              </button>
            </div>
            <p>接続先：{choice.connection.account.email}</p>
            <p>
              接続しただけでは置き換えません。上書き前の内容は端末に保護コピーを残します。
            </p>
            <div className="sync-comparison">
              <div>
                <h3>この端末</h3>
                <p>
                  {choice.local.projects.length}作品・
                  {choice.local.entries.length}件の設定
                </p>
                <small>
                  {choice.local.projects
                    .map((p) => p.name)
                    .slice(0, 3)
                    .join(" / ")}
                </small>
              </div>
              <div>
                <h3>Google Drive</h3>
                {choice.remote ? (
                  <>
                    <p>
                      {choice.remote.data.projects.length}作品・
                      {choice.remote.data.entries.length}件の設定
                    </p>
                    <small>
                      {choice.remote.data.projects
                        .map((p) => p.name)
                        .slice(0, 3)
                        .join(" / ")}
                    </small>
                  </>
                ) : (
                  <p>まだ同期データがありません。</p>
                )}
              </div>
            </div>
            {problem && <p role="alert">{problem}</p>}
            <div className="page-actions">
              <button
                className="button primary"
                disabled={busy || saveState !== "保存済み"}
                onClick={() => void choose("local")}
              >
                この端末の内容をGoogle Driveに保存
              </button>
              <button
                className="button subtle"
                disabled={busy || !choice.remote || saveState !== "保存済み"}
                onClick={() => void choose("cloud")}
              >
                Google Driveの内容をこの端末で使う
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={closeChoice}
              >
                後で決める
              </button>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}

import androidVersion from "../android-version.json";
import { isAndroidApp } from "./native";
import { useEffect, useRef, useState } from "react";
import { Check, Download, Smartphone, X } from "lucide-react";

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallApp() {
  const prompt = useRef<InstallPrompt | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const updateDisplay = () =>
      setInstalled(
        display.matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      );
    updateDisplay();
    const ready = (event: Event) => {
      event.preventDefault();
      prompt.current = event as InstallPrompt;
    };
    const complete = () => {
      prompt.current = null;
      setInstalled(true);
      setMessage(
        "インストールが完了しました。スマホのアプリ一覧から「綴庭」を開けます。",
      );
    };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", complete);
    display.addEventListener("change", updateDisplay);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", complete);
      display.removeEventListener("change", updateDisplay);
    };
  }, []);

  async function install() {
    if (busy) return;
    const event = prompt.current;
    if (!event) {
      setMessage(
        "インストール画面が表示されない場合は、以下の手順をお試しください。",
      );
      dialog.current?.showModal();
      return;
    }
    prompt.current = null;
    setBusy(true);
    try {
      await event.prompt();
      const choice = await event.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "インストール操作を受け付けました。完了したら、アプリ一覧で「綴庭」を探してください。"
          : "インストールを見送りました。あとからブラウザのメニューから追加できます。",
      );
    } catch {
      setMessage(
        "インストール画面を開けませんでした。ブラウザのメニューから追加をお試しください。",
      );
    } finally {
      setBusy(false);
      if (!dialog.current?.open) dialog.current?.showModal();
    }
  }

  if (isAndroidApp) return null;
  return (
    <>
      <section
        className={`install-banner ${installed ? "is-installed" : ""}`}
        aria-label="アプリのインストール"
      >
        <Smartphone size={22} strokeWidth={1.5} />
        <div>
          <strong>ホーム画面から、物語の庭へ。</strong>
          <p>綴庭をアプリとして追加できます。</p>
        </div>
        <a
          className="button primary"
          href={`https://raid-arch.github.io/storymaker/downloads/tsuzuriniwa-${androidVersion.versionName}.apk`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Download size={16} />
          Android用APKをダウンロード
        </a>
        {installed ? (
          <span className="install-complete" role="status">
            <Check size={16} />
            アプリで利用できます
          </span>
        ) : (
          <button
            className="button subtle"
            onClick={() => void install()}
            disabled={busy}
          >
            <Download size={16} />
            {busy ? "インストール画面を開いています…" : "アプリをインストール"}
          </button>
        )}
      </section>
      <dialog
        ref={dialog}
        className="modal install-dialog"
        aria-labelledby="install-title"
        onClick={(e) => {
          if (e.target === dialog.current) {
            const rect = dialog.current.getBoundingClientRect();
            if (
              e.clientX < rect.left ||
              e.clientX > rect.right ||
              e.clientY < rect.top ||
              e.clientY > rect.bottom
            )
              dialog.current.close();
          }
        }}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">YOUR WORLD, ALWAYS WITH YOU</span>
            <h2 id="install-title">綴庭をアプリとして使う</h2>
          </div>
          <button
            className="icon-button"
            aria-label="インストール案内を閉じる"
            onClick={() => dialog.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        <p className="install-message" role="status">
          {message}
        </p>
        <h3>Android・PCのChrome</h3>
        <ol>
          <li>このサイトをChromeで直接開く</li>
          <li>右上の「︙」を開く</li>
          <li>「ホーム画面に追加」または「アプリをインストール」を選ぶ</li>
        </ol>
        <h3>iPhone・iPadのSafari</h3>
        <p>共有ボタン →「ホーム画面に追加」を選んでください。</p>
        <div className="install-help">
          <strong>「既にインストールされています」と表示される場合</strong>
          <p>
            端末のアプリ一覧で「綴庭」を探してください。見つからない・起動できない場合、このボタンで再インストールを強制することはできません。Chromeでこのサイトを開けば、そのまま創作を続けられます。
          </p>
        </div>
        <p className="muted small">
          ChatGPTなどのアプリ内ブラウザでは、URLをコピーしてChromeやSafariで開いてください。入力済みの作品は「設定・バックアップ」からJSONで保管できます。
        </p>
        <div className="modal-footer">
          <button
            className="button primary"
            onClick={() => dialog.current?.close()}
          >
            閉じる
          </button>
        </div>
      </dialog>
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { AndroidApp } from "./native";
import type { AndroidUpdate } from "./native";
export default function AndroidUpdates({
  saveState,
  notice,
}: {
  saveState: string;
  notice: (text: string) => void;
}) {
  const [update, setUpdate] = useState<AndroidUpdate | null>(null),
    [busy, setBusy] = useState(false);
  const last = useRef(0),
    checking = useRef(false);
  async function check(manual = false) {
    if (
      checking.current ||
      (!manual && Date.now() - last.current < 6 * 60 * 60 * 1000)
    )
      return;
    checking.current = true;
    last.current = Date.now();
    setBusy(true);
    try {
      const result = await AndroidApp.checkUpdate();
      setUpdate(result);
      if (manual)
        notice(
          result.available
            ? `新しいAPK ${result.versionName} があります。`
            : "最新のAPKを使用しています。",
        );
    } catch {
      if (manual)
        notice(
          "更新を確認できませんでした。インターネット接続を確認してください。",
        );
    } finally {
      checking.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    void check();
    const manual = () => void check(true),
      resume = () => void check();
    window.addEventListener("android-check-update", manual);
    window.addEventListener("native-resume", resume);
    return () => {
      window.removeEventListener("android-check-update", manual);
      window.removeEventListener("native-resume", resume);
    };
  }, []);
  async function install() {
    if (saveState !== "保存済み") {
      notice("作品の保存が完了してから更新してください。");
      return;
    }
    setBusy(true);
    try {
      notice(
        "更新用APKをダウンロードしています。完了後にAndroidの確認画面を開きます。",
      );
      const result = await AndroidApp.installUpdate();
      notice(
        result.permissionRequired
          ? "綴庭からのアプリ更新を許可し、戻って「APKを更新」を押してください。"
          : "Androidの確認画面で「更新」を選んでください。作品データは引き継がれます。",
      );
    } catch (error) {
      notice(
        error instanceof Error
          ? error.message
          : "更新できませんでした。あとからもう一度お試しください。",
      );
    } finally {
      setBusy(false);
    }
  }
  return update?.available ? (
    <section className="offline-banner" role="status">
      <Download size={17} />
      <span>新しいAPK {update.versionName} があります。</span>
      <button disabled={busy} onClick={() => void install()}>
        {busy ? "処理中…" : "APKを更新"}
      </button>
    </section>
  ) : busy ? (
    <div className="offline-banner">
      <RefreshCw size={16} />
      APKの更新を確認中…
    </div>
  ) : null;
}

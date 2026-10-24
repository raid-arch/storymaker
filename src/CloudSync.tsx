import { useEffect, useState } from "react";
import GitHubSync from "./GitHubSync";
import GoogleSync from "./GoogleSync";
import { readLocalSetting, writeLocalSetting } from "./storage";
type Props = Parameters<typeof GitHubSync>[0];
export default function CloudSync(props: Props) {
  const [provider, setProvider] = useState<"google" | "github" | null>(null),
    [problem, setProblem] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([
      readLocalSetting<string>("sync-provider"),
      readLocalSetting("github-sync-connection"),
    ])
      .then(async ([saved, github]) => {
        const selected =
          saved === "google" || saved === "github"
            ? saved
            : github
              ? "github"
              : "google";
        if (!saved) await writeLocalSetting("sync-provider", selected);
        if (active) setProvider(selected);
      })
      .catch(() => {
        if (active)
          setProblem(
            "同期サービスの設定を読み込めませんでした。ページを開き直してください。",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <>
      {props.expanded && (
        <section className="panel sync-provider">
          <label>
            同期サービス
            <select
              aria-label="同期サービス"
              disabled={!provider}
              value={provider || "google"}
              onChange={async (e) => {
                const next = e.target.value as "google" | "github";
                try {
                  await writeLocalSetting("sync-provider", next);
                  setProvider(next);
                  setProblem("");
                } catch {
                  setProblem("同期サービスを変更できませんでした。");
                }
              }}
            >
              <option value="google">Google Drive</option>
              <option value="github">GitHub（拡張）</option>
            </select>
          </label>
          <p className="muted small">
            一度に一つのサービスで同期します。保存先を切り替えても、端末と以前のクラウドにあるデータは削除しません。
          </p>
          {problem && <p role="alert">{problem}</p>}
        </section>
      )}
      {provider === "google" && <GoogleSync {...props} />}
      {provider === "github" && <GitHubSync {...props} />}
    </>
  );
}

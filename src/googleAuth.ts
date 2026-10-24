import { AndroidApp, isAndroidApp } from "./native";
import { driveScope } from "./googleDrive";
import { SyncError } from "./githubSync";
interface TokenResult {
  access_token?: string;
  expires_in?: number;
  error?: string;
  scope?: string;
}
interface GoogleIdentity {
  accounts: {
    oauth2: {
      initTokenClient(options: {
        client_id: string;
        scope: string;
        callback: (result: TokenResult) => void;
        error_callback: () => void;
      }): {
        requestAccessToken(options: { prompt: string; hint?: string }): void;
      };
    };
  };
}
declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}
let loading: Promise<void> | undefined;
let cached: { token: string; until: number; clientId: string } | undefined;
export function clearGoogleToken() {
  cached = undefined;
}
export function validGoogleClientId(id: string) {
  return /^[0-9]+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(id);
}
function loadIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      loading = undefined;
      reject(
        new SyncError(
          "Googleの接続画面を読み込めませんでした。通信状態を確認してください。",
        ),
      );
    };
    const timeout = setTimeout(fail, 20000);
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      clearTimeout(timeout);
      if (window.google?.accounts?.oauth2) resolve();
      else fail();
    };
    script.onerror = fail;
    document.head.append(script);
  });
  return loading;
}
export async function googleToken(
  clientId: string,
  interactive: boolean,
  email = "",
): Promise<string> {
  if (
    !interactive &&
    cached &&
    cached.clientId === clientId &&
    cached.until > Date.now()
  )
    return cached.token;
  if (isAndroidApp) {
    try {
      const result = await AndroidApp.googleAuthorize({ interactive, email });
      if (!result.accessToken) throw new Error();
      cached = {
        token: result.accessToken,
        until: Date.now() + 50 * 60000,
        clientId,
      };
      return result.accessToken;
    } catch {
      throw new SyncError(
        interactive
          ? "Googleに接続できませんでした。Androidのアプリ登録・Google Play開発者サービス・Drive APIを確認してください。"
          : "Googleとの再接続が必要です。Googleに接続するボタンを押してください。",
        401,
      );
    }
  }
  if (!interactive)
    throw new SyncError(
      "Googleとの再接続が必要です。Googleに接続するボタンを押してください。",
      401,
    );
  if (!validGoogleClientId(clientId))
    throw new SyncError(
      "接続設定にGoogleのWebクライアントIDを入力してください。",
    );
  await loadIdentity();
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new SyncError(
            "Googleへの接続が完了していません。ポップアップを許可して再試行してください。",
          ),
        ),
      120000,
    );
    const fail = () => {
      clearTimeout(timer);
      reject(
        new SyncError(
          "Googleへの接続をキャンセルしたか、許可されませんでした。",
          401,
        ),
      );
    };
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: driveScope,
      error_callback: fail,
      callback: (r) => {
        clearTimeout(timer);
        if (
          r.error ||
          !r.access_token ||
          !r.scope?.split(" ").includes(driveScope)
        ) {
          fail();
          return;
        }
        cached = {
          token: r.access_token,
          until:
            Date.now() + Math.max(0, Number(r.expires_in || 3600) - 120) * 1000,
          clientId,
        };
        resolve(r.access_token);
      },
    });
    client.requestAccessToken({
      prompt: email ? "" : "select_account",
      ...(email ? { hint: email } : {}),
    });
  });
}

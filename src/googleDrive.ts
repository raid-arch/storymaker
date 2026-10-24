import { validateBackup, type Data } from "./model";
import { SyncError, maxSyncBytes } from "./githubSync";
export const driveScope = "https://www.googleapis.com/auth/drive.appdata";
export interface DriveAccount {
  id: string;
  email: string;
}
export interface DriveSnapshot {
  id: string;
  sha: string;
  data: Data;
  updatedAt: string;
}
const api = "https://www.googleapis.com/drive/v3";
export async function driveRequest(
  token: string,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...Object.fromEntries(new Headers(init.headers)),
      Authorization: `Bearer ${token}`,
    },
  });
  if (response.status === 401)
    throw new SyncError(
      "Googleとの再接続が必要です。Googleに接続するボタンを押してください。",
      401,
    );
  if (response.status === 412 || response.status === 409)
    throw new SyncError(
      "別の端末がDriveを更新しました。再同期して使う内容を選んでください。",
      409,
    );
  if (response.status === 403)
    throw new SyncError(
      "Google Driveにアクセスできません。Drive APIの有効化・アプリの利用者設定・空き容量を確認してください。",
      403,
    );
  if (response.status === 429)
    throw new SyncError(
      "Google Driveの利用制限です。時間をおいて再試行してください。",
      429,
    );
  if (!response.ok && response.status !== 404)
    throw new SyncError(
      "Google Driveとの通信に失敗しました。端末のデータは保持されています。",
      response.status,
    );
  return response;
}
export async function driveAccount(
  token: string,
  signal?: AbortSignal,
): Promise<DriveAccount> {
  const r = await driveRequest(
    token,
    `${api}/about?fields=user(permissionId,emailAddress)`,
    { signal },
  );
  const body = await r.json();
  if (
    typeof body.user?.permissionId !== "string" ||
    typeof body.user?.emailAddress !== "string"
  )
    throw new SyncError("Googleアカウントを確認できませんでした。");
  return { id: body.user.permissionId, email: body.user.emailAddress };
}
export async function readDrive(
  token: string,
  signal?: AbortSignal,
): Promise<DriveSnapshot | null> {
  const query = new URLSearchParams({
    spaces: "appDataFolder",
    q: "name = 'tsuzuriniwa-sync.json' and trashed = false",
    fields: "files(id,size),nextPageToken",
    pageSize: "2",
  });
  const list = await driveRequest(token, `${api}/files?${query}`, { signal });
  const body = await list.json();
  if (!Array.isArray(body.files))
    throw new SyncError("Driveの保存先を確認できませんでした。");
  if (body.files.length > 1 || body.nextPageToken)
    throw new SyncError(
      "同期ファイルが複数あります。誤って上書きしないため同期を停止しました。JSONで端末のデータを保護し、Google Driveのアプリ管理で保存先を整理してください。",
    );
  if (!body.files.length) return null;
  const file = body.files[0];
  if (
    typeof file.id !== "string" ||
    !file.id ||
    !Number.isFinite(Number(file.size)) ||
    Number(file.size) > maxSyncBytes
  )
    throw new SyncError(
      "同期ファイルの形式またはサイズを確認してください（上限10MB）。",
    );
  const r = await driveRequest(
    token,
    `${api}/files/${encodeURIComponent(file.id)}?alt=media`,
    { signal },
  );
  if (r.status === 404)
    throw new SyncError(
      "確認中にDriveのファイルが削除されました。もう一度同期してください。",
      409,
    );
  const etag = r.headers.get("etag");
  if (!etag)
    throw new SyncError(
      "Driveの更新識別子を確認できません。安全のため同期を止めました。",
    );
  const text = await r.text();
  if (new TextEncoder().encode(text).length > maxSyncBytes)
    throw new SyncError("同期データが10MBを超えています。");
  try {
    const payload = JSON.parse(text);
    if (
      payload.format !== "tsuzuriniwa-google-sync" ||
      payload.version !== 1 ||
      typeof payload.updatedAt !== "string"
    )
      throw new Error();
    return {
      id: file.id,
      sha: etag,
      updatedAt: payload.updatedAt,
      data: validateBackup(payload.data),
    };
  } catch {
    throw new SyncError(
      "Driveの同期データが不正です。端末のデータは変更していません。",
    );
  }
}
export async function writeDrive(
  token: string,
  data: Data,
  remote: DriveSnapshot | null,
  signal?: AbortSignal,
): Promise<void> {
  validateBackup(data);
  const content = JSON.stringify({
    format: "tsuzuriniwa-google-sync",
    version: 1,
    updatedAt: new Date().toISOString(),
    data,
  });
  if (new TextEncoder().encode(content).length > maxSyncBytes)
    throw new SyncError(
      "同期データが10MBを超えています。画像を減らすかJSONで移行してください。端末への保存は続きます。",
    );
  if (remote) {
    const r = await driveRequest(
      token,
      `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(remote.id)}?uploadType=media`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "If-Match": remote.sha },
        body: content,
        signal,
      },
    );
    if (r.status === 404)
      throw new SyncError(
        "保存先が削除されました。もう一度同期してください。",
        409,
      );
  } else {
    const boundary = `tsuzuriniwa_${crypto.randomUUID()}`;
    const metadata = JSON.stringify({
      name: "tsuzuriniwa-sync.json",
      parents: ["appDataFolder"],
    });
    const r = await driveRequest(
      token,
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        signal,
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body: `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${content}\r\n--${boundary}--`,
      },
    );
    if (r.status === 404)
      throw new SyncError("Driveの保存先を作成できませんでした。");
  }
}

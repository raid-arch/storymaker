import { validateBackup } from "./model";
import type { Data } from "./model";
export interface SyncConnection {
  owner: string;
  repo: string;
  token: string;
  branch?: string;
  sha: string | null;
  hash: string;
  lastSynced: string;
}
export interface RemoteSnapshot {
  sha: string;
  data: Data;
  updatedAt: string;
}
export const syncPath = "tsuzuriniwa/data.json";
export const maxSyncBytes = 10 * 1024 * 1024;
export class SyncError extends Error {
  constructor(
    message: string,
    public status = 0,
  ) {
    super(message);
  }
}
export function validRepository(owner: string, repo: string): boolean {
  return (
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner) &&
    /^[A-Za-z0-9_.-]{1,100}$/.test(repo) &&
    ![".", ".."].includes(repo)
  );
}
function encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let value = "";
  for (let i = 0; i < bytes.length; i += 8192)
    value += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(value);
}
function decode(value: string): string {
  const bytes = Uint8Array.from(atob(value.replace(/\s/g, "")), (c) =>
    c.charCodeAt(0),
  );
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
export async function fingerprint(data: Data): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(data)),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
async function request(
  connection: SyncConnection,
  path: string,
  signal?: AbortSignal,
  body?: object,
): Promise<Response> {
  const r = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(connection.owner)}/${encodeURIComponent(connection.repo)}${path}`,
    {
      method: body ? "PUT" : "GET",
      signal,
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${connection.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  return r;
}
async function error(response: Response): Promise<never> {
  if (response.status === 401)
    throw new SyncError(
      "接続キーが無効、または期限切れです。設定でキーを更新してください。",
      401,
    );
  if (response.status === 403 || response.status === 429)
    throw new SyncError(
      "GitHubへのアクセスが拒否されました。キーの権限・利用制限を確認し、時間をおいて再試行してください。",
      response.status,
    );
  if (response.status === 409 || response.status === 422)
    throw new SyncError(
      "保存先が別の端末で更新されました。同期を再確認し、保存するデータを選んでください。",
      409,
    );
  throw new SyncError(
    "GitHubのデータを読み書きできませんでした。リポジトリ名と接続キーの権限を確認してください。",
    response.status,
  );
}
export async function verifyPrivate(
  connection: SyncConnection,
  signal?: AbortSignal,
): Promise<SyncConnection> {
  if (!validRepository(connection.owner, connection.repo))
    throw new SyncError("所有者名とリポジトリ名を確認してください。");
  const r = await request(connection, "", signal);
  if (!r.ok) await error(r);
  const repository = await r.json();
  if (repository.private !== true)
    throw new SyncError(
      "公開リポジトリには同期できません。作品専用の非公開リポジトリを指定してください。",
    );
  return { ...connection, branch: repository.default_branch || "main" };
}
export async function readRemote(
  connection: SyncConnection,
  signal?: AbortSignal,
): Promise<RemoteSnapshot | null> {
  const r = await request(
    connection,
    `/contents/${syncPath}?ref=${encodeURIComponent(connection.branch || "main")}`,
    signal,
  );
  if (r.status === 404) return null;
  if (r.status === 409) {
    const body = await r.json();
    if (typeof body.message === "string" && /empty/i.test(body.message))
      return null;
    throw new SyncError("保存先の状態を確認できませんでした。", 409);
  }
  if (!r.ok) await error(r);
  const file = await r.json();
  if (
    !file ||
    typeof file.sha !== "string" ||
    !Number.isFinite(file.size) ||
    file.size > maxSyncBytes
  )
    throw new SyncError(
      "同期ファイルが大きすぎるか、不正な形式です。同期は画像を含めて10MBまでです。",
    );
  let content = file.content;
  if (file.encoding !== "base64" || typeof content !== "string") {
    const blob = await request(
      connection,
      `/git/blobs/${encodeURIComponent(file.sha)}`,
      signal,
    );
    if (!blob.ok) await error(blob);
    const b = await blob.json();
    if (b.encoding !== "base64" || typeof b.content !== "string")
      throw new SyncError("同期データを読み込めませんでした。");
    content = b.content;
  }
  let raw;
  try {
    raw = JSON.parse(decode(content));
  } catch {
    throw new SyncError(
      "保存先の同期ファイルが壊れています。端末のデータは変更していません。",
    );
  }
  if (
    raw?.format !== "tsuzuriniwa-sync" ||
    raw.version !== 1 ||
    typeof raw.updatedAt !== "string"
  )
    throw new SyncError(
      "対応する綴庭の同期データではありません。端末のデータは変更していません。",
    );
  let data: Data;
  try {
    data = validateBackup(raw.data);
  } catch {
    throw new SyncError(
      "クラウドの設定データに不正な参照や形式があります。端末のデータは変更していません。",
    );
  }
  return { sha: file.sha, data, updatedAt: raw.updatedAt };
}
export async function writeRemote(
  connection: SyncConnection,
  data: Data,
  sha: string | null,
  signal?: AbortSignal,
): Promise<string> {
  validateBackup(data);
  const body = JSON.stringify({
    format: "tsuzuriniwa-sync",
    version: 1,
    updatedAt: new Date().toISOString(),
    data,
  });
  if (new TextEncoder().encode(body).length > maxSyncBytes)
    throw new SyncError(
      "データが10MBを超えています。画像を減らすか、JSONバックアップで移行してください。端末への保存は続きます。",
    );
  const r = await request(connection, `/contents/${syncPath}`, signal, {
    message: "Sync Tsuzuriniwa worldbuilding data",
    content: encode(body),
    branch: connection.branch || "main",
    ...(sha ? { sha } : {}),
  });
  if (!r.ok) await error(r);
  const result = await r.json();
  if (typeof result.content?.sha !== "string")
    throw new SyncError("クラウドへの保存結果を確認できませんでした。");
  return result.content.sha;
}
export function syncDecision(
  localHash: string,
  baseHash: string,
  remoteHash: string | null,
  remoteSha: string | null,
  baseSha: string | null,
): "same" | "pull" | "push" | "conflict" {
  if (remoteHash === localHash) return "same";
  const localChanged = localHash !== baseHash,
    remoteChanged = remoteSha !== baseSha;
  if (localChanged && remoteChanged) return "conflict";
  if (remoteChanged) return remoteHash === null ? "conflict" : "pull";
  return localChanged ? "push" : "same";
}

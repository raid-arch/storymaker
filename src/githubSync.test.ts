import { seed } from "../tests/sample";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fingerprint,
  maxSyncBytes,
  readRemote,
  syncDecision,
  verifyPrivate,
  writeRemote,
} from "./githubSync";
import type { SyncConnection } from "./githubSync";

const connection: SyncConnection = {
  owner: "test-owner",
  repo: "private-stories",
  token: "test-only-key",
  branch: "main",
  sha: null,
  hash: "",
  lastSynced: "",
};
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
afterEach(() => vi.unstubAllGlobals());
describe("private GitHub snapshot sync", () => {
  it("refuses public repositories before any content write", async () => {
    const fetch = vi.fn().mockResolvedValue(response({ private: false }));
    vi.stubGlobal("fetch", fetch);
    await expect(verifyPrivate(connection)).rejects.toThrow("公開リポジトリ");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("validates owner and repo before requesting data", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      verifyPrivate({ ...connection, owner: "../bad" }),
    ).rejects.toThrow("所有者名");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("round-trips Japanese text and images and writes the exact expected SHA", async () => {
    const data = seed();
    data.projects[0].name = "花と月🌙";
    data.projects[0].image = "data:image/png;base64,YWJj";
    let content = "";
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      if (init.method === "PUT") {
        const body = JSON.parse(String(init.body));
        expect(body.sha).toBe("old-version");
        expect(body.branch).toBe("main");
        content = body.content;
        return response({ content: { sha: "new-version" } });
      }
      return response({
        sha: "new-version",
        size: 1000,
        encoding: "base64",
        content,
      });
    });
    vi.stubGlobal("fetch", fetch);
    expect(await writeRemote(connection, data, "old-version")).toBe(
      "new-version",
    );
    const loaded = await readRemote(connection);
    expect(loaded?.data).toEqual(data);
    expect(JSON.stringify(loaded?.data)).not.toContain(connection.token);
    expect(String(fetch.mock.calls[0][0])).toContain(
      "/repos/test-owner/private-stories/contents/tsuzuriniwa/data.json",
    );
  });
  it("uses an immutable blob SHA to read a file whose content is omitted by the Contents API", async () => {
    const value = Buffer.from(
      JSON.stringify({
        format: "tsuzuriniwa-sync",
        version: 1,
        updatedAt: "now",
        data: seed(),
      }),
    ).toString("base64");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        response({
          sha: "large-sha",
          size: 2e6,
          encoding: "none",
          content: "",
        }),
      )
      .mockResolvedValueOnce(response({ encoding: "base64", content: value }));
    vi.stubGlobal("fetch", fetch);
    expect((await readRemote(connection))?.sha).toBe("large-sha");
    expect(fetch.mock.calls[1][0]).toContain("/git/blobs/large-sha");
  });
  it("detects concurrent server writes without retrying with a newer SHA", async () => {
    const fetch = vi.fn().mockResolvedValue(response({}, 409));
    vi.stubGlobal("fetch", fetch);
    await expect(writeRemote(connection, seed(), "old")).rejects.toThrow(
      "別の端末",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed remote content without replacing local data", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response({
          sha: "bad",
          size: 90,
          encoding: "base64",
          content: Buffer.from('{"format":"other"}').toString("base64"),
        }),
      ),
    );
    await expect(readRemote(connection)).rejects.toThrow("対応する綴庭");
  });
  it("does not treat an inaccessible repository as an empty sync file", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 404)));
    await expect(verifyPrivate(connection)).rejects.toThrow(
      "読み書きできません",
    );
  });
  it("refuses oversized uploads before a network request", async () => {
    const d = seed();
    d.entries[0].body = "x".repeat(maxSyncBytes);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(writeRemote(connection, d, null)).rejects.toThrow("10MB");
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    ["base", "base", "base", "same", "same", "same"],
    ["local", "base", "base", "same", "same", "push"],
    ["base", "base", "remote", "new", "old", "pull"],
    ["local", "base", "remote", "new", "old", "conflict"],
    ["base", "base", null, null, "old", "conflict"],
    ["same", "base", "same", "new", "old", "same"],
  ] as const)(
    "plans a safe action for local %s / base %s / remote %s",
    (local, base, remote, sha, baseSha, expected) => {
      expect(syncDecision(local, base, remote, sha, baseSha)).toBe(expected);
    },
  );
  it("fingerprints reflect edits without modifying the original snapshot", async () => {
    const d = seed();
    const first = await fingerprint(d);
    const copy = structuredClone(d);
    copy.projects[0].name = "changed";
    expect(await fingerprint(copy)).not.toBe(first);
    expect(await fingerprint(d)).toBe(first);
  });
});

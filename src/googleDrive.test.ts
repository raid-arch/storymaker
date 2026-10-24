import { afterEach, expect, it, vi } from "vitest";
import { driveAccount, readDrive, writeDrive } from "./googleDrive";
import { emptyData } from "./model";
afterEach(() => vi.unstubAllGlobals());
function envelope() {
  return {
    format: "tsuzuriniwa-google-sync",
    version: 1,
    updatedAt: "2026-10-24",
    data: emptyData(),
  };
}
it("reads only application data and validates account and snapshots", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        user: { permissionId: "u", emailAddress: "a@example.com" },
      }),
    )
    .mockResolvedValueOnce(Response.json({ files: [{ id: "f", size: "20" }] }))
    .mockResolvedValueOnce(
      Response.json(envelope(), { headers: { ETag: '"v1"' } }),
    );
  vi.stubGlobal("fetch", fetcher);
  expect(await driveAccount("secret")).toEqual({
    id: "u",
    email: "a@example.com",
  });
  const remote = await readDrive("secret");
  expect(remote?.sha).toBe('"v1"');
  expect(fetcher.mock.calls[1][0]).toContain("spaces=appDataFolder");
  expect(fetcher.mock.calls[0][1].headers.Authorization).toBe("Bearer secret");
  expect(fetcher.mock.calls.every(([url]) => !url.includes("secret"))).toBe(
    true,
  );
});
it("refuses ambiguous files, missing revisions, damaged data, and oversized files", async () => {
  for (const files of [
    [
      { id: "a", size: "1" },
      { id: "b", size: "1" },
    ],
    [{ id: "a", size: "999999999" }],
  ]) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ files })));
    await expect(readDrive("token")).rejects.toThrow();
  }
  for (const response of [
    Response.json(envelope()),
    Response.json(
      { ...envelope(), data: { version: 99 } },
      { headers: { ETag: '"v"' } },
    ),
  ]) {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ files: [{ id: "a", size: "20" }] }),
        )
        .mockResolvedValueOnce(response),
    );
    await expect(readDrive("token")).rejects.toThrow();
  }
});
it("creates in the private app folder and uses conditional updates without retrying conflicts", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ id: "new" }))
    .mockResolvedValueOnce(new Response("", { status: 412 }));
  vi.stubGlobal("fetch", fetcher);
  await writeDrive("token", emptyData(), null);
  expect(fetcher.mock.calls[0][1].body).toContain(
    '"parents":["appDataFolder"]',
  );
  expect(fetcher.mock.calls[0][1].body).not.toContain("token");
  await expect(
    writeDrive("token", emptyData(), {
      id: "new",
      sha: '"v1"',
      data: emptyData(),
      updatedAt: "",
    }),
  ).rejects.toMatchObject({ status: 409 });
  expect(new Headers(fetcher.mock.calls[1][1].headers).get("if-match")).toBe(
    '"v1"',
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
});

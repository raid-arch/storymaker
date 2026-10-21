import { beforeEach, afterEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  native: true,
  platform: "android",
  exportFile: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => state.native,
    getPlatform: () => state.platform,
  },
  registerPlugin: () => ({ exportFile: state.exportFile }),
}));
beforeEach(() => {
  vi.resetModules();
  state.native = true;
  state.platform = "android";
  state.exportFile.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it("exports Android backups through the native document picker with a plain MIME type", async () => {
  state.exportFile.mockResolvedValue({ saved: true });
  const { saveTextFile } = await import("./native");
  expect(
    await saveTextFile(
      '{"作品":[]}',
      "application/json;charset=utf-8",
      "作品.json",
    ),
  ).toBe(true);
  expect(state.exportFile).toHaveBeenCalledWith({
    text: '{"作品":[]}',
    type: "application/json",
    name: "作品.json",
  });
});
it("reports Android cancellation and errors without treating them as successful backups", async () => {
  const { saveTextFile } = await import("./native");
  state.exportFile.mockResolvedValueOnce({ saved: false });
  expect(await saveTextFile("data", "text/markdown", "公開.md")).toBe(false);
  state.exportFile.mockRejectedValueOnce(new Error("disk full"));
  await expect(
    saveTextFile("data", "application/json", "backup.json"),
  ).rejects.toThrow("disk full");
});
it("retains browser downloads and releases the temporary blob URL", async () => {
  state.native = false;
  vi.useFakeTimers();
  const click = vi.fn(),
    link = { href: "", download: "", click };
  vi.stubGlobal("document", { createElement: vi.fn(() => link) });
  const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const { saveTextFile, isAndroidApp } = await import("./native");
  expect(isAndroidApp).toBe(false);
  expect(await saveTextFile("定義", "text/markdown", "settings.md")).toBe(true);
  expect(link.download).toBe("settings.md");
  expect(link.href).toBe("blob:test");
  expect(click).toHaveBeenCalledOnce();
  expect(create).toHaveBeenCalledOnce();
  expect(state.exportFile).not.toHaveBeenCalled();
  vi.runAllTimers();
  expect(revoke).toHaveBeenCalledWith("blob:test");
});

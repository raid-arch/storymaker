import { seed } from "../tests/sample";
import { expect, it } from "vitest";
import { defaultAppearance, validAppearance } from "./appearance";
import { validateBackup } from "./model";
it("loads existing backups without appearance settings and preserves their stories", () => {
  const d = seed();
  expect(validateBackup(d)).toEqual(d);
  expect(d.appearance).toBeUndefined();
});
it("round-trips customization including hidden and reordered dashboard sections", () => {
  const d = seed();
  d.appearance = {
    ...defaultAppearance(),
    accent: "lavender",
    fontSize: "large",
    dashboard: ["recent", "hero"],
  };
  expect(validateBackup(JSON.parse(JSON.stringify(d))).appearance).toEqual(
    d.appearance,
  );
});
it("rejects invalid appearance settings without accepting unknown CSS or dashboard IDs", () => {
  for (const patch of [
    { accent: "url(...)" },
    { fontSize: 400 },
    { mobileEditor: "popup" },
    { dashboard: ["hero", "hero"] },
    { dashboard: ["unknown"] },
  ]) {
    const a = { ...defaultAppearance(), ...patch };
    expect(validAppearance(a)).toBe(false);
    expect(() => validateBackup({ ...seed(), appearance: a })).toThrow();
  }
});
it("accepts older appearance backups and round-trips every new design without losing data", async () => {
  const { designPresets } = await import("./appearance");
  const old = defaultAppearance();
  delete old.background;
  delete old.surface;
  expect(validAppearance(old)).toBe(true);
  for (const preset of designPresets) {
    const original = seed();
    const appearance = { ...old, accent: preset.accent, background: preset.background, surface: preset.surface, font: preset.font };
    const restored = validateBackup(JSON.parse(JSON.stringify({ ...original, theme: preset.theme, appearance })));
    expect(restored.appearance).toEqual(appearance);
    expect(restored.entries).toEqual(original.entries);
  }
  expect(validAppearance({ ...old, background: "url(unsafe)" })).toBe(false);
  expect(validAppearance({ ...old, surface: "unknown" })).toBe(false);
});

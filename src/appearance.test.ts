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
    { dashboard: ["hero", "hero"] },
    { dashboard: ["unknown"] },
  ]) {
    const a = { ...defaultAppearance(), ...patch };
    expect(validAppearance(a)).toBe(false);
    expect(() => validateBackup({ ...seed(), appearance: a })).toThrow();
  }
});

import { expect, it } from "vitest";
import { seed } from "../tests/sample";
import {
  categoryOptions,
  fieldOptions,
  statusOptions,
  validateBackup,
  markdown,
} from "./model";
it("round-trips custom names in backups and Markdown without dropping legacy values", () => {
  const d = seed();
  d.projects[0].type = "設定資料集";
  d.projects[0].status = "構想の断片";
  d.entries[0].status = "作者限定";
  d.entries[0].fields.生存状況 = "魂だけ残存";
  d.entries.find((e) => e.kind === "world")!.category = "空間・異界";
  d.relations[0].type = "師弟の契約";
  const restored = validateBackup(JSON.parse(JSON.stringify(d)));
  expect(restored).toEqual(d);
  expect(markdown(restored, "laurel")).toContain("師弟の契約");
  expect(statusOptions(d)).toContain("作者限定");
  expect(categoryOptions(d)).toContain("空間・異界");
  expect(fieldOptions(d, "生存状況")).toContain("魂だけ残存");
});
it("still rejects invalid value types and empty relationship names", () => {
  for (const apply of [
    (d: ReturnType<typeof seed>) => {
      d.entries[0].status = 4 as never;
    },
    (d: ReturnType<typeof seed>) => {
      d.projects[0].type = null as never;
    },
    (d: ReturnType<typeof seed>) => {
      d.relations[0].type = "   ";
    },
  ]) {
    const d = seed();
    apply(d);
    expect(() => validateBackup(d)).toThrow();
  }
});

import { expect, it } from "vitest";
import { seed } from "../../tests/sample";
import {
  applyTemplate,
  entryFromTemplate,
  templateFromEntry,
} from "./templates";
import { validateBackup } from "../model";
import { emptyStudio } from "./model";
it("reuses field names across works without copying private values by default", () => {
  const source = seed().entries[0];
  source.truth = "秘密";
  source.custom = [{ name: "信念", value: "秘密の目的" }];
  const template = templateFromEntry(source);
  expect(template.truth).toBe("");
  expect(template.custom).toEqual([{ name: "信念", value: "" }]);
  expect(template.projectId).toBe("");
  const created = entryFromTemplate("other", template, "別作品の人物");
  expect(created.id).not.toBe(source.id);
  expect(created.projectId).toBe("other");
  expect(created.links).toEqual([]);
  expect(created.name).toBe("別作品の人物");
});
it("fills missing fields and values while retaining existing content, custom fields and links", () => {
  const source = seed().entries[0];
  source.fields = { 役割: "既存の役割" };
  source.body = "既存の設定";
  source.custom = [{ name: "信念", value: "既存の信念" }];
  const template = templateFromEntry(source, true);
  template.fields = { 役割: "別の役割", 生年: "0" };
  template.custom = [
    { name: "信念", value: "別の信念" },
    { name: "弱点", value: "炎" },
  ];
  const next = applyTemplate(source, template);
  expect(next.fields).toEqual({ 役割: "既存の役割", 生年: "0" });
  expect(next.custom[0].value).toBe("既存の信念");
  expect(next.custom[1].name).toBe("弱点");
  expect(next.links).toEqual(source.links);
  expect(source.fields.生年).toBeUndefined();
  const d = seed();
  d.studio = { ...emptyStudio(), templates: [template] };
  expect(
    validateBackup(JSON.parse(JSON.stringify(d))).studio?.templates,
  ).toEqual([template]);
});

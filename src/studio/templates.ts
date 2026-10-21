import { newEntry, now } from "../model";
import type { Entry } from "../model";
import { sid } from "./model";
import type { Template } from "./model";
export function templateFromEntry(
  entry: Entry,
  includeValues = false,
): Template {
  const value = (text: string) => (includeValues ? text : "");
  return {
    id: sid(),
    projectId: "",
    name: `${entry.name || "設定"}の項目`,
    kind: entry.kind,
    category: entry.category,
    fields: Object.fromEntries(
      Object.entries(entry.fields).map(([key, text]) => [key, value(text)]),
    ),
    custom: entry.custom.map((item) => ({
      name: item.name,
      value: value(item.value),
    })),
    body: value(entry.body),
    lore: value(entry.lore),
    truth: value(entry.truth),
    status: includeValues ? entry.status : "仮設定",
    tags: includeValues ? [...entry.tags] : [],
  };
}
/** Existing values and links are never replaced when adding a template. */
export function applyTemplate(entry: Entry, template: Template): Entry {
  if (entry.kind !== template.kind)
    throw new Error("同じ種類の設定に適用してください。");
  const fields = { ...template.fields };
  for (const [key, value] of Object.entries(entry.fields))
    if (value || !(key in fields)) fields[key] = value;
  const custom = entry.custom.map((item) => ({ ...item }));
  for (const item of template.custom) {
    const old = custom.find((row) => row.name === item.name);
    if (!old) custom.push({ ...item });
    else if (!old.value) old.value = item.value;
  }
  return {
    ...entry,
    category: entry.category || template.category,
    fields,
    custom,
    body: entry.body || template.body,
    lore: entry.lore || template.lore,
    truth: entry.truth || template.truth,
    tags: [...new Set([...entry.tags, ...template.tags])],
    updatedAt: now(),
  };
}
export function entryFromTemplate(
  projectId: string,
  template: Template,
  name: string,
): Entry {
  return {
    ...applyTemplate(
      {
        ...newEntry(projectId, template.kind),
        fields: {},
        status: template.status,
      },
      template,
    ),
    name,
  };
}

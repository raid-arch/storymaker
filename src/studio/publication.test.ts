import { expect, it } from "vitest";
import { seed } from "../../tests/sample";
import { checkpoint, studioOf } from "./model";
import { publicDocument, publicMarkdown } from "./publication";
it("exports only explicit public text, excluding hidden truths, history, fields, images and names", () => {
  let d = seed();
  d.entries[0] = {
    ...d.entries[0],
    name: "PRIVATE_NAME",
    truth: "PRIVATE_TRUTH",
    lore: "PRIVATE_LORE",
    body: "PRIVATE_BODY",
    fields: { 秘密: "PRIVATE_FIELD" },
    image: "data:image/png;base64,YWJj",
  };
  d = checkpoint(d, "entry", d.entries[0], "PRIVATE_REVISION");
  d.studio = {
    ...studioOf(d),
    publications: [
      {
        id: "pub",
        projectId: "laurel",
        target: "entry",
        targetId: "morgan",
        enabled: true,
        title: "公開人物",
        text: "公開する説明だけ",
      },
      {
        id: "hidden",
        projectId: "laurel",
        target: "entry",
        targetId: "anne",
        enabled: false,
        title: "PRIVATE_DISABLED",
        text: "PRIVATE_DISABLED_TEXT",
      },
      {
        id: "deleted",
        projectId: "laurel",
        target: "entry",
        targetId: "missing",
        enabled: true,
        title: "PRIVATE_DELETED",
        text: "PRIVATE_DELETED_TEXT",
      },
    ],
  };
  const document = publicDocument(d, "laurel");
  expect(document.items).toEqual([
    { title: "公開人物", text: "公開する説明だけ" },
  ]);
  expect(JSON.stringify(document)).not.toContain("PRIVATE_");
  expect(publicMarkdown(document)).not.toContain("PRIVATE_");
  expect(Object.keys(document.items[0])).toEqual(["title", "text"]);
});
it("defaults to no publication and never borrows an empty public title from its private source", () => {
  const d = seed();
  expect(publicDocument(d, "laurel").items).toEqual([]);
  d.studio = {
    ...studioOf(d),
    publications: [
      {
        id: "p",
        projectId: "laurel",
        target: "entry",
        targetId: "morgan",
        enabled: true,
        title: "",
        text: "説明",
      },
    ],
  };
  expect(publicDocument(d, "laurel").items[0].title).toBe("公開設定");
});

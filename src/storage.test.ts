import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { load, persist } from "./storage";
it("initializes once and preserves user edits, removed samples, images and empty projects across reloads", async () => {
  const data = await load();
  data.projects[0].name = "自分の作品";
  data.entries = [];
  data.relations = [];
  data.projects[0].image = "data:image/png;base64,YWJj";
  await persist(data);
  const next = await load();
  expect(next.projects[0].name).toBe("自分の作品");
  expect(next.projects[0].image).toBe(data.projects[0].image);
  expect(next.entries).toHaveLength(0);
  next.projects = [];
  await persist(next);
  expect((await load()).projects).toHaveLength(0);
});

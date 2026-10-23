import { test, expect } from "@playwright/test";
import { emptyData, newProject, newEntry } from "../src/model";
import { emptyStudio } from "../src/studio/model";
test("mobile can open a separate character editor or keep the inline view; time graph aligns world and story", async ({
  page,
}) => {
  const d = emptyData();
  d.projects = [
    {
      ...newProject(),
      id: "s",
      name: "物語",
      collectionId: "w",
      worldIds: ["w"],
    },
    { ...newProject("world"), id: "w", name: "世界" },
  ];
  d.entries = Array.from({ length: 25 }, (_, i) => ({
    ...newEntry("w", "character"),
    id: `p${i}`,
    name: `人物${i}`,
    body: `プロフィール${i}`,
  }));
  d.entries.push(
    {
      ...newEntry("w", "event"),
      id: "war",
      name: "世界の戦争",
      fields: { 年代: "100" },
    },
    {
      ...newEntry("w", "event"),
      id: "past",
      name: "過去の事件",
      fields: { 年代: "-20" },
    },
  );
  d.studio = emptyStudio();
  d.studio.columns = [
    { id: "chapter", projectId: "s", name: "第一章", order: 0, chapterId: "" },
  ];
  d.studio.scenes = [
    {
      id: "scene",
      projectId: "s",
      columnId: "chapter",
      name: "細かな場面",
      status: "草稿",
      summary: "",
      note: "",
      order: 0,
      year: 100,
      eventId: "war",
      links: [],
      castIds: ["p19"],
      timeText: "戦争初日の夜",
    },
    {
      id: "unknown",
      projectId: "s",
      columnId: "chapter",
      name: "未定の場面",
      status: "草稿",
      summary: "",
      note: "",
      order: 1,
      links: [],
      timeText: "翌朝",
    },
  ];
  await page.addInitScript((data) => {
    localStorage.setItem("tsuzuriniwa:launch-mode", "resume");
    localStorage.setItem("tsuzuriniwa:active-workspace", "s");
    localStorage.setItem("tsuzuriniwa:resume-view", "creation");
    const q = indexedDB.open("tsuzuriniwa", 1);
    q.onupgradeneeded = () =>
      q.result.createObjectStore("state").put(data, "main");
    q.onsuccess = () => q.result.close();
  }, d);
  await page.goto("./");
  await page
    .getByRole("button", { name: "登場人物・関係", exact: true })
    .click();
  await page.getByLabel("登場人物を探す", { exact: true }).fill("人物19");
  await page.locator(".creation-person").click();
  await expect(
    page.getByRole("region", { name: "人物19のストーリー設定", exact: true }),
  ).toBeVisible();
  if (test.info().project.name === "android") {
    await expect(page.locator(".editor-list-pane")).toBeHidden();
    await page
      .getByRole("button", { name: "← 人物の一覧へ戻る", exact: true })
      .click();
    await expect(
      page.getByLabel("登場人物を探す", { exact: true }),
    ).toHaveValue("人物19");
  } else await expect(page.locator(".editor-list-pane")).toBeVisible();
  await page
    .getByRole("button", { name: "シーンの時間軸", exact: true })
    .click();
  const graph = page.getByRole("region", {
    name: "世界と物語の時間軸グラフ",
    exact: true,
  });
  await expect(graph).toBeVisible();
  const row = page.locator(".time-graph-row").filter({ hasText: "100年" });
  await expect(row).toContainText("世界の戦争");
  await expect(row).toContainText("細かな場面");
  await expect(page.locator(".time-graph-row").first()).toContainText("-20年");
  await expect(page.locator(".time-unknown")).toContainText("未定の場面");
  await graph.screenshot({
    path: `/tmp/storymaker-time-graph-${test.info().project.name}.png`,
  });
  await graph.getByText("章・人物で絞り込む", { exact: true }).click();
  await graph.getByLabel("グラフの人物").selectOption("p19");
  await expect(graph).not.toContainText("未定の場面");
  await graph.getByRole("button", { name: /細かな場面/ }).click();
  await expect(page.getByLabel("シーン名", { exact: true })).toHaveValue(
    "細かな場面",
  );
  const menu = page.getByRole("button", {
    name: "メニューを開く",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("button", { name: "設定・バックアップ", exact: true })
    .click();
  await page.getByRole("button", { name: "見た目", exact: true }).click();
  await page
    .getByRole("button", { name: "一覧と詳細を同じ画面に", exact: true })
    .click();
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
  await page.reload();
  if (await menu.isVisible()) await menu.click();
  await page
    .locator(".main-nav")
    .getByRole("button", { name: "制作画面", exact: true })
    .click();
  await page
    .getByRole("button", { name: "登場人物・関係", exact: true })
    .click();
  await expect(page.locator(".editor-list-pane")).toBeVisible();
  await expect(page.locator(".editor-detail-pane")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("phone navigation goes directly to people and materials, remembers selection, and native back returns to the list", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "android", "Phone-only navigation");
  const data = emptyData();
  data.projects = [{ ...newProject(), id: "s", name: "長い物語" }];
  data.entries = Array.from({ length: 80 }, (_, i) => ({
    ...newEntry("s", "character"),
    id: `c${i}`,
    name: `人物${i}`,
  }));
  data.entries.push({
    ...newEntry("s", "world"),
    id: "place",
    name: "街の資料",
  });
  await page.addInitScript((d) => {
    localStorage.setItem("tsuzuriniwa:launch-mode", "resume");
    localStorage.setItem("tsuzuriniwa:active-workspace", "s");
    const q = indexedDB.open("tsuzuriniwa", 1);
    q.onupgradeneeded = () =>
      q.result.createObjectStore("state").put(d, "main");
    q.onsuccess = () => q.result.close();
  }, data);
  await page.goto("./");
  const bottom = page.getByRole("navigation", {
    name: "スマートフォンナビゲーション",
  });
  await bottom.getByRole("button", { name: "人物", exact: true }).click();
  const search = page.getByLabel("登場人物を探す", { exact: true });
  await expect(search).toBeVisible();
  expect((await search.boundingBox())!.y).toBeLessThan(450);
  await search.fill("人物79");
  await page.locator(".creation-person").click();
  await expect(page.locator(".creation-tabs")).toBeHidden();
  await expect(
    page.getByRole("region", { name: "人物79のストーリー設定" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "登場人物に追加", exact: true })
    .click();
  const role = page.getByLabel("このストーリーでの役割", { exact: true });
  await role.fill("保存する役割");
  await role.focus();
  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    Object.defineProperty(viewport, "height", {
      configurable: true,
      value: viewport.height - 300,
    });
    viewport.dispatchEvent(new Event("resize"));
  });
  await expect(bottom).toBeHidden();
  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    delete (viewport as unknown as Record<string, unknown>).height;
    (document.activeElement as HTMLElement)?.blur();
    viewport.dispatchEvent(new Event("resize"));
  });
  await expect(bottom).toBeVisible();
  await page.screenshot({
    path: "/tmp/storymaker-phone-refined.png",
    fullPage: false,
  });
  await bottom.getByRole("button", { name: "資料", exact: true }).click();
  await page
    .getByRole("button", { name: /街の資料/ })
    .filter({ has: page.locator("strong") })
    .click();
  await expect(
    page.getByRole("region", { name: "街の資料のストーリー設定" }),
  ).toBeVisible();
  await bottom.getByRole("button", { name: "人物", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "人物79のストーリー設定" }),
  ).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("native-back")));
  await expect(search).toHaveValue("人物79");
  await expect(page.locator(".editor-detail-pane")).toBeHidden();
  await bottom.getByRole("button", { name: "その他", exact: true }).click();
  await page
    .getByRole("button", { name: "時間軸グラフを開く", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "世界と物語の時間軸グラフ" }),
  ).toBeVisible();
});

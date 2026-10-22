import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { emptyData, newEntry, newProject } from "../src/model";
async function sidebar(page: Page) {
  await page.locator(".main-nav").waitFor({ state: "attached" });
  if (await page.getByRole("button", { name: "メニューを開く" }).isVisible())
    await page.getByRole("button", { name: "メニューを開く" }).click();
}
async function nav(page: Page, name: string) {
  await sidebar(page);
  await page
    .locator(".main-nav")
    .getByRole("button", { name, exact: false })
    .click();
}
test("create independent world library and a story referencing it without parent controls", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "あなたの物語を、ここから。" }),
  ).toBeVisible();
  await sidebar(page);
  await page
    .locator(".sidebar-bottom")
    .getByRole("button", { name: "世界観ライブラリ", exact: true })
    .click();
  await page.getByRole("button", { name: "世界観を作成", exact: true }).click();
  await page
    .getByRole("textbox", { name: /世界観の名前/ })
    .fill("独立した世界資料");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "世界観を作成", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "独立した世界資料", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "この世界観を使うストーリーを作成",
      exact: true,
    })
    .click();
  await page.getByRole("textbox", { name: /作品名/ }).fill("最初のストーリー");
  await expect(
    page.getByRole("checkbox", { name: "独立した世界資料", exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("上位プロジェクト")).toHaveCount(0);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ストーリーを作成", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "ストーリーと参照資料" }),
  ).toContainText("参照する世界観：独立した世界資料");
  await page
    .getByRole("button", { name: "参照する世界観を変更", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "独立した世界資料", exact: true })
    .uncheck();
  await page.getByRole("button", { name: "完了", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "ストーリーと参照資料" }),
  ).toContainText("未選択");
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
  await page.reload();
  await sidebar(page);
  await page
    .locator(".sidebar-bottom")
    .getByRole("button", { name: "ストーリー管理", exact: true })
    .click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await expect(page.locator(".project-card")).toContainText("最初のストーリー");
  await page
    .locator(".library-tabs")
    .getByRole("button", { name: "世界観ライブラリ", exact: true })
    .click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await expect(page.locator(".project-card")).toContainText("独立した世界資料");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("chronological dates and story presentation order are independent and persist", async ({
  page,
}) => {
  const data = emptyData();
  data.projects = [
    { ...newProject(), id: "s", name: "物語A", worldIds: ["w"] },
    { ...newProject("world"), id: "w", name: "背景世界" },
    { ...newProject(), id: "b", name: "物語B", worldIds: ["w"] },
  ];
  data.entries = [
    {
      ...newEntry("w", "event"),
      id: "early",
      name: "建国前の事件",
      fields: { 年代: "-10" },
    },
    {
      ...newEntry("w", "event"),
      id: "late",
      name: "秋の事件",
      fields: { 年代: "0", 月: "10" },
    },
    {
      ...newEntry("s", "event"),
      id: "now",
      name: "春の場面",
      fields: { 年代: "0", 月: "2", 日: "3" },
    },
    { ...newEntry("s", "event"), id: "unknown", name: "年代未定の場面" },
    { ...newEntry("b", "event"), name: "別の物語の出来事" },
  ];
  await page.addInitScript((value) => {
    const request = indexedDB.open("tsuzuriniwa", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("state").put(value, "main");
    request.onsuccess = () => request.result.close();
  }, data);
  await page.goto("./");
  await nav(page, "年表");
  const names = page.locator(".timeline-card h2");
  await expect(names).toHaveText([
    "建国前の事件",
    "春の場面",
    "秋の事件",
    "年代未定の場面",
  ]);
  await page.getByLabel("年代順の向き").selectOption("desc");
  await expect(names).toHaveText([
    "秋の事件",
    "春の場面",
    "建国前の事件",
    "年代未定の場面",
  ]);
  await page.getByLabel("年代の確定状態").selectOption("unknown");
  await expect(names).toHaveText(["年代未定の場面"]);
  await page.getByLabel("年代の確定状態").selectOption("all");
  await page.getByLabel("開始年で絞り込み").fill("0");
  await expect(names).toHaveText(["秋の事件", "春の場面"]);
  await page.getByLabel("開始年で絞り込み").fill("");
  await page
    .locator(".timeline-card-wrap")
    .filter({ hasText: "建国前の事件" })
    .getByRole("button", { name: "このストーリーに使う", exact: true })
    .click();
  await page
    .getByRole("button", { name: "ストーリーで描く順番", exact: true })
    .click();
  await expect(names).toHaveText([
    "春の場面",
    "年代未定の場面",
    "建国前の事件",
  ]);
  await page
    .getByRole("button", { name: "建国前の事件を前に移動", exact: true })
    .click();
  await page
    .getByRole("button", { name: "建国前の事件を前に移動", exact: true })
    .click();
  await expect(names).toHaveText([
    "建国前の事件",
    "春の場面",
    "年代未定の場面",
  ]);
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
  await page.reload();
  await nav(page, "年表");
  await page
    .getByRole("button", { name: "ストーリーで描く順番", exact: true })
    .click();
  await expect(names).toHaveText([
    "建国前の事件",
    "春の場面",
    "年代未定の場面",
  ]);
  await page.getByRole("button", { name: "年代順の年表", exact: true }).click();
  await expect(names).toHaveText([
    "建国前の事件",
    "春の場面",
    "秋の事件",
    "年代未定の場面",
  ]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";
async function library(page: Page) {
  const menu = page.getByRole("button", { name: "メニューを開く", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("button", { name: "ストーリー管理", exact: true }).click();
}
async function create(page: Page, button: string, name: string, world = false) {
  await page.getByRole("button", { name: button, exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: world ? /世界観の名前/ : /作品名/ }).fill(name);
  await dialog.getByRole("button", { name: world ? "世界観を作成" : "ストーリーを作成", exact: true }).click();
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
  await library(page);
}
test("visually builds world-series-work shelves, moves a series with its children, and persists", async ({ page }) => {
  await page.goto("./");
  await library(page);
  await create(page, "世界観を追加", "ユーフラス", true);
  await create(page, "ユーフラスに作品を追加", "明日も花は咲く");
  await create(page, "ユーフラスにシリーズを追加", "鬼達は宴で嗤う");
  await create(page, "鬼達は宴で嗤うに作品を追加", "第一夜");
  const tree = page.locator(".project-tree");
  const series = tree.locator("li").filter({ has: page.getByRole("button", { name: "鬼達は宴で嗤うの制作画面をひらく", exact: true }) }).last();
  await expect(series.getByRole("button", { name: "第一夜の制作画面をひらく", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "鬼達は宴で嗤うを折りたたむ", exact: true }).click();
  await expect(tree.getByRole("button", { name: "第一夜の制作画面をひらく", exact: true })).toBeHidden();
  await page.getByRole("button", { name: "鬼達は宴で嗤うを展開", exact: true }).click();
  await page.getByRole("button", { name: "鬼達は宴で嗤うの所属を変更", exact: true }).click();
  await page.getByLabel("「鬼達は宴で嗤う」の移動先").selectOption("");
  await page.getByRole("button", { name: "ここへ移動", exact: true }).click();
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
  await page.reload();
  await library(page);
  const root = page.locator(".project-tree > .shelf-branches > li");
  await expect(root.filter({ has: page.getByRole("button", { name: "鬼達は宴で嗤うの制作画面をひらく", exact: true }) })).toContainText("第一夜");
  await expect(root.filter({ has: page.getByRole("button", { name: "ユーフラスの制作画面をひらく", exact: true }) })).not.toContainText("第一夜");
  await page.getByRole("button", { name: "ユーフラスの名前・説明を編集", exact: true }).click();
  await page.getByRole("dialog").getByRole("textbox", { name: "説明", exact: true }).fill("共有する世界観の説明");
  await page.getByRole("dialog").getByRole("button", { name: "完了", exact: true }).click();
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
  await expect(page.locator(".project-tree").getByRole("button", { name: "明日も花は咲くの制作画面をひらく", exact: true })).toBeVisible();
  const heights = await page.locator(".shelf-root-actions .button").evaluateAll((buttons) => buttons.map((b) => b.getBoundingClientRect().height));
  expect(new Set(heights).size).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/storymaker-tree-${test.info().project.name}.png`, fullPage:true });
});

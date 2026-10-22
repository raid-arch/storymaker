import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function settings(page: Page) {
  if (
    await page
      .getByRole("button", { name: "開始画面の設定を開く", exact: true })
      .isVisible()
  )
    return page
      .getByRole("button", { name: "開始画面の設定を開く", exact: true })
      .click();
  const menu = page.getByRole("button", {
    name: "メニューを開く",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("button", { name: "設定・バックアップ", exact: true })
    .click();
}
test("start, select, edit a parent world and its story, and choose startup behavior", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("main", { name: "開始画面", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".main-nav")).toHaveCount(0);
  await page.getByRole("button", { name: /新しく作る/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: /世界観の名前/ })
    .fill("共通の世界");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "世界観を作成", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "世界観の制作画面", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "時間・暦", exact: true }).click();
  await page.getByLabel("世界観で作成する設定の名前").fill("世界共通の暦");
  await page.getByRole("button", { name: "設定を作成", exact: true }).click();
  await page
    .getByLabel("世界観の設定本文", { exact: true })
    .fill("一年は十二か月。");
  await page
    .getByRole("button", {
      name: "この世界観を使うストーリーを作成",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: /作品名/ })
    .fill("この世界の物語");
  await expect(
    page.getByRole("dialog").getByLabel("親の世界観", { exact: true }),
  ).not.toHaveValue("");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "ストーリーを作成", exact: true })
    .click();
  await expect(page.locator(".workspace-scope-strip")).toContainText(
    "共通の世界 の設定に準拠",
  );
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
  await page.reload();
  await expect(
    page.getByRole("main", { name: "開始画面", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /プロジェクトを開く/ }).click();
  await expect(
    page.getByRole("main", { name: "プロジェクト選択", exact: true }),
  ).toBeVisible();
  await page
    .locator(".gateway-story")
    .filter({ hasText: "この世界の物語" })
    .click();
  if (test.info().project.name === "android") {
    await expect(
      page.getByRole("region", { name: "プロジェクトの作業選択", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: /物語の構成・本文を作る/ }).click();
    await page
      .getByRole("button", { name: "親の世界観・関連資料を開く", exact: true })
      .click();
  }
  await expect(
    page.getByRole("complementary", {
      name: "プロジェクトの関連資料",
      exact: true,
    }),
  ).toContainText("共通の世界");
  if (test.info().project.name === "android")
    await page
      .getByRole("button", { name: "関連資料を閉じる", exact: true })
      .first()
      .click();
  await page
    .getByRole("button", { name: "舞台・設定資料", exact: true })
    .click();
  await expect(page.locator(".creation-index")).toContainText("世界共通の暦");
  if(test.info().project.name === "desktop") await expect(page.locator(".desktop-project-tree").getByRole("button",{name:"この世界の物語",exact:true})).toBeInViewport();
  await page.screenshot({path: `/tmp/storymaker-project-editor-${test.info().project.name}.png`, fullPage:true});
  await page.setViewportSize({width:320,height:740});
  await page.evaluate(()=>document.documentElement.style.setProperty("--text-scale","1.25"));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await settings(page);
  await page
    .getByRole("button", { name: "前回のプロジェクトを開く", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("region", { name: "ストーリー制作画面", exact: true }),
  ).toBeVisible();
  await settings(page);
  await page
    .getByRole("button", { name: "開始画面から始める", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("main", { name: "開始画面", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

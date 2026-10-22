import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
async function person(page: Page) {
  await page.locator(".topbar").waitFor();
  const menu = page.getByRole("button", {
    name: "メニューを開く",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .locator(".main-nav")
    .getByRole("button", { name: /キャラクター/ })
    .click();
  await page
    .locator(".entry-card")
    .filter({ has: page.getByRole("heading", { name: "人物A", exact: true }) })
    .click();
}
test("durable versions survive reload, restore old drafts, and preserve unrelated links", async ({
  page,
}) => {
  await page.goto("./");
  await person(page);
  await page.getByLabel("設定・メモ", { exact: true }).fill("残しておく第一案");
  await page.getByRole("button", { name: "版を保存", exact: true }).click();
  await page.getByLabel("設定・メモ", { exact: true }).fill("変更後の第二案");
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
  await page.reload();
  await person(page);
  await page.getByRole("button", { name: "変更履歴", exact: true }).click();
  await page
    .locator(".studio-record-list button")
    .filter({ hasText: "手動で保存した版" })
    .click();
  await expect(page.locator(".studio-preview")).toContainText(
    "残しておく第一案",
  );
  await page.getByRole("button", { name: "この版に戻す", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "この版に戻す", exact: true })
    .click();
  await page.getByRole("button", { name: "設定へ戻る", exact: true }).click();
  await expect(page.getByLabel("設定・メモ", { exact: true })).toHaveValue(
    "残しておく第一案",
  );
  await expect(page.locator(".link-row")).toHaveCount(2);
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
  await page.reload();
  await person(page);
  await expect(page.getByLabel("設定・メモ", { exact: true })).toHaveValue(
    "残しておく第一案",
  );
});
test("impact view navigates related settings and respects mobile width", async ({
  page,
}) => {
  await page.goto("./");
  await person(page);
  await page
    .getByRole("button", { name: "変更の影響を見る", exact: true })
    .click();
  await expect(
    page.locator(".studio-result").filter({ hasText: "テスト家" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".studio-result").filter({ hasText: "テスト家" }).click();
  await expect(
    page.getByRole("heading", { name: "テスト家", exact: true }),
  ).toBeVisible();
});

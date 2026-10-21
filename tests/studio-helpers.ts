import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
export async function navStudio(page: Page, tab: string) {
  const menu = page.getByRole("button", { name: "メニューを開く" });
  if (await menu.isVisible()) await menu.click();
  await page
    .locator(".main-nav")
    .getByRole("button", { name: "創作スタジオ", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "創作スタジオの機能" })
    .getByRole("button", { name: tab, exact: true })
    .click();
}
export async function openPerson(page: Page, name = "人物A") {
  const menu = page.getByRole("button", { name: "メニューを開く" });
  if (await menu.isVisible()) await menu.click();
  await page
    .locator(".main-nav")
    .getByRole("button", { name: /キャラクター/ })
    .click();
  await page
    .locator(".entry-card")
    .filter({ has: page.getByRole("heading", { name, exact: true }) })
    .click();
}
export async function saved(page: Page) {
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
}

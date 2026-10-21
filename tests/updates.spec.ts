import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

async function settings(page: Page) {
  const menu = page.getByRole("button", { name: "メニューを開く" });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("button", { name: "設定・バックアップ", exact: true })
    .click();
}
test("foreground and manual update checks retain edits, throttle requests, and handle network errors", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    const original = ServiceWorkerRegistration.prototype.update;
    Object.assign(window, { updateChecks: 0, updateFailure: false });
    ServiceWorkerRegistration.prototype.update = function () {
      const state = window as unknown as {
        updateChecks: number;
        updateFailure: boolean;
      };
      state.updateChecks++;
      if (state.updateFailure) return Promise.reject(new Error("Offline test"));
      return original.call(this);
    };
  });
  await page.goto("./");
  await expect(page.locator(".project-hero")).toBeVisible();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.locator(".hero-open").click();
  await page.getByLabel("説明", { exact: true }).fill("更新確認で消えない説明");
  await page.getByRole("button", { name: "完了", exact: true }).click();
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
  const calls = () =>
    page.evaluate(
      () => (window as unknown as { updateChecks: number }).updateChecks,
    );
  const before = await calls();
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(calls).toBe(before + 1);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(calls).toBe(before + 1);
  await settings(page);
  await expect(page.locator(".app-version")).toContainText("アプリの版：");
  const button = page.getByRole("button", {
    name: "アプリの更新を確認",
    exact: true,
  });
  await button.click();
  await expect(page.locator(".toast")).toContainText("更新を確認しました");
  expect(await calls()).toBe(before + 2);
  await page.evaluate(() => {
    (window as unknown as { updateFailure: boolean }).updateFailure = true;
  });
  await button.click();
  await expect(page.locator(".toast")).toContainText(
    "更新を確認できませんでした",
  );
  await expect(button).toBeEnabled();
  await context.setOffline(true);
  await button.click();
  await expect(page.locator(".toast")).toContainText("オフラインです");
  expect(await calls()).toBe(before + 3);
  await context.setOffline(false);
  await page.reload();
  await expect(page.locator(".hero-content")).toContainText(
    "更新確認で消えない説明",
  );
});

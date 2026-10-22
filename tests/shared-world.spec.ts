import { test, expect } from "@playwright/test";
import { emptyData, newEntry, newProject } from "../src/model";
test("shared setting opens inside its story and sibling settings remain separate", async ({
  page,
}) => {
  const data = emptyData();
  data.projects = [
    { ...newProject("world"), id: "world", name: "共通世界", type: "世界観" },
    { ...newProject(), id: "a", parentId: "world", name: "物語A" },
    { ...newProject(), id: "b", parentId: "world", name: "物語B" },
  ];
  data.entries = [
    { ...newEntry("world", "character"), id: "shared", name: "共通人物" },
    { ...newEntry("a", "character"), name: "Aだけの人物" },
    { ...newEntry("b", "character"), name: "Bだけの人物" },
  ];
  await page.addInitScript((value) => {
    const request = indexedDB.open("tsuzuriniwa", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("state").put(value, "main");
    request.onsuccess = () => request.result.close();
  }, data);
  await page.goto("./");
  await page.locator(".main-nav").waitFor({ state: "attached" });
  if (await page.getByRole("button", { name: "メニューを開く" }).isVisible())
    await page.getByRole("button", { name: "メニューを開く" }).click();
  await page.locator(".project-switch").click();
  await page
    .locator(".project-menu")
    .getByRole("button", { name: "物語A", exact: true })
    .click();
  const scope = page.getByRole("region", { name: "ストーリーと参照資料" });
  await expect(scope).toContainText("参照資料の設定：1件");
  if (await page.getByRole("button", { name: "メニューを開く" }).isVisible())
    await page.getByRole("button", { name: "メニューを開く" }).click();
  await page
    .locator(".main-nav")
    .getByRole("button", { name: /キャラクター/ })
    .click();
  await expect(page.locator(".entry-card")).toHaveCount(2);
  await expect(page.locator(".entry-card")).not.toContainText(["Bだけの人物"]);
  await page.locator(".entry-card").filter({ hasText: "共通人物" }).click();
  await expect(
    page.getByRole("heading", { name: "共通人物", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".project-switch")).toContainText("物語A");
  await page.getByLabel("名前", { exact: true }).fill("更新した共通人物");
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
  await page.getByRole("button", { name: "一覧へ戻る", exact: true }).click();
  await expect(page.locator(".entry-card")).toHaveCount(2);
  await page.reload();
  await page.locator(".main-nav").waitFor({ state: "attached" });
  if (await page.getByRole("button", { name: "メニューを開く" }).isVisible())
    await page.getByRole("button", { name: "メニューを開く" }).click();
  await page.locator(".project-switch").click();
  await page
    .locator(".project-menu")
    .getByRole("button", { name: "物語B", exact: true })
    .click();
  if (await page.getByRole("button", { name: "メニューを開く" }).isVisible())
    await page.getByRole("button", { name: "メニューを開く" }).click();
  await page
    .locator(".main-nav")
    .getByRole("button", { name: /キャラクター/ })
    .click();
  await expect(page.locator(".entry-card")).toHaveCount(2);
  await expect(
    page.locator(".entry-card").filter({ hasText: "更新した共通人物" }),
  ).toHaveCount(1);
  await expect(
    page.locator(".entry-card").filter({ hasText: "Aだけの人物" }),
  ).toHaveCount(0);
});

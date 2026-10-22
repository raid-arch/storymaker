import { test, expect } from "@playwright/test";
import { emptyData, newEntry, newProject } from "../src/model";
test("project picker long press edits, trash survives reload, and restore and permanent deletion are separate", async ({
  page,
}) => {
  const d = emptyData();
  d.projects = [
    { ...newProject("world"), id: "w", name: "長押しする世界" },
    {
      ...newProject(),
      id: "s",
      name: "残す物語",
      collectionId: "w",
      worldIds: ["w"],
    },
  ];
  d.entries = [
    {
      ...newEntry("w", "world"),
      id: "setting",
      name: "復元する設定",
      body: "失わない本文",
    },
  ];
  await page.addInitScript((data) => {
    const q = indexedDB.open("tsuzuriniwa", 1);
    q.onupgradeneeded = () =>
      q.result.createObjectStore("state").put(data, "main");
    q.onsuccess = () => q.result.close();
  }, d);
  async function picker() {
    await page.getByRole("button", { name: /プロジェクトを開く/ }).click();
  }
  async function remove() {
    await page
      .getByRole("button", { name: "長押しする世界の操作", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /削除する/ })
      .click();
    await expect(page.getByRole("dialog")).toContainText("ゴミ箱");
    await page.getByRole("button", { name: "実行する", exact: true }).click();
    await expect(page.locator(".gateway-world")).toHaveCount(0);
  }
  await page.goto("./");
  await picker();
  const surface = page.locator(".gateway-world");
  if (test.info().project.name === "android") {
    const box = (await surface.locator("h2").boundingBox())!;
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + 20, y: box.y + 10 }],
    });
    await page.waitForTimeout(650);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await client.detach();
  } else await surface.dispatchEvent("contextmenu");
  await expect(
    page.getByRole("dialog", { name: "長押しする世界の操作" }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /編集する/ })
    .click();
  await expect(page.getByLabel(/世界観の名前/)).toHaveValue(
    "長押しする世界",
  );
  await page.getByRole("button", { name: "完了", exact: true }).click();
  // A child has its own menu; events must never open the parent's action sheet.
  await page
    .getByRole("button", { name: "残す物語の操作", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "残す物語の操作" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "キャンセル", exact: true }).click();
  await remove();
  await expect(page.locator(".gateway-story")).toContainText("残す物語");
  await expect(
    page.getByRole("status").filter({ hasText: "保存済み" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "ゴミ箱（1）", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "ゴミ箱", exact: true }),
  ).toContainText("長押しする世界");
  await page.getByRole("button", { name: "復元", exact: true }).click();
  await expect(page.locator(".trash-empty")).toBeVisible();
  await page.getByRole("button", { name: "ゴミ箱を閉じる" }).click();
  await picker();
  await expect(page.locator(".gateway-world")).toContainText("残す物語");
  await remove();
  await page.getByRole("button", { name: "ゴミ箱（1）", exact: true }).click();
  await page.getByRole("button", { name: "完全削除", exact: true }).click();
  await expect(page.getByRole("dialog").last()).toContainText("取り消せず");
  await page.getByRole("button", { name: "実行する", exact: true }).click();
  await expect(page.locator(".trash-empty")).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "保存済み" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "ゴミ箱（0）", exact: true }).click();
  await expect(page.locator(".trash-empty")).toBeVisible();
});

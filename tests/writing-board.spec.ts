import { test, expect } from "@playwright/test";
import { emptyData, newProject, newEntry } from "../src/model";
import { emptyStudio } from "../src/studio/model";
test.beforeEach(async ({ page }) => {
  const d = emptyData();
  d.projects = [{ ...newProject(), id: "s", name: "執筆作品" }];
  d.entries = [
    {
      ...newEntry("s", "world"),
      id: "place",
      name: "設定資料",
      body: "元の資料",
    },
  ];
  d.studio = emptyStudio();
  d.studio.scenes = [
    {
      id: "one",
      projectId: "s",
      columnId: "",
      name: "第一場面",
      summary: "最初の概要",
      note: "",
      status: "草稿",
      order: 0,
      links: [],
      manuscript: "以前の本文",
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
});
test("writing is separate from settings and preserves formatted manuscripts and branching boards", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "執筆", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "執筆本文", exact: true });
  await expect(editor).toHaveText("以前の本文");
  await editor.fill("新しい原稿です。");
  await editor.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const selection = getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    el.dispatchEvent(new Event("mouseup", { bubbles: true }));
  });
  await page.getByRole("button", { name: "太字", exact: true }).click();
  await expect(editor.locator("b,strong")).toContainText("新しい原稿です。");
  await expect(page.getByLabel("シーンが参照する事件")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: `/tmp/storymaker-writing-${test.info().project.name}.png` });
  await page.getByRole("button", { name: "設定・構成", exact: true }).click();
  await page.getByRole("button", { name: "構成ボード", exact: true }).click();
  await page
    .getByRole("button", { name: "最初のボードを作る", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "ボードへシーンを追加" })
    .selectOption("one");
  await page.getByRole("button", { name: "＋ メモ", exact: true }).click();
  await page.getByLabel("カード名", { exact: true }).fill("分岐先のメモ");
  await page
    .getByLabel("カードのメモ", { exact: true })
    .fill("成功したらこの場面へ");
  await page.getByRole("button", { name: "全体を表示", exact: true }).click();
  const first = page.locator(".flow-node").filter({ hasText: "第一場面" });
  await first.getByRole("button", { name: "接続", exact: true }).click();
  await page
    .locator(".flow-node-handle")
    .filter({ hasText: "分岐先のメモ" })
    .click();
  await page
    .getByLabel("分岐条件", { exact: true })
    .fill("条件：鍵を持っている");
  await page.getByRole("button", { name: "現在地にする", exact: true }).click();
  await expect(page.locator(".flow-lines text")).toContainText(
    "条件：鍵を持っている",
  );
  await expect(page.locator(".flow-node.current")).toContainText(
    "分岐先のメモ",
  );
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
  await page.reload();
  await expect(page.locator(".flow-lines text")).toContainText(
    "条件：鍵を持っている",
  );
  await page.screenshot({ path: `/tmp/storymaker-board-${test.info().project.name}.png` });
  await page.getByRole("button", { name: "執筆", exact: true }).click();
  await expect(editor.locator("b,strong")).toContainText("新しい原稿です。");
});
test("desktop popouts load the requested workspace and update other windows without losing separate edits", async ({
  page,
}) => {
  test.skip(test.info().project.name !== "desktop");
  await page.goto("./");
  const popupPromise = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "資料を別ウィンドウ", exact: true })
    .click();
  const popup = await popupPromise;
  await expect(
    popup.getByRole("region", { name: "ストーリー制作画面" }),
  ).toBeVisible();
  await expect(popup.locator(".sidebar")).toBeHidden();
  await popup
    .getByRole("button", { name: "設定資料", exact: false })
    .filter({ has: popup.locator("strong") })
    .click();
  await popup
    .getByLabel("このストーリーでの使い方", { exact: true })
    .fill("資料ウィンドウの補足");
  await page.getByRole("button", { name: "執筆", exact: true }).click();
  const editor = page.getByRole("textbox", { name: "執筆本文", exact: true });
  await editor.fill("執筆ウィンドウの本文");
  await editor.blur();
  await popup.getByLabel("このストーリーでの使い方", { exact: true }).blur();
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
  await expect(popup.locator(".save-indicator")).toContainText("保存済み");
  await page.reload();
  await expect(editor).toHaveText("執筆ウィンドウの本文");
  await popup.reload();
  await popup
    .getByRole("button", { name: "設定資料", exact: false })
    .filter({ has: popup.locator("strong") })
    .click();
  await expect(
    popup.getByLabel("このストーリーでの使い方", { exact: true }),
  ).toHaveValue("資料ウィンドウの補足");
  await popup.close();
});

import { test, expect } from "./fixtures";
import { navStudio, openPerson, saved } from "./studio-helpers";
test("consistency findings link to editable records and disappear after date correction", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".project-hero")).toBeVisible();
  await openPerson(page);
  await page.getByLabel("生年（共通年表）", { exact: true }).fill("20");
  await page.getByLabel("没年（共通年表）", { exact: true }).fill("10");
  await saved(page);
  await navStudio(page, "矛盾チェック");
  await expect(page.locator(".studio-finding")).toContainText(
    "生年が没年より後",
  );
  await page
    .locator(".studio-finding")
    .getByRole("button", { name: "人物Aを開く", exact: true })
    .click();
  await page.getByLabel("生年（共通年表）", { exact: true }).fill("0");
  await navStudio(page, "矛盾チェック");
  await expect(page.locator(".studio-finding")).toHaveCount(0);
});
test("characters retain separate beliefs before and after acquiring a secret", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".project-hero")).toBeVisible();
  await navStudio(page, "人物の認識");
  for (const [year, belief] of [
    ["0", "誤った説明を信じる"],
    ["10", "真相を知った"],
  ]) {
    await page.getByRole("button", { name: "認識を記録", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("認識する人物", { exact: true })
      .selectOption("morgan");
    await dialog
      .getByLabel("秘密・認識の対象", { exact: true })
      .selectOption("succession");
    await dialog
      .getByLabel("本人が信じていること", { exact: true })
      .fill(belief);
    await dialog
      .getByLabel("情報を得た年（未確定は空欄）", { exact: true })
      .fill(year);
    await dialog.getByRole("button", { name: "保存", exact: true }).click();
  }
  await page.getByLabel("認識を確認する年", { exact: true }).fill("0");
  await expect(page.locator(".studio-section")).toContainText(
    "誤った説明を信じる",
  );
  await expect(page.locator(".studio-section")).not.toContainText(
    "真相を知った",
  );
  await page.getByLabel("認識を確認する年", { exact: true }).fill("10");
  await expect(page.locator(".studio-section")).toContainText("真相を知った");
  await expect(page.locator(".studio-section")).not.toContainText(
    "誤った説明を信じる",
  );
  await saved(page);
  await page.reload();
  await expect(page.locator(".topbar")).toBeVisible();
  await navStudio(page, "人物の認識");
  await page.getByLabel("認識を確認する年", { exact: true }).fill("0");
  await expect(page.locator(".studio-section")).toContainText(
    "誤った説明を信じる",
  );
});
test("era views display past drafts read-only and return to intact current settings", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".project-hero")).toBeVisible();
  await navStudio(page, "時代別の設定");
  await page.getByRole("button", { name: "時代を追加", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("時代名", { exact: true }).fill("古い時代");
  await dialog.getByLabel("時代の開始年", { exact: true }).fill("0");
  await dialog.getByLabel("時代の終了年", { exact: true }).fill("9");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await page
    .getByLabel("時代別の案を作る設定", { exact: true })
    .selectOption("morgan");
  await page
    .getByRole("button", { name: "時代別の案を作る", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("対象の時代", { exact: true })
    .selectOption({ label: "古い時代" });
  await dialog.getByLabel("時代別の名前", { exact: true }).fill("過去の人物A");
  await dialog
    .getByLabel("時代別の設定・メモ", { exact: true })
    .fill("幼少期の案");
  await dialog
    .getByRole("button", { name: "時代別の案を保存", exact: true })
    .click();
  await page
    .getByRole("button", { name: "この時代を表示", exact: true })
    .click();
  const menu = page.getByRole("button", { name: "メニューを開く" });
  if (await menu.isVisible()) await menu.click();
  await page
    .locator(".main-nav")
    .getByRole("button", { name: /キャラクター/ })
    .click();
  await page.locator(".entry-card").filter({ hasText: "過去の人物A" }).click();
  await expect(
    page.getByRole("heading", { name: "過去の人物A", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".entry-page")).toContainText("幼少期の案");
  await expect(
    page.getByRole("textbox", { name: "名前", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "現在の設定を編集", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "人物A", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("設定・メモ", { exact: true })).toHaveValue(
    "テスト用の人物です。",
  );
  await saved(page);
  await page.reload();
  await expect(page.locator(".topbar")).toBeVisible();
  await page
    .getByLabel("設定の時点", { exact: true })
    .selectOption({ label: "古い時代" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

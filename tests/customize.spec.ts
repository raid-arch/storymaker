import { expect, test } from "./fixtures";
async function saved(page: import("@playwright/test").Page) {
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
}
test("personal appearance persists, rearranges dashboard, and resets without deleting data", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "カスタマイズ", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "あなたのアトリエを整える" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ラベンダー", exact: true }).click();
  await page.getByRole("button", { name: "大きめ", exact: true }).click();
  await page.getByRole("button", { name: "明朝", exact: true }).click();
  await page.getByRole("button", { name: "コンパクト", exact: true }).click();
  await page.getByRole("button", { name: "リスト", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "物語に残る問い", exact: true })
    .uncheck();
  await page
    .getByRole("button", { name: "最近綴った設定を上へ", exact: true })
    .click();
  await page
    .getByRole("button", { name: "最近綴った設定を上へ", exact: true })
    .click();
  await saved(page);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "lavender");
  await expect(page.locator("html")).toHaveAttribute("data-font", "serif");
  await expect(page.locator("html")).toHaveAttribute("data-density", "compact");
  await expect(page.locator("html")).toHaveAttribute("data-layout", "list");
  await expect(page.locator('[data-home-section="mysteries"]')).toBeHidden();
  await expect(page.locator('[data-home-section="recent"]')).toHaveCSS(
    "order",
    "0",
  );
  await expect(page.locator(".entry-card")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/storymaker-custom-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "カスタマイズ", exact: true }).click();
  await page
    .getByRole("button", { name: "表示設定を初期状態に戻す", exact: true })
    .click();
  await saved(page);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-accent", "sage");
  await expect(page.locator("html")).toHaveAttribute("data-layout", "cards");
  await expect(page.locator('[data-home-section="mysteries"]')).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "検証用の物語", exact: true }),
  ).toBeVisible();
});

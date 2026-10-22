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

test("design collection persists and allows independent finishing without changing stories", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "カスタマイズ", exact: true }).click();
  const gallery = page.getByRole("region", { name: "あなたのアトリエを整える" });
  await page.getByRole("button", { name: /海辺の製図室/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "teal");
  await expect(page.locator("html")).toHaveAttribute("data-background", "grid");
  await page.getByRole("button", { name: "やわらか", exact: true }).click();
  await saved(page);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-surface", "soft");
  await expect(page.locator("html")).toHaveAttribute("data-background", "grid");
  await expect(page.getByRole("heading", { name: "検証用の物語", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "カスタマイズ", exact: true }).click();
  for (const name of ["深緑の書斎", "星夜のアトリエ", "月影の図書館", "薔薇の手帖", "古書の頁", "海辺の製図室", "墨の作業室", "白紙のアトリエ"]) {
    const preset = gallery.getByRole("button", { name: new RegExp(name) });
    await preset.click();
    await expect(preset).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: `/tmp/storymaker-designs-${test.info().project.name}.png`, fullPage: true });
});

import { test, expect } from "./fixtures";
import { navStudio, saved } from "./studio-helpers";
test("glossary preserves definitions, readings, aliases and links across reload", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".project-hero")).toBeVisible();
  await navStudio(page, "用語辞典");
  await page.getByRole("button", { name: "用語を追加", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("用語の名前", { exact: true }).fill("独自の固有名詞");
  await dialog.getByLabel("用語の読み", { exact: true }).fill("こゆうめいし");
  await dialog
    .getByLabel("用語の定義", { exact: true })
    .fill("世界における定義と使い方。");
  await dialog.getByLabel("タグを追加", { exact: true }).fill("別の呼称");
  await dialog.getByLabel("タグを追加", { exact: true }).press("Enter");
  await dialog
    .getByRole("button", { name: "設定へのリンクを追加", exact: true })
    .click();
  await dialog
    .locator(".link-picker")
    .getByRole("button", { name: /人物A/ })
    .click();
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await saved(page);
  await page.reload();
  await expect(page.locator(".topbar")).toBeVisible();
  await navStudio(page, "用語辞典");
  await page.getByLabel("用語を検索", { exact: true }).fill("別の呼称");
  await expect(page.locator(".studio-record")).toContainText("独自の固有名詞");
  await page.getByRole("button", { name: "詳細・編集", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByLabel("用語の定義", { exact: true }),
  ).toHaveValue("世界における定義と使い方。");
  await expect(page.getByRole("dialog").locator(".studio-chips")).toContainText(
    "人物A",
  );
});
test("image reference boards retain images and source notes locally", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".project-hero")).toBeVisible();
  await navStudio(page, "画像資料");
  await page
    .getByRole("button", { name: "画像資料を追加", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("画像資料の名前", { exact: true }).fill("建築の参考");
  await dialog
    .locator('input[type="file"]')
    .setInputFiles("public/icon-192.png");
  await expect(dialog.locator(".image-input img")).toBeVisible();
  await dialog
    .getByLabel("出典・参照URL", { exact: true })
    .fill("資料集 12ページ");
  await dialog
    .getByLabel("資料のメモ", { exact: true })
    .fill("柱と窓の形を参考にする。");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await saved(page);
  await page.reload();
  await expect(page.locator(".topbar")).toBeVisible();
  await navStudio(page, "画像資料");
  await expect(page.locator(".studio-image-open img")).toBeVisible();
  await page.getByRole("button", { name: "詳細・編集", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("資料のメモ", { exact: true })).toHaveValue(
    "柱と窓の形を参考にする。",
  );
  await expect(dialog.locator(".studio-reference-full")).toBeVisible();
  await dialog
    .getByLabel("出典・参照URL", { exact: true })
    .fill("javascript:alert(1)");
  await expect(dialog.getByRole("link")).toHaveCount(0);
});
test("plot scenes can be reordered and moved, and removing a column preserves scenes", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".project-hero")).toBeVisible();
  await navStudio(page, "プロットボード");
  for (const name of ["第一章", "第二章"]) {
    await page
      .getByRole("button", { name: "章・列を追加", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("章・列の名前", { exact: true }).fill(name);
    await dialog.getByRole("button", { name: "保存", exact: true }).click();
  }
  for (const name of ["場面A", "場面B"]) {
    await page
      .getByRole("button", { name: "シーンを追加", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("シーン名", { exact: true }).fill(name);
    await dialog
      .getByLabel("シーンの章・列", { exact: true })
      .selectOption({ label: "第一章" });
    await dialog
      .getByLabel("シーンの概要", { exact: true })
      .fill(`${name}の概要`);
    await dialog.getByRole("button", { name: "保存", exact: true }).click();
  }
  await page.getByRole("button", { name: "場面Bを上へ", exact: true }).click();
  await expect(page.locator(".plot-scene-heading strong")).toHaveText([
    "場面B",
    "場面A",
  ]);
  await page
    .getByLabel("場面Bの移動先", { exact: true })
    .selectOption({ label: "第二章" });
  await page
    .getByRole("button", { name: "第二章の列を編集", exact: true })
    .click();
  await page.getByRole("button", { name: "章・列を削除", exact: true }).click();
  await page
    .getByRole("dialog")
    .last()
    .getByRole("button", { name: "実行する", exact: true })
    .click();
  await expect(page.locator(".plot-scene")).toHaveCount(2);
  await saved(page);
  await page.reload();
  await expect(page.locator(".topbar")).toBeVisible();
  await navStudio(page, "プロットボード");
  await expect(page.locator(".plot-column").first()).toContainText("場面B");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

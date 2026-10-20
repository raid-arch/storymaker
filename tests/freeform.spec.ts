import { test, expect } from "./fixtures";
async function nav(page: import("@playwright/test").Page, name: string) {
  if (await page.getByRole("button", { name: "メニューを開く" }).isVisible())
    await page.getByRole("button", { name: "メニューを開く" }).click();
  await page
    .locator(".main-nav")
    .getByRole("button", { name, exact: false })
    .click();
}
async function saved(page: import("@playwright/test").Page) {
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
}

test("characters accept free-written states and lineage, preserve them, and reuse optional suggestions", async ({
  page,
}) => {
  await page.goto("./");
  await nav(page, "キャラクター");
  await page.locator(".entry-card").filter({ hasText: "人物A" }).click();
  await page.getByLabel("生存状況", { exact: true }).fill("魂だけ残存");
  await page.getByLabel("系統", { exact: true }).fill("古い傍系");
  await page.getByLabel("設定の状態", { exact: true }).fill("作者だけの設定");
  await saved(page);
  await page.reload();
  await nav(page, "キャラクター");
  await page.getByLabel("設定の状態で絞り込み").selectOption("作者だけの設定");
  await expect(page.locator(".entry-card")).toHaveCount(1);
  await page.locator(".entry-card").click();
  await expect(page.getByLabel("生存状況", { exact: true })).toHaveValue(
    "魂だけ残存",
  );
  await expect(page.getByLabel("系統", { exact: true })).toHaveValue(
    "古い傍系",
  );
  await nav(page, "キャラクター");
  await page.locator(".entry-card").filter({ hasText: "人物B" }).click();
  await page
    .getByRole("button", { name: "生存状況の候補を見る", exact: true })
    .click();
  await page
    .getByRole("group", { name: "生存状況の候補", exact: true })
    .getByRole("button", { name: "魂だけ残存", exact: true })
    .click();
  await expect(page.getByLabel("生存状況", { exact: true })).toHaveValue(
    "魂だけ残存",
  );
  await nav(page, "家系図・人物相関図");
  await page.getByRole("button", { name: "古い傍系", exact: true }).click();
  await expect(page.locator(".graph-person")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("categories, project types, clue progress, and relationships accept new names", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "プロジェクトを編集", exact: true })
    .click();
  await page.getByLabel("種類", { exact: true }).fill("設定資料集");
  await page.getByLabel("設定の状態", { exact: true }).fill("構想の断片");
  await page.getByRole("button", { name: "完了", exact: true }).click();
  await saved(page);
  await nav(page, "世界観データベース");
  await page.locator(".entry-card").filter({ hasText: "検証用の建物" }).click();
  await page.getByLabel("カテゴリ", { exact: true }).fill("空間・異界");
  await page.getByRole("button", { name: "一覧へ戻る" }).click();
  await page.getByRole("button", { name: "空間・異界", exact: true }).click();
  await expect(page.locator(".entry-card")).toHaveCount(1);
  await nav(page, "伏線・謎");
  await page.locator(".entry-card").click();
  await page.getByLabel("回収状況", { exact: true }).fill("一部だけ回収");
  await page.getByRole("button", { name: "一覧へ戻る" }).click();
  await page.getByLabel("回収状況で絞り込み").selectOption("一部だけ回収");
  await expect(page.locator(".entry-card")).toHaveCount(1);
  await nav(page, "家系図・人物相関図");
  await page.getByRole("button", { name: "関係をつなぐ", exact: true }).click();
  await page.getByLabel("関係", { exact: true }).fill("師弟の契約");
  await page
    .getByLabel("人物 B（親子・養子の場合は子）")
    .selectOption({ label: "人物E" });
  await page.getByRole("button", { name: "関係を追加", exact: true }).click();
  await expect(
    page.locator(".relation-item").filter({ hasText: "師弟の契約" }),
  ).toHaveCount(1);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "閉じる", exact: true })
    .click();
  await saved(page);
  await page.reload();
  await page
    .getByRole("button", { name: "プロジェクトを編集", exact: true })
    .click();
  await expect(page.getByLabel("種類", { exact: true })).toHaveValue(
    "設定資料集",
  );
  await expect(page.getByLabel("設定の状態", { exact: true })).toHaveValue(
    "構想の断片",
  );
  await page.getByRole("button", { name: "完了", exact: true }).click();
  await nav(page, "家系図・人物相関図");
  await expect(
    page.locator(".graph-lines text").filter({ hasText: "師弟の契約" }),
  ).toHaveCount(1);
});

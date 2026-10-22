import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";

async function navigate(page: Page, name: string) {
  const menu = page.getByRole("button", { name: "メニューを開く" });
  if (await menu.isVisible()) await menu.click();
  await page
    .locator(".main-nav")
    .getByRole("button", { name: new RegExp(name) })
    .click();
}
async function person(page: Page, name: string) {
  await navigate(page, "キャラクター");
  await page
    .locator(".entry-card")
    .filter({ has: page.getByRole("heading", { name, exact: true }) })
    .click();
}
async function saved(page: Page) {
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
}
async function create(page: Page, fromPerson = true) {
  await page
    .getByRole("button", {
      name: fromPerson ? "症候群を作る" : "症候群を追加",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "症候群を作る",
    exact: true,
  });
  await dialog
    .getByRole("textbox", { name: "症候群の名前", exact: true })
    .fill("検証用症候群");
  await dialog.getByLabel("構成する病気1", { exact: true }).fill("病気甲");
  await dialog.getByRole("button", { name: "病気を追加", exact: true }).click();
  await dialog.getByLabel("構成する病気2", { exact: true }).fill("病気乙");
  await dialog
    .getByRole("textbox", { name: "説明・症状", exact: true })
    .fill("共通する症状のメモ");
  await dialog
    .getByRole("button", {
      name: fromPerson ? "作成して人物に紐づける" : "症候群を作成",
      exact: true,
    })
    .click();
}

test("shared syndromes group illnesses and update all linked people without replacing personal illness notes", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".project-hero")).toBeVisible();
  await person(page, "人物A");
  await page.getByLabel("病気", { exact: true }).fill("この人物だけの病気メモ");
  await create(page);
  await expect(
    page.locator(".character-syndromes .syndrome-card li"),
  ).toHaveText(["病気甲", "病気乙"]);
  await expect(page.getByLabel("病気", { exact: true })).toHaveValue(
    "この人物だけの病気メモ",
  );
  await person(page, "人物B");
  await page
    .getByRole("button", { name: "登録済みの症候群を紐づける", exact: true })
    .click();
  await page.getByRole("textbox", { name: "症候群を検索" }).fill("病気甲");
  await page
    .locator(".character-syndromes .link-picker")
    .getByRole("button", { name: /検証用症候群/ })
    .click();
  await page.locator(".syndrome-card-heading .text-button").click();
  await expect(page.locator(".backlink")).toHaveCount(2);
  await page.getByLabel("構成する病気1", { exact: true }).fill("病気甲・改訂");
  await page.getByLabel("構成する病気2", { exact: true }).fill("病気丙");
  await page
    .getByRole("textbox", { name: "名前", exact: true })
    .fill("改訂した症候群");
  await saved(page);
  await page.reload();
  await expect(page.locator(".project-hero")).toBeVisible();
  for (const name of ["人物A", "人物B"]) {
    await person(page, name);
    await expect(page.locator(".syndrome-card li")).toHaveText([
      "病気甲・改訂",
      "病気丙",
    ]);
    await expect(page.locator(".syndrome-card")).toContainText(
      "改訂した症候群",
    );
  }
  await person(page, "人物A");
  await expect(page.getByLabel("病気", { exact: true })).toHaveValue(
    "この人物だけの病気メモ",
  );
  await page
    .getByRole("button", { name: "改訂した症候群を人物から外す", exact: true })
    .click();
  await expect(page.locator(".syndrome-card")).toHaveCount(0);
  await person(page, "人物B");
  await expect(page.locator(".syndrome-card li")).toHaveCount(2);
  await saved(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("cancel and undo are safe; deleting a syndrome clears assignments and undo restores its illnesses and links", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".project-hero")).toBeVisible();
  await person(page, "人物A");
  await page.getByRole("button", { name: "症候群を作る", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "症候群の名前", exact: true })
    .fill("保存しない症候群");
  await page.getByRole("button", { name: "キャンセル", exact: true }).click();
  await expect(page.locator(".syndrome-card")).toHaveCount(0);
  await create(page);
  await page
    .getByRole("button", { name: "直前の操作を取り消す", exact: true })
    .click();
  await expect(page.locator(".syndrome-card")).toHaveCount(0);
  await navigate(page, "世界観データベース");
  await expect(page.locator(".entry-card")).toHaveCount(3);
  await person(page, "人物A");
  await create(page);
  await page.locator(".syndrome-card-heading .text-button").click();
  await page.getByRole("button", { name: "削除", exact: true }).click();
  await page.getByRole("button", { name: "キャンセル", exact: true }).click();
  await expect(page.getByLabel("構成する病気1", { exact: true })).toHaveValue(
    "病気甲",
  );
  await page.getByRole("button", { name: "削除", exact: true }).click();
  await page.getByRole("button", { name: "実行する", exact: true }).click();
  await person(page, "人物A");
  await expect(page.locator(".syndrome-card")).toHaveCount(0);
  await page.getByRole("button", { name: "元に戻す", exact: true }).click();
  await expect(page.locator(".syndrome-card li")).toHaveText([
    "病気甲",
    "病気乙",
  ]);
  await saved(page);
});

test("world archive can create syndromes, remove illnesses, search them, and export their grouping and assignments", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".project-hero")).toBeVisible();
  await navigate(page, "世界観データベース");
  await create(page, false);
  await page
    .getByRole("button", { name: "構成する病気1を外す", exact: true })
    .click();
  await expect(page.getByLabel("構成する病気1", { exact: true })).toHaveValue(
    "病気乙",
  );
  await page.getByRole("button", { name: "病気を追加", exact: true }).click();
  await page.getByLabel("構成する病気2", { exact: true }).fill("病気丁");
  await saved(page);
  await page.getByRole("button", { name: "一覧へ戻る" }).click();
  await page.getByLabel("設定のジャンル", { exact: true }).selectOption("world:症候群");
  await expect(page.locator(".entry-card")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "すべての設定を検索" })
    .fill("病気丁");
  await expect(page.locator(".entry-card")).toHaveCount(1);
  await page.getByRole("button", { name: "検索をクリア", exact: true }).click();
  await person(page, "人物A");
  await page
    .getByRole("button", { name: "登録済みの症候群を紐づける", exact: true })
    .click();
  await page
    .locator(".character-syndromes .link-picker")
    .getByRole("button", { name: /検証用症候群/ })
    .click();
  await saved(page);
  const menu = page.getByRole("button", { name: "メニューを開く" });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("button", { name: "設定・バックアップ", exact: true })
    .click();
  const jsonDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "全データをJSONでバックアップ", exact: true })
    .click();
  const jsonPath = await (await jsonDownload).path();
  const fs = await import("node:fs/promises");
  const backup = JSON.parse(await fs.readFile(jsonPath!, "utf8"));
  const syndrome = backup.entries.find(
    (entry: { name: string }) => entry.name === "検証用症候群",
  );
  expect(syndrome.fields.構成する病気).toBe("病気乙\n病気丁");
  expect(
    backup.entries.find((entry: { id: string }) => entry.id === "morgan").links,
  ).toContain(syndrome.id);
  const mdDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: /「検証用の物語」を書き出す/ })
    .click();
  const markdown = await fs.readFile(
    (await (await mdDownload).path())!,
    "utf8",
  );
  expect(markdown).toContain("構成する病気: 病気乙\n病気丁");
  expect(markdown).toContain(`[検証用症候群](#${syndrome.id})`);
});

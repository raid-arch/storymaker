import { test, expect } from "./fixtures";
async function nav(page: import("@playwright/test").Page, name: string) {
  await page.locator(".main-nav").waitFor({ state: "attached" });
  if (await page.getByRole("button", { name: "メニューを開く" }).isVisible())
    await page.getByRole("button", { name: "メニューを開く" }).click();
  await page
    .locator(".main-nav")
    .getByRole("button", { name, exact: false })
    .click();
}
async function switcher(page: import("@playwright/test").Page) {
  await page.locator(".project-switch").waitFor({ state: "attached" });
  if (await page.getByRole("button", { name: "メニューを開く" }).isVisible())
    await page.getByRole("button", { name: "メニューを開く" }).click();
  await page.locator(".project-switch").click();
}
async function add(page: import("@playwright/test").Page, name: string) {
  await page.getByRole("button", { name: "人物を追加", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "名前", exact: true })
    .fill(name);
  await page.getByRole("button", { name: "作成して編集" }).click();
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
}
async function saved(page: import("@playwright/test").Page) {
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
}
test("sample dashboard, character edits, backlinks, reload, delete and undo", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "検証用の物語", exact: true }),
  ).toBeVisible();
  await nav(page, "キャラクター");
  await expect(page.locator(".entry-card")).toHaveCount(5);
  await add(page, "試験の人物");
  await page.getByLabel("年齢", { exact: true }).fill("21");
  await page
    .getByLabel("設定・メモ", { exact: true })
    .fill("星の庭の秘密を知っている。");
  await page.getByRole("button", { name: "項目を追加", exact: true }).click();
  await page.getByLabel("自由項目1の名前").fill("好きな花");
  await page.getByLabel("自由項目1の内容").fill("月下香");
  await page.getByRole("button", { name: "関連リンクを追加" }).click();
  await page.getByRole("button", { name: /テスト家.*検証用の物語/ }).click();
  await saved(page);
  await page.reload();
  await nav(page, "キャラクター");
  await page.getByRole("button", { name: /試験の人物/ }).click();
  await expect(page.getByLabel("年齢", { exact: true })).toHaveValue("21");
  await expect(page.getByLabel("自由項目1の内容")).toHaveValue("月下香");
  await page
    .locator(".link-row")
    .getByRole("button", { name: /テスト家/ })
    .first()
    .click();
  await expect(
    page.locator(".backlink").filter({ hasText: "試験の人物" }),
  ).toBeVisible();
  await page.locator(".backlink").filter({ hasText: "試験の人物" }).click();
  await page.getByRole("button", { name: "削除", exact: true }).click();
  await page.getByRole("button", { name: "キャンセル", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "試験の人物", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "削除", exact: true }).click();
  await page.getByRole("button", { name: "実行する", exact: true }).click();
  await expect(
    page.locator(".entry-card").filter({ hasText: "試験の人物" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "直前の操作を取り消す" }).click();
  await expect(
    page.locator(".entry-card").filter({ hasText: "試験の人物" }),
  ).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("project creation, hierarchy, edit, persist, and safe sample addition", async ({
  page,
}) => {
  await page.goto("./");
  await switcher(page);
  await page
    .getByRole("button", { name: "新規プロジェクト", exact: true })
    .click();
  await page.getByRole("textbox", { name: /作品名/ }).fill("月の図書館");
  await page.getByLabel("種類", { exact: true }).selectOption("シリーズ");
  await page.getByLabel("説明", { exact: true }).fill("新しい物語の記録");
  await page
    .getByRole("button", { name: "プロジェクトを作成", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "月の図書館", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "プロジェクトを編集", exact: true })
    .click();
  await page.getByLabel("説明", { exact: true }).fill("変更を保存しました");
  await page.getByRole("button", { name: "完了", exact: true }).click();
  await saved(page);
  await page.reload();
  await switcher(page);
  await page.getByRole("button", { name: "月の図書館", exact: true }).click();
  await expect(page.locator(".hero-content")).toContainText(
    "変更を保存しました",
  );
  await switcher(page);
  await page
    .getByRole("button", { name: "新規プロジェクト", exact: true })
    .click();
  await page.getByRole("textbox", { name: /作品名/ }).fill("第一章");
  await page.getByLabel("種類", { exact: true }).selectOption("章");
  await page
    .getByLabel("上位プロジェクト")
    .selectOption({ label: "月の図書館" });
  await page
    .getByRole("button", { name: "プロジェクトを作成", exact: true })
    .click();
  await saved(page);
  await expect(
    page.getByRole("heading", { name: "第一章", exact: true }),
  ).toBeVisible();
});
test("world categories, tags and full-text truth search", async ({ page }) => {
  await page.goto("./");
  await nav(page, "世界観データベース");
  await page.getByRole("button", { name: "カテゴリ", exact: true }).click();
  await page.getByLabel("カテゴリ名").fill("言語・文字");
  await page.getByRole("button", { name: "追加", exact: true }).click();
  await page.getByRole("button", { name: "設定を追加", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "名前", exact: true })
    .fill("古い言葉");
  await page.getByRole("button", { name: "作成して編集" }).click();
  await expect(page.getByLabel("カテゴリ", { exact: true })).toHaveValue(
    "言語・文字",
  );
  await page.getByLabel("実際の真相", { exact: true }).fill("忘却の文字は青い");
  await page.getByLabel("タグを追加").fill("言語");
  await page.getByLabel("タグを追加").press("Enter");
  await saved(page);
  await page.getByLabel("すべての設定を検索").fill("忘却の文字");
  await expect(page.locator(".entry-card")).toHaveCount(1);
  await expect(page.locator(".entry-card")).toContainText("古い言葉");
  await page.getByLabel("すべての設定を検索").fill("#言語");
  await expect(page.locator(".entry-card")).toHaveCount(1);
});
test("family relationships, cycle rejection, dragging and navigation", async ({
  page,
}) => {
  await page.goto("./");
  await nav(page, "キャラクター");
  await add(page, "親");
  await page.getByRole("button", { name: "一覧へ戻る" }).click();
  await add(page, "子");
  await nav(page, "家系図・人物相関図");
  await page.getByRole("button", { name: "関係をつなぐ", exact: true }).click();
  await page
    .getByLabel("人物 A（親子・養子の場合は親）")
    .selectOption({ label: "親" });
  await page
    .getByLabel("人物 B（親子・養子の場合は子）")
    .selectOption({ label: "子" });
  await page.getByRole("button", { name: "関係を追加", exact: true }).click();
  await expect(
    page.locator(".relation-item").filter({ hasText: "親子 → 子" }),
  ).toBeVisible();
  await page
    .getByLabel("人物 A（親子・養子の場合は親）")
    .selectOption({ label: "子" });
  await page
    .getByLabel("人物 B（親子・養子の場合は子）")
    .selectOption({ label: "親" });
  await page.getByRole("button", { name: "関係を追加", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("循環");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "閉じる", exact: true })
    .click();
  await expect(page.locator(".graph-person")).toHaveCount(7);
  await page.getByRole("button", { name: "配置を編集", exact: true }).click();
  const person = page.locator(".graph-person").filter({ hasText: "人物A" });
  const before = await person.getAttribute("style");
  await person.scrollIntoViewIfNeeded();
  const box = (await person.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 60, { steps: 8 });
  await page.mouse.up();
  await expect(person).not.toHaveAttribute("style", before!);
  await saved(page);
  await page.reload();
  await nav(page, "家系図・人物相関図");
  await expect(
    page.locator(".graph-person").filter({ hasText: "人物A" }),
  ).not.toHaveAttribute("style", before!);
  await page.locator(".graph-person").filter({ hasText: "人物A" }).click();
  await expect(
    page.getByRole("heading", { name: "人物A", exact: true }),
  ).toBeVisible();
});
test("timeline ordering, scoped events, clue status", async ({ page }) => {
  await page.goto("./");
  await nav(page, "年表");
  await page.getByRole("button", { name: "出来事を追加" }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "名前", exact: true })
    .fill("庭の誕生");
  await page.getByRole("button", { name: "作成して編集" }).click();
  await page.getByLabel("年代（共通暦・数字）").fill("-100");
  await page.getByRole("button", { name: "関連リンクを追加" }).click();
  await page.getByRole("button", { name: /テスト家.*検証用の物語/ }).click();
  await page.getByRole("button", { name: "一覧へ戻る" }).click();
  await expect(page.locator(".timeline-card").first()).toContainText(
    "庭の誕生",
  );
  await page.getByLabel("年表の対象").selectOption({ label: "テスト家の年表" });
  await expect(page.locator(".timeline-card")).toHaveCount(2);
  await nav(page, "伏線・謎");
  await page.locator(".entry-card").first().click();
  await page.getByLabel("回収状況", { exact: true }).selectOption("回収済み");
  await page.getByLabel("真相", { exact: true }).fill("別の系統から継承した");
  await page.getByRole("button", { name: "一覧へ戻る" }).click();
  await page.getByLabel("回収状況で絞り込み").selectOption("回収済み");
  await expect(page.locator(".entry-card")).toHaveCount(1);
  await saved(page);
});
test("backup download, invalid backup protection, restore and Markdown export", async ({
  page,
}) => {
  await page.goto("./");
  if (test.info().project.name === "android")
    await page.getByRole("button", { name: "メニューを開く" }).click();
  await page
    .getByRole("button", { name: "設定・バックアップ", exact: true })
    .click();
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "全データをJSONでバックアップ" })
    .click();
  const download = await dl;
  const path = await download.path();
  expect(path).toBeTruthy();
  await page
    .locator('input[type=file][accept=".json,application/json"]')
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":2}'),
    });
  await expect(
    page.getByRole("status").filter({ hasText: "対応する綴庭" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .locator('input[type=file][accept=".json,application/json"]')
    .setInputFiles(path!);
  await expect(page.getByRole("dialog")).toContainText("1 プロジェクト・10 件");
  await page.getByRole("button", { name: "全データを置き換えて復元" }).click();
  await expect(
    page.getByRole("heading", { name: "検証用の物語", exact: true }),
  ).toBeVisible();
  await saved(page);
  if (test.info().project.name === "android")
    await page.getByRole("button", { name: "メニューを開く" }).click();
  await page
    .getByRole("button", { name: "設定・バックアップ", exact: true })
    .click();
  const md = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "「検証用の物語」を書き出す" })
    .click();
  expect((await md).suggestedFilename()).toContain(".md");
});
test("responsive layout and PWA offline cold reload", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "検証用の物語", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `/tmp/storymaker-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null,
  );
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "検証用の物語", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".offline-banner")).toContainText(
    "オフラインで編集中",
  );
  await nav(page, "キャラクター");
  await add(page, "オフラインの人物");
  await saved(page);
  await page.reload();
  await nav(page, "キャラクター");
  await expect(
    page.locator(".entry-card").filter({ hasText: "オフラインの人物" }),
  ).toBeVisible();
  await context.setOffline(false);
});

test("image persistence, light mode and project deletion undo", async ({
  page,
}) => {
  await page.goto("./");
  await page
    .getByRole("button", { name: "プロジェクトを編集", exact: true })
    .click();
  await page
    .locator(".image-input input[type=file]")
    .setInputFiles("public/icon-192.png");
  await page.getByRole("button", { name: "完了", exact: true }).click();
  await expect(page.locator(".hero-image")).toBeVisible();
  await saved(page);
  await page.reload();
  await expect(page.locator(".hero-image")).toBeVisible();
  if (test.info().project.name === "android")
    await page.getByRole("button", { name: "メニューを開く" }).click();
  await page
    .getByRole("button", { name: "設定・バックアップ", exact: true })
    .click();
  await page.getByRole("button", { name: "ダークモード", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await switcher(page);
  await page
    .getByRole("button", { name: "新規プロジェクト", exact: true })
    .click();
  await page.getByRole("textbox", { name: /作品名/ }).fill("削除確認用の作品");
  await page
    .getByRole("button", { name: "プロジェクトを作成", exact: true })
    .click();
  await saved(page);
  await switcher(page);
  await page
    .getByRole("button", { name: "プロジェクトを管理", exact: true })
    .click();
  await expect(page.locator(".project-card")).toHaveCount(2);
  await expect(
    page.locator(".project-card").filter({ hasText: "削除確認用の作品" }),
  ).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "削除確認用の作品を削除",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "実行する", exact: true }).click();
  await expect(page.locator(".project-card")).toHaveCount(1);
  await page.getByRole("button", { name: "直前の操作を取り消す" }).click();
  await expect(page.locator(".project-card")).toHaveCount(2);
});

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { emptyData, newEntry, newProject } from "../src/model";
async function menu(page: Page) {
  await page.locator(".main-nav").waitFor({ state: "attached" });
  if (await page.getByRole("button", { name: "メニューを開く" }).isVisible())
    await page.getByRole("button", { name: "メニューを開く" }).click();
}
async function save(page: Page) {
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
}
async function workspace(page: Page) {
  await page.locator(".main-nav").waitFor({ state: "attached" });
  if (await page.locator(".bottom-nav").isVisible()) {
    await expect(
      page
        .locator(".bottom-nav")
        .getByRole("button", { name: "人物", exact: true }),
    ).toHaveCount(1);
    await page
      .locator(".bottom-nav")
      .getByRole("button", { name: "制作", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "ストーリー制作画面" }),
    ).toBeVisible();
    return;
  }
  await menu(page);
  await page
    .locator(".main-nav")
    .getByRole("button", { name: "制作画面", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "ストーリー制作画面" }),
  ).toBeVisible();
}
test.beforeEach(async ({ page }) => {
  const data = emptyData();
  data.projects = [
    { ...newProject(), id: "a", name: "第一の物語", worldIds: ["w"] },
    { ...newProject("world"), id: "w", name: "共通世界資料" },
    { ...newProject(), id: "b", name: "第二の物語", worldIds: ["w"] },
  ];
  data.entries = [
    {
      ...newEntry("w", "character"),
      id: "hero",
      name: "共有人物",
      body: "世界観の基本プロフィール",
    },
    { ...newEntry("w", "character"), id: "friend", name: "共有の友人" },
    {
      ...newEntry("w", "world"),
      id: "town",
      name: "共有の街",
      category: "都市・建築物",
      body: "世界観では平穏な街",
    },
    {
      ...newEntry("w", "event"),
      id: "war",
      name: "世界全体の大戦争",
      fields: { 年代: "103" },
      body: "103年から続く大きな戦争",
    },
  ];
  await page.addInitScript((value) => {
    const r = indexedDB.open("tsuzuriniwa", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("state").put(value, "main");
    r.onsuccess = () => r.result.close();
  }, data);
});
test("write a chapter and scene, connect world context, and retain scene-specific states across reload", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await workspace(page);
  const outline = page.getByRole("complementary", {
    name: "章とシーン",
    exact: true,
  });
  await page.getByLabel("追加する章の名前").fill("第一章");
  await page.getByRole("button", { name: "章を追加", exact: true }).click();
  await outline
    .getByRole("button", { name: "シーンを作成", exact: true })
    .click();
  await page.getByLabel("シーン名", { exact: true }).fill("開戦の朝");
  await page
    .getByLabel("シーンの本文", { exact: true })
    .fill("夜明けの鐘が鳴った。本文だけの言葉。");
  await page.getByLabel("シーンが参照する事件").selectOption("war");
  await expect(page.getByLabel("制作シーンの共通年")).toHaveValue("103");
  await page
    .getByLabel("細かな時点・前後関係")
    .fill("4月2日 午前5時／戦闘の翌朝");
  await page.getByLabel("シーンの舞台", { exact: true }).selectOption("town");
  await page
    .getByLabel("このシーンでの場所の状態", { exact: true })
    .fill("この朝に城門が壊れる");
  await page.getByRole("checkbox", { name: "共有人物", exact: true }).check();
  await page
    .getByLabel("共有人物の場面での状態")
    .fill("まだ無傷で、戦争を知らない");
  await page
    .getByLabel("このシーンでの人物関係の変化", { exact: true })
    .fill("この時点では友人");
  await page
    .getByRole("button", { name: "＋ 人物をその場で作る", exact: true })
    .click();
  const quick = page.getByRole("dialog", { name: "シーン内で設定を作成" });
  await quick.getByLabel("名前", { exact: true }).fill("この作品だけの人物");
  await quick.getByRole("button", { name: "作成してシーンに使う" }).click();
  await expect(
    page.getByRole("checkbox", { name: "この作品だけの人物", exact: true }),
  ).toBeChecked();
  await save(page);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "本文を書き出す", exact: true })
    .click();
  const stream = await (await pending).createReadStream();
  let exported = "";
  for await (const chunk of stream!) exported += chunk.toString();
  expect(exported).toContain("## 第一章");
  expect(exported).toContain("本文だけの言葉");
  expect(exported).not.toContain("世界観の基本プロフィール");
  await page.reload();
  await expect(
    page.getByRole("region", { name: "ストーリー制作画面" }),
  ).toBeVisible();
  await expect(page.getByLabel("シーンの本文", { exact: true })).toHaveValue(
    "夜明けの鐘が鳴った。本文だけの言葉。",
  );
  await expect(page.getByLabel("共有人物の場面での状態")).toHaveValue(
    "まだ無傷で、戦争を知らない",
  );
  await outline
    .getByRole("button", { name: "シーンを作成", exact: true })
    .click();
  await page.getByLabel("シーン名", { exact: true }).fill("戦闘の後");
  await page.getByRole("checkbox", { name: "共有人物", exact: true }).check();
  await page.getByLabel("共有人物の場面での状態").fill("負傷している");
  await outline.getByRole("button", { name: /開戦の朝/ }).click();
  await expect(page.getByLabel("共有人物の場面での状態")).toHaveValue(
    "まだ無傷で、戦争を知らない",
  );
  await save(page);
  await page
    .getByRole("button", { name: "シーンの時間軸", exact: true })
    .click();
  await expect(page.locator(".creation-timeline-scene")).toHaveCount(2);
  await expect(page.locator(".creation-timeline-scene").first()).toContainText(
    "世界全体の大戦争",
  );
  await page.locator(".creation-timeline-scene").first().click();
  await expect(page.getByLabel("シーンの本文", { exact: true })).toHaveValue(
    "夜明けの鐘が鳴った。本文だけの言葉。",
  );
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "ストーリー制作画面" }),
  ).toBeVisible();
  await expect(page.getByLabel("シーンの本文", { exact: true })).toHaveValue(
    "夜明けの鐘が鳴った。本文だけの言葉。",
  );
  await context.setOffline(false);

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("story character roles stay separate from the base and world builder supports villages and illnesses", async ({
  page,
}) => {
  await page.goto("./");
  await workspace(page);
  await page
    .getByRole("button", { name: "登場人物・関係", exact: true })
    .click();
  await page
    .getByRole("button", { name: "登場人物に追加", exact: true })
    .click();
  await page
    .getByLabel("このストーリーでの役割", { exact: true })
    .fill("主人公");
  await page.getByLabel("目的・動機", { exact: true }).fill("故郷を守る");
  await page
    .getByLabel("このストーリーでの状態", { exact: true })
    .fill("物語では負傷している");
  await page
    .getByRole("button", { name: "＋ 作品固有の項目を追加", exact: true })
    .click();
  await page.getByLabel("作品固有の項目1の名前").fill("この作品での年齢");
  await page.getByLabel("作品固有の項目1の内容").fill("17歳");
  await page
    .getByRole("button", { name: "関係を追加・整理", exact: true })
    .click();
  const relation = page.getByRole("dialog");
  await relation
    .getByLabel("人物 B（親子・養子の場合は子）")
    .selectOption("friend");
  await relation.getByLabel("関係", { exact: true }).fill("師弟");
  await relation
    .getByRole("button", { name: "関係を追加", exact: true })
    .click();
  await relation.getByRole("button", { name: "閉じる", exact: true }).click();
  await expect(page.locator(".creation-relation")).toContainText("師弟");

  await save(page);
  await menu(page);
  await page.locator(".project-switch").click();
  await page
    .locator(".project-menu")
    .getByRole("button", { name: "第二の物語", exact: true })
    .click();
  await page
    .getByRole("button", { name: "登場人物・関係", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "登場人物に追加", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("世界観の基本プロフィール", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".creation-relation")).toHaveCount(0);
  await menu(page);
  await page.locator(".project-switch").click();
  await page
    .locator(".project-menu")
    .getByRole("button", { name: "共通世界資料", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "世界観の制作画面" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "村", exact: true }).click();
  await page.getByLabel("世界観で作成する設定の名前").fill("山あいの村");
  await page.getByRole("button", { name: "設定を作成", exact: true }).click();
  await page
    .getByLabel("世界観の設定本文", { exact: true })
    .fill("街道から離れた村。世界共通の事前情報。");
  await page
    .getByRole("button", { name: "＋ 自由な項目を追加", exact: true })
    .click();
  await page.getByLabel("資料の自由項目1の名前").fill("人口");
  await page.getByLabel("資料の自由項目1の内容").fill("およそ300人");
  await page.getByRole("button", { name: "病気", exact: true }).click();
  await page.getByLabel("世界観で作成する設定の名前").fill("架空の病気");
  await page.getByRole("button", { name: "設定を作成", exact: true }).click();
  await page
    .getByLabel("世界観の設定本文", { exact: true })
    .fill("原因や症状を自由に設定する。");
  await save(page);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "世界観の制作画面" }),
  ).toBeVisible();
  await page
    .locator(".creation-index")
    .getByRole("button", { name: /山あいの村/ })
    .click();
  await expect(page.getByLabel("資料の自由項目1の内容")).toHaveValue(
    "およそ300人",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("settings can be browsed by genre, custom genres are reusable, and story references use the same classification", async ({ page }) => {
  await page.goto("./");
  await workspace(page);
  await page.getByRole("button", { name: "舞台・設定資料", exact: true }).click();
  await page.getByLabel("参照資料のジャンル", { exact: true }).selectOption("world:都市・建築物");
  await expect(page.locator(".creation-index .creation-scene-link")).toHaveCount(1);
  await expect(page.locator(".creation-index .creation-scene-link")).toContainText("共有の街");
  await page.getByLabel("参照資料のジャンル", { exact: true }).selectOption("kind:event");
  await expect(page.locator(".creation-index .creation-scene-link")).toContainText("世界全体の大戦争");
  await menu(page); await page.locator(".project-switch").click();
  await page.locator(".project-menu").getByRole("button", { name: "共通世界資料", exact: true }).click();
  const genre = page.getByLabel("世界観の設定ジャンル", { exact: true });
  await genre.selectOption("kind:character");
  await expect(page.locator(".creation-index .creation-scene-link")).toHaveCount(2);
  await expect(page.getByLabel("世界観で作成する設定の種類")).toHaveValue("character");
  await page.getByRole("button", { name: "ジャンルを追加", exact: true }).click();
  await page.getByLabel("ジャンル名", { exact: true }).fill("生物・生態系");
  await page.getByRole("button", { name: "追加して選ぶ", exact: true }).click();
  await expect(genre).toHaveValue("world:生物・生態系");
  await expect(page.getByLabel("世界観制作のカテゴリ", { exact: true })).toHaveValue("生物・生態系");
  await page.getByLabel("世界観で作成する設定の名前").fill("架空の渡り鳥");
  await page.getByRole("button", { name: "設定を作成", exact: true }).click();
  await page.getByLabel("世界観の設定本文", { exact: true }).fill("季節に合わせて渡る。");
  await expect(page.locator(".creation-index .creation-scene-link")).toHaveCount(1);
  await page.getByLabel("制作画面で資料を探す").fill("存在しない検索");
  await expect(page.locator(".creation-index .creation-scene-link")).toHaveCount(0);
  await expect(page.getByText(/このジャンル・検索条件の設定はまだありません/)).toBeVisible();
  await page.getByLabel("制作画面で資料を探す").fill("");
  await save(page); await page.reload();
  await genre.selectOption("world:生物・生態系");
  await expect(page.locator(".creation-index .creation-scene-link")).toContainText("架空の渡り鳥");
  await expect(genre.locator('option[value="world:生物・生態系"]')).toContainText("1件");
  await page.getByRole("button", { name: "絞り込みを解除", exact: true }).click();
  await expect(page.locator(".creation-index .creation-scene-link")).toHaveCount(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

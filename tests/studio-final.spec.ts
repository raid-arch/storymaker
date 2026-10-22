import { test, expect } from "./fixtures";
import { navStudio, saved } from "./studio-helpers";
test("templates create reusable detailed settings and preserve existing values", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".project-hero")).toBeVisible();
  await navStudio(page, "設定テンプレート");
  await page
    .getByRole("button", { name: "テンプレートを作成", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("テンプレート名", { exact: true })
    .fill("人物共通項目");
  await dialog
    .getByRole("button", { name: "自由項目を追加", exact: true })
    .click();
  await dialog
    .getByLabel("自由項目1の名前", { exact: true })
    .fill("大切な誓い");
  await dialog
    .getByLabel("自由項目1の内容", { exact: true })
    .fill("秘密を守る");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  await page
    .getByRole("button", { name: "この項目を使う", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("新しい設定の名前", { exact: true })
    .fill("別世界の主人公");
  await dialog
    .getByRole("button", { name: "適用して開く", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "別世界の主人公", exact: true }),
  ).toBeVisible();
  await expect(page.locator('input[value="大切な誓い"]')).toBeVisible();
  await expect(
    page.locator("textarea").filter({ hasText: "秘密を守る" }),
  ).toBeVisible();
  await saved(page);
  await page.reload();
  await expect(page.locator(".topbar")).toBeVisible();
  await navStudio(page, "設定テンプレート");
  await expect(
    page.getByRole("heading", { name: "人物共通項目", exact: true }),
  ).toBeVisible();
});
test("public mode and exports show only independently written public text", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".project-hero")).toBeVisible();
  await navStudio(page, "公開情報");
  await expect(
    page.getByRole("heading", { name: "公開対象：0 件", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "公開用の文章を追加", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("元になる設定", { exact: true })
    .selectOption("entry:morgan");
  await dialog.getByLabel("公開用の名前", { exact: true }).fill("旅人");
  await dialog
    .getByLabel("公開用の文章", { exact: true })
    .fill("各地を訪れる人物です。");
  await dialog
    .getByLabel("この文章を公開用の出力に含める", { exact: true })
    .check();
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "公開用JSONを書き出す", exact: true })
    .click();
  const file = await download;
  const stream = await file.createReadStream();
  let text = "";
  for await (const chunk of stream!) text += chunk.toString();
  const doc = JSON.parse(text);
  expect(doc.items).toEqual([
    { title: "旅人", text: "各地を訪れる人物です。" },
  ]);
  expect(text).not.toContain("人物A");
  expect(text).not.toContain("truth");
  await page
    .getByRole("button", { name: "公開情報モードで確認", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "旅人", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".main-nav")).toHaveCount(0);
  expect(await page.locator("body").innerText()).not.toContain("人物A");
  await page
    .getByRole("button", { name: "編集画面へ戻る", exact: true })
    .click();
  await saved(page);
  await page.reload();
  await expect(page.locator(".topbar")).toBeVisible();
  await navStudio(page, "公開情報");
  await expect(
    page.getByRole("heading", { name: "公開対象：1 件", exact: true }),
  ).toBeVisible();
});
test("blood relationship layout can be generated and undone", async ({
  page,
}, info) => {
  await page.goto("./");
  await expect(page.locator(".project-hero")).toBeVisible();
  const mobile = page.getByRole("button", {
    name: "メニューを開く",
    exact: true,
  });
  if (await mobile.isVisible()) await mobile.click();
  await page
    .locator(".main-nav")
    .getByRole("button", { name: /家系図/ })
    .click();
  const first = page.locator(".graph-person").first();
  await page.getByRole("button", { name: "配置を編集", exact: true }).click();
  await first.evaluate((el) =>
    el.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "instant",
    }),
  );
  const box = (await first.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  if (info.project.name === "android") {
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 30, y: y + 50 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await client.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 30, y + 50, { steps: 5 });
    await page.mouse.up();
  }
  await page.getByRole("button", { name: "移動を完了", exact: true }).click();
  const before = await first.getAttribute("style");
  expect(before).not.toContain("left: 80px; top: 90px;");
  await page
    .getByRole("button", { name: "血縁から自動配置", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "実行する", exact: true })
    .click();
  await expect(first).not.toHaveAttribute("style", before!);
  await page
    .getByRole("button", { name: "直前の操作を取り消す", exact: true })
    .click();
  await expect(first).toHaveAttribute("style", before!);
});

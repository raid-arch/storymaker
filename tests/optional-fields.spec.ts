import { test, expect } from "./fixtures";
import { openPerson, saved } from "./studio-helpers";
test("character information supports named additions, reusable suggestions, persistent empty fields and safe removal", async ({
  page,
}) => {
  await page.goto("./");
  await openPerson(page);
  await expect(page.getByLabel("外見", { exact: true })).toHaveCount(0);
  await page.locator(".optional-character-fields").screenshot({ path: `/tmp/storymaker-optional-${test.info().project.name}.png` });
  await expect(page.getByLabel("役割", { exact: true })).not.toHaveValue("");
  await page.locator(".frequent-fields summary").click();
  await page.getByRole("button", { name: "＋ 外見", exact: true }).click();
  await page.getByLabel("外見", { exact: true }).fill("銀色の髪");
  await page.getByRole("button", { name: "＋ 病気", exact: true }).click();
  await page.getByLabel("追加する項目名", { exact: true }).fill("口癖");
  await page
    .getByRole("button", { name: "＋ 項目を追加", exact: true })
    .click();
  await page.getByLabel("自由項目1の内容").fill("なるほどね");
  await saved(page);
  await page.reload();
  await openPerson(page);
  await expect(page.getByLabel("外見", { exact: true })).toHaveValue(
    "銀色の髪",
  );
  await expect(page.getByLabel("病気", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("自由項目1の内容")).toHaveValue("なるほどね");
  await page.getByLabel("追加する項目名", { exact: true }).fill("口癖");
  await page
    .getByRole("button", { name: "＋ 項目を追加", exact: true })
    .click();
  await expect(page.getByLabel("自由項目2の名前")).toHaveCount(0);
  await expect(page.getByLabel("自由項目1の内容")).toHaveValue("なるほどね");
  page.once("dialog", (d) => d.dismiss());
  await page
    .getByRole("button", { name: "外見の項目を外す", exact: true })
    .click();
  await expect(page.getByLabel("外見", { exact: true })).toHaveValue(
    "銀色の髪",
  );
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "外見の項目を外す", exact: true })
    .click();
  await expect(page.getByLabel("外見", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "直前の操作を取り消す", exact: true })
    .click();
  await expect(page.getByLabel("外見", { exact: true })).toHaveValue(
    "銀色の髪",
  );
  await page.getByRole("button", { name: "一覧へ戻る", exact: true }).click();
  await page.locator(".entry-card").filter({ hasText: "人物B" }).click();
  if (
    !(await page
      .getByRole("button", { name: "＋ 口癖", exact: true })
      .isVisible())
  )
    await page.locator(".frequent-fields summary").click();
  await page.getByRole("button", { name: "＋ 口癖", exact: true }).click();
  await expect(page.getByLabel("自由項目1の名前")).toHaveValue("口癖");
  await expect(page.getByLabel("自由項目1の内容")).toHaveValue("");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

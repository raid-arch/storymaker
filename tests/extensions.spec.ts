import { test, expect } from "./fixtures";
import { openPerson, saved } from "./studio-helpers";
test("basic editing stays visible while optional tools retain data and individual disclosure choices", async ({
  page,
}) => {
  await page.goto("./");
  await openPerson(page);
  const truth = page.locator('[data-extension="truth"]');
  await expect(page.getByLabel("設定・メモ", { exact: true })).toBeVisible();
  await expect(page.getByLabel("実際の真相", { exact: true })).toBeVisible();
  const original = await page
    .getByLabel("実際の真相", { exact: true })
    .inputValue();
  await truth.locator(":scope > summary").click();
  await expect(page.getByLabel("実際の真相", { exact: true })).toBeHidden();
  await expect(truth.locator("summary")).toContainText("入力あり");
  await page
    .getByLabel("設定・メモ", { exact: true })
    .fill("基本のメモを書き続ける");
  await saved(page);
  await page.reload();
  await openPerson(page);
  await expect(page.getByLabel("設定・メモ", { exact: true })).toHaveValue(
    "基本のメモを書き続ける",
  );
  await expect(page.getByLabel("実際の真相", { exact: true })).toBeHidden();
  await truth.locator(":scope > summary").click();
  await expect(page.getByLabel("実際の真相", { exact: true })).toHaveValue(
    original,
  );
  await expect(
    page.getByRole("button", { name: "症候群を作る", exact: true }),
  ).toBeHidden();
  await page.locator('[data-extension="syndromes"] > summary').click();
  await expect(
    page.getByRole("button", { name: "症候群を作る", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});

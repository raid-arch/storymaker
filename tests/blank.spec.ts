import { expect, test } from "@playwright/test";

test("fresh visitors see a blank workspace with no story or sample data", async ({
  page,
  context,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "あなたの物語を、ここから。" }),
  ).toBeVisible();
  await expect(page.locator(".entry-card")).toHaveCount(0);
  await expect(page.locator(".project-hero")).toHaveCount(0);
  const snapshot = await page.evaluate(
    async () =>
      await new Promise<{
        projects: unknown[];
        entries: unknown[];
        relations: unknown[];
      }>((resolve, reject) => {
        const r = indexedDB.open("tsuzuriniwa", 1);
        r.onsuccess = () => {
          const db = r.result,
            tx = db.transaction("state"),
            read = tx.objectStore("state").get("main");
          read.onsuccess = () => resolve(read.result);
          tx.oncomplete = () => db.close();
        };
        r.onerror = () => reject(r.error);
      }),
  );
  expect(snapshot.projects).toEqual([]);
  expect(snapshot.entries).toEqual([]);
  expect(snapshot.relations).toEqual([]);
  await page
    .getByRole("button", { name: "親を持たない物語から始める", exact: true })
    .click();
  await page.getByRole("textbox", { name: /作品名/ }).fill("自分だけの作品");
  await page.getByRole("dialog")
    .getByRole("button", { name: "ストーリーを作成", exact: true })
    .click();
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "あなたの物語を、ここから。", exact: true }),
  ).toBeVisible();
  const other = await context
    .browser()!
    .newContext({ baseURL: test.info().project.use.baseURL });
  const visitor = await other.newPage();
  await visitor.goto("./");
  await expect(
    visitor.getByRole("heading", { name: "あなたの物語を、ここから。" }),
  ).toBeVisible();
  await expect(
    visitor.getByText("自分だけの作品", { exact: true }),
  ).toHaveCount(0);
  await other.close();
});

test("no sample import control or personalized preview is exposed in a fresh app", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.getByRole("heading", {name:"あなたの物語を、ここから。"})).toBeVisible();
  await page.getByRole("button", {name:"開始画面の設定を開く",exact:true}).click();
  await page.getByRole("button", {name:"見た目",exact:true}).click();
  await expect(
    page.getByRole("button", { name: "別のサンプルとして追加" }),
  ).toHaveCount(0);
  await expect(page.locator(".appearance-preview")).toContainText(
    "あなたの物語",
  );
});

import { expect, test } from "./fixtures";
import type { Data } from "../src/model";
async function settings(page: import("@playwright/test").Page) {
  await page.locator(".main-nav").waitFor({ state: "attached" });
  if (await page.getByRole("button", { name: "メニューを開く" }).isVisible())
    await page.getByRole("button", { name: "メニューを開く" }).click();
  await page
    .getByRole("button", { name: "設定・バックアップ", exact: true })
    .click();
}
async function saved(page: import("@playwright/test").Page) {
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
}
async function connect(page: import("@playwright/test").Page) {
  await settings(page);
  await saved(page);
  await page
    .getByLabel("接続キー（Personal access token）")
    .fill("test-only-secret");
  await page.getByRole("button", { name: "接続してデータを確認" }).click();
}
async function home(page: import("@playwright/test").Page) {
  if (await page.locator(".bottom-nav").isVisible())
    await page
      .locator(".bottom-nav")
      .getByRole("button", { name: "ホーム", exact: true })
      .click();
  else await page.locator(".brand").click();
}
function cloud() {
  let data: Data | null = null,
    sha: string | null = null,
    writes = 0;
  return {
    get data() {
      return data;
    },
    get sha() {
      return sha;
    },
    get writes() {
      return writes;
    },
    change(fn: (d: Data) => void) {
      if (!data) throw Error("missing cloud");
      data = structuredClone(data);
      fn(data);
      sha = `version-${++writes}`;
    },
    async route(page: import("@playwright/test").Page, privateRepo = true) {
      await page.route("https://api.github.com/repos/**", async (route) => {
        const request = route.request(),
          url = new URL(request.url());
        const reply = (body: unknown, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            body: JSON.stringify(body),
          });
        if (!url.pathname.includes("/contents/"))
          return reply({ private: privateRepo, default_branch: "main" });
        if (request.method() === "GET") {
          if (!data) return reply({ message: "Not Found" }, 404);
          const content = Buffer.from(
            JSON.stringify({
              format: "tsuzuriniwa-sync",
              version: 1,
              updatedAt: "2026-10-20T00:00:00Z",
              data,
            }),
          ).toString("base64");
          return reply({
            sha,
            size: content.length,
            encoding: "base64",
            content,
          });
        }
        const body = request.postDataJSON();
        if ((body.sha || null) !== sha)
          return reply({ message: "conflict" }, 409);
        data = JSON.parse(Buffer.from(body.content, "base64").toString()).data;
        sha = `version-${++writes}`;
        return reply({ content: { sha } });
      });
    },
  };
}

test("private cloud sync uploads, persists connection, pulls safely, and stops on conflicting changes", async ({
  page,
}) => {
  const remote = cloud();
  await remote.route(page);
  await page.goto("./");
  await connect(page);
  await expect(
    page.getByRole("dialog", { name: "最初に使うデータを選ぶ" }),
  ).toBeVisible();
  expect(remote.writes).toBe(0);
  await page
    .getByRole("button", { name: "この端末の内容を初めてクラウドに保存" })
    .click();
  await expect(page.locator(".sync-status")).toContainText("同期済み");
  expect(remote.data?.projects[0].name).toBe("検証用の物語");
  expect(JSON.stringify(remote.data)).not.toContain("test-only-secret");
  await page.reload();
  await settings(page);
  await expect(page.locator(".sync-connected")).toContainText(
    "raid-arch/storymaker-data",
  );
  remote.change((d) => {
    d.projects[0].description = "PCから届いた新しい説明";
  });
  await saved(page);
  await page.getByRole("button", { name: "今すぐ同期" }).click();
  await expect(page.locator(".sync-status")).toContainText("同期済み");
  await home(page);
  await expect(page.locator(".hero-content")).toContainText(
    "PCから届いた新しい説明",
  );
  await page
    .getByRole("button", { name: "ストーリーを編集", exact: true })
    .click();
  await page.getByLabel("説明", { exact: true }).fill("スマホで別の変更");
  await page.getByRole("button", { name: "完了", exact: true }).click();
  remote.change((d) => {
    d.projects[0].description = "もう一方の端末からの変更";
  });
  await saved(page);
  await settings(page);
  await page.getByRole("button", { name: "今すぐ同期" }).click();
  const dialog = page.getByRole("dialog", { name: "両端末の変更を確認" });
  await expect(dialog).toBeVisible();
  expect(remote.data?.projects[0].description).toBe("もう一方の端末からの変更");
  await page
    .getByRole("button", { name: "クラウドの最新版をこの端末で使う" })
    .click();
  await expect(dialog).not.toBeVisible();
  await saved(page);
  await home(page);
  await expect(page.locator(".hero-content")).toContainText(
    "もう一方の端末からの変更",
  );
});

test("public repository is rejected and credentials stay out of JSON exports", async ({
  page,
}) => {
  const remote = cloud();
  await remote.route(page, false);
  await page.goto("./");
  await connect(page);
  await expect(page.locator(".sync-error")).toContainText(
    "公開リポジトリには同期できません",
  );
  expect(remote.writes).toBe(0);
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "全データをJSONでバックアップ" })
    .click();
  const file = await (await download).path();
  const fs = await import("node:fs/promises");
  expect(await fs.readFile(file!, "utf8")).not.toContain("test-only-secret");
});

test("a second device must choose data before existing cloud stories can replace its sample", async ({
  page,
  browser,
  baseURL,
}) => {
  const remote = cloud();
  const first = page;
  await remote.route(first);
  await first.goto("./");
  await connect(first);
  await first
    .getByRole("button", { name: "この端末の内容を初めてクラウドに保存" })
    .click();
  await expect(first.locator(".sync-status")).toContainText("同期済み");
  remote.change((d) => {
    d.projects[0].name = "先に保存した自分の作品";
  });
  const second = await browser.newPage({ baseURL });
  await remote.route(second);
  await second.goto("./");
  await connect(second);
  await expect(second.getByRole("dialog")).toContainText(
    "先に保存した自分の作品",
  );
  expect(remote.data?.projects[0].name).toBe("先に保存した自分の作品");
  await second
    .getByRole("button", { name: "クラウドの最新版をこの端末で使う" })
    .click();
  await saved(second);
  await home(second);
  await expect(
    second.getByRole("heading", {
      name: "先に保存した自分の作品",
      exact: true,
    }),
  ).toBeVisible();
  await first.close();
  await second.close();
});

import { expect, test } from "./fixtures";
import type { Page } from "@playwright/test";
import type { Data } from "../src/model";
import { seed } from "./sample";
const scope = "https://www.googleapis.com/auth/drive.appdata";
async function settings(page: Page) {
  const menu = page.getByRole("button", {
    name: "メニューを開く",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("button", { name: "設定・バックアップ", exact: true })
    .click();
  await page.getByRole("button", { name: "端末間同期", exact: true }).click();
  await expect(page.getByLabel("同期サービス", { exact: true })).toHaveValue(
    "google",
  );
}
async function installAuth(page: Page) {
  await page.addInitScript((permission) => {
    (window as any).google = {
      accounts: {
        oauth2: {
          initTokenClient: (opts: any) => ({
            requestAccessToken: () =>
              opts.callback({
                access_token: "google-test-secret",
                expires_in: 3600,
                scope: permission,
              }),
          }),
        },
      },
    };
  }, scope);
}
function drive(initial: Data | null = null) {
  let payload = initial
    ? {
        format: "tsuzuriniwa-google-sync",
        version: 1,
        updatedAt: "2026-10-24",
        data: structuredClone(initial),
      }
    : null;
  let revision = 1,
    writes = 0,
    rejectNext = false;
  return {
    get data() {
      return payload?.data || null;
    },
    get writes() {
      return writes;
    },
    change(fn: (data: Data) => void) {
      if (!payload) throw Error("no cloud data");
      fn(payload.data);
      revision++;
    },
    rejectNextWrite() {
      rejectNext = true;
    },
    async install(page: Page) {
      await installAuth(page);
      await page.route("https://www.googleapis.com/**", async (route) => {
        const req = route.request(),
          url = new URL(req.url());
        const headers = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "*",
          "Access-Control-Expose-Headers": "ETag",
        };
        const reply = (
          body: unknown,
          status = 200,
          extra: Record<string, string> = {},
        ) =>
          route.fulfill({
            status,
            headers: { ...headers, ...extra },
            contentType: "application/json",
            body: JSON.stringify(body),
          });
        if (req.method() === "OPTIONS") {
          await route.fulfill({ status: 204, headers });
          return;
        }
        expect(req.headers().authorization).toBe("Bearer google-test-secret");
        if (url.pathname.endsWith("/about")) {
          await reply({
            user: {
              permissionId: "account-1",
              emailAddress: "writer@example.com",
            },
          });
          return;
        }
        if (req.method() === "GET" && url.pathname.endsWith("/files")) {
          expect(url.searchParams.get("spaces")).toBe("appDataFolder");
          await reply({
            files: payload
              ? [
                  {
                    id: "private-file",
                    size: String(JSON.stringify(payload).length),
                  },
                ]
              : [],
          });
          return;
        }
        if (req.method() === "GET" && url.searchParams.get("alt") === "media") {
          await reply(payload, payload ? 200 : 404, { ETag: `"v${revision}"` });
          return;
        }
        if (req.method() === "PATCH") {
          if (rejectNext || req.headers()["if-match"] !== `"v${revision}"`) {
            rejectNext = false;
            revision++;
            await reply({}, 412);
            return;
          }
          payload = JSON.parse(req.postData()!);
          revision++;
          writes++;
          await reply({ id: "private-file" });
          return;
        }
        if (req.method() === "POST") {
          const body = req.postData()!;
          expect(body).toContain('"parents":["appDataFolder"]');
          payload = JSON.parse(
            body.slice(
              body.indexOf('{"format":"tsuzuriniwa-google-sync"'),
              body.lastIndexOf("\r\n--"),
            ),
          );
          revision++;
          writes++;
          await reply({ id: "private-file" });
          return;
        }
        throw Error(
          `Unexpected Google request ${req.method()} ${url.pathname}`,
        );
      });
    },
  };
}
async function connect(page: Page) {
  await settings(page);
  const input = page.getByLabel("GoogleのWebクライアントID", { exact: true });
  if (!(await input.isVisible()))
    await page.getByText("初回のGoogle接続設定", { exact: true }).click();
  await input.fill("123-test.apps.googleusercontent.com");
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
  await page
    .getByRole("button", { name: "Googleに接続して同期", exact: true })
    .click();
}
test("Google sync requires an initial choice, uploads edits automatically, stops races and keeps tokens out of saved data", async ({
  page,
}) => {
  const server = drive();
  await server.install(page);
  await page.goto("./");
  await connect(page);
  const dialog = page.getByRole("dialog", {
    name: "Google同期で使うデータを選ぶ",
  });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await dialog.screenshot({ path: `/tmp/storymaker-google-choice-${test.info().project.name}.png` });
  expect(server.writes).toBe(0);
  await dialog
    .getByRole("button", {
      name: "この端末の内容をGoogle Driveに保存",
      exact: true,
    })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("status").filter({ hasText: "Google Driveと同期済み" }),
  ).toBeVisible();
  const menu = page.getByRole("button", {
    name: "メニューを開く",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .locator(".main-nav")
    .getByRole("button", { name: "キャラクター", exact: false })
    .click();
  await page.locator(".entry-card").filter({ hasText: "人物A" }).click();
  await page
    .getByLabel("設定・メモ", { exact: true })
    .fill("Googleへ自動保存する本文");
  await expect
    .poll(() => server.data?.entries.find((e) => e.name === "人物A")?.body)
    .toBe("Googleへ自動保存する本文");
  server.rejectNextWrite();
  await page
    .getByLabel("設定・メモ", { exact: true })
    .fill("競合しても残る端末の本文");
  await expect(page.locator(".sync-strip")).toContainText("同期を停止");
  await expect(page.getByLabel("設定・メモ", { exact: true })).toHaveValue(
    "競合しても残る端末の本文",
  );
  expect(server.data?.entries.find((e) => e.name === "人物A")?.body).toBe(
    "Googleへ自動保存する本文",
  );
  const saved = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const q = indexedDB.open("tsuzuriniwa", 1);
      q.onsuccess = () => resolve(q.result);
    });
    return await new Promise<string>((resolve) => {
      const q = db.transaction("state").objectStore("state").getAll();
      q.onsuccess = () => {
        db.close();
        resolve(JSON.stringify(q.result));
      };
    });
  });
  expect(saved).not.toContain("google-test-secret");
  expect(JSON.stringify(server.data)).not.toContain("writer@example.com");
});
test("Google download protects local data and divergent edits require a choice", async ({
  page,
}) => {
  const remote = seed();
  remote.projects[0].name = "Driveにある作品";
  const server = drive(remote);
  await server.install(page);
  await page.goto("./");
  await connect(page);
  const dialog = page.getByRole("dialog", {
    name: "Google同期で使うデータを選ぶ",
  });
  await expect(dialog).toContainText("Driveにある作品");
  expect(server.writes).toBe(0);
  await dialog
    .getByRole("button", {
      name: "Google Driveの内容をこの端末で使う",
      exact: true,
    })
    .click();
  await expect(dialog).toBeHidden();
  const menu = page.getByRole("button", {
    name: "メニューを開く",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .locator(".main-nav")
    .getByRole("button", { name: "キャラクター", exact: false })
    .click();
  await page.locator(".entry-card").filter({ hasText: "人物A" }).click();
  server.change((d) => {
    d.entries.find((e) => e.name === "人物A")!.body = "Drive側だけの変更";
  });
  await page.getByLabel("設定・メモ", { exact: true }).fill("端末側だけの変更");
  await expect(dialog).toBeVisible();
  expect(server.writes).toBe(0);
  await expect(dialog).toContainText("Google同期の変更を確認");
  await dialog
    .getByRole("button", {
      name: "Google Driveの内容をこの端末で使う",
      exact: true,
    })
    .click();
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel("設定・メモ", { exact: true })).toHaveValue(
    "Drive側だけの変更",
  );
  await page.reload();
  await settings(page);
  await expect(
    page.getByText("Googleに再接続が必要", { exact: true }),
  ).toBeVisible();
  expect(server.writes).toBe(0);
});

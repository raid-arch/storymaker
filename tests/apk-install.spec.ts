import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const release = JSON.parse(readFileSync("public/android-release.json", "utf8"));
test("APK instructions remain accessible under PWA control and save a real APK", async ({
  page,
}) => {
  await page.goto("./");
  await expect(
    page.getByRole("link", { name: "Androidアプリをインストール", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page
    .getByRole("link", { name: "Androidアプリをインストール", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Androidに綴庭を入れる", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".main-nav")).toHaveCount(0);
  const link = page.getByRole("link", {
    name: "APKをダウンロード",
    exact: true,
  });
  await expect(link).toHaveAttribute(
    "download",
    `tsuzuriniwa-${release.versionName}.apk`,
  );
  const pending = page.waitForEvent("download");
  await link.click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe(
    `tsuzuriniwa-${release.versionName}.apk`,
  );
  const stream = await download.createReadStream();
  const hash = createHash("sha256");
  for await (const chunk of stream!) hash.update(chunk);
  expect(hash.digest("hex")).toBe(release.sha256);
  await expect(page.getByRole("status")).toContainText(
    "ファイルが保存されたら",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("APK instructions support copying the URL when app browsers block downloads", async ({
  page,
}, info) => {
  await page.goto("./downloads/");
  await expect(
    page.getByRole("heading", { name: "Androidに綴庭を入れる", exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          document.documentElement.dataset.copiedUrl = text;
        },
      },
    }),
  );
  await page
    .getByRole("button", { name: "ページのURLをコピー", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-copied-url",
    "https://raid-arch.github.io/storymaker/downloads/",
  );
  if (info.project.name === "android")
    await expect(
      page.getByRole("link", { name: "Chromeで開く", exact: true }),
    ).toHaveAttribute("href", /package=com.android.chrome/);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    }),
  );
  await page
    .getByRole("button", { name: "ページのURLをコピー", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("URLを選択しました");
  await expect(
    page.getByRole("textbox", { name: "Chromeに貼り付けるURL" }),
  ).toBeFocused();
});

test("direct APK links are not replaced with the PWA HTML fallback", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.getByRole("link",{name:"Androidアプリをインストール",exact:true})).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.evaluate((name) => {
    const link = document.createElement("a");
    link.href = "./downloads/" + name;
    link.textContent = "APKの直接リンク";
    link.style.cssText = "position:fixed;top:0;left:0;z-index:99999;background:white;color:black;padding:12px";
    document.body.appendChild(link);
  }, `tsuzuriniwa-${release.versionName}.apk`);
  const pending = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "APKの直接リンク", exact: true })
    .click();
  const file = await pending;
  expect(file.suggestedFilename()).toBe(
    `tsuzuriniwa-${release.versionName}.apk`,
  );
});

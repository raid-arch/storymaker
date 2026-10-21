import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  // OS install prompts cannot be automated. Keep the fallback deterministic,
  // then simulate the browser's one-use event explicitly in prompt tests.
  await page.addInitScript(() => {
    window.addEventListener(
      "beforeinstallprompt",
      (event) => {
        if (event.isTrusted) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      true,
    );
  });
  await page.goto("./");
  await expect(
    page.getByRole("button", {
      name: "ブラウザ版をホーム画面に追加",
      exact: true,
    }),
  ).toBeVisible();
});

test("install button offers safe browser instructions when no prompt is available", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "ブラウザ版をホーム画面に追加", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "ブラウザ版をホーム画面に追加",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Android・PCのChrome");
  await expect(dialog).toContainText("iPhone・iPadのSafari");
  await expect(dialog).toContainText(
    "再インストールを強制することはできません",
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("browser install event is prompted once and cancellation keeps the app usable", async ({
  page,
}) => {
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {
        document.documentElement.dataset.promptCount = String(
          Number(document.documentElement.dataset.promptCount || 0) + 1,
        );
      },
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
  await page
    .getByRole("button", { name: "ブラウザ版をホーム画面に追加", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "インストールを見送りました",
  );
  await expect(page.locator("html")).toHaveAttribute("data-prompt-count", "1");
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await page
    .getByRole("button", { name: "ブラウザ版をホーム画面に追加", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "以下の手順をお試しください",
  );
  await expect(page.locator("html")).toHaveAttribute("data-prompt-count", "1");
});

test("prompt failure shows guidance and successful installation updates the banner", async ({
  page,
}) => {
  await page.evaluate(() => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {
        throw new Error("unavailable");
      },
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    window.dispatchEvent(event);
  });
  await page
    .getByRole("button", { name: "ブラウザ版をホーム画面に追加", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "インストール画面を開けませんでした",
  );
  await page.getByRole("button", { name: "閉じる", exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")));
  await expect(page.locator(".install-banner")).toContainText(
    "ブラウザ版を追加済み",
  );
  await expect(
    page.getByRole("button", {
      name: "ブラウザ版をホーム画面に追加",
      exact: true,
    }),
  ).toHaveCount(0);
});

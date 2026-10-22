import { test, expect } from "./fixtures";
import type { Locator, Page } from "@playwright/test";

async function characters(page: Page) {
  const menu=page.getByRole("button",{name:"メニューを開く",exact:true});if(await menu.isVisible())await menu.click();
  await page.locator(".main-nav").getByRole("button",{name:/キャラクター/}).click();
}
async function saved(page: Page) {
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
}
async function hold(card: Locator) {
  await card.dispatchEvent("pointerdown", {
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    pointerId: 1,
    clientX: 60,
    clientY: 150,
  });
}

test("project opens from its surface; long press opens actions without click-through", async ({
  page,
}) => {
  await page.goto("./");
  await page.locator(".hero-open").click();
  await page
    .getByLabel("説明", { exact: true })
    .fill("作品カードから編集した説明");
  await page.getByRole("button", { name: "完了", exact: true }).click();
  const hero = page.locator(".project-hero");
  await hold(hero);
  const actions = page.getByRole("dialog", {
    name: "検証用の物語の操作",
    exact: true,
  });
  await expect(actions).toBeVisible();
  await hero.dispatchEvent("pointerup", { pointerType: "touch", pointerId: 1 });
  await page.locator(".hero-open").dispatchEvent("click", { detail: 1 });
  await expect(page.getByRole("textbox", { name: /作品名/ })).toHaveCount(0);
  await actions.getByRole("button", { name: /編集する/ }).click();
  await expect(page.getByLabel("説明", { exact: true })).toHaveValue(
    "作品カードから編集した説明",
  );
  await page.getByRole("button", { name: "完了", exact: true }).click();
  await saved(page);
  await page.reload();
  await expect(page.locator(".hero-content")).toContainText(
    "作品カードから編集した説明",
  );
});

test("scrolling, moving, and cancelled touches do not trigger long press; menu supports keyboard", async ({
  page,
}) => {
  await page.goto("./");
  const hero = page.locator(".project-hero");
  await expect(hero).toBeVisible();
  await hold(hero);
  await hero.dispatchEvent("pointermove", {
    pointerType: "touch",
    pointerId: 1,
    clientX: 60,
    clientY: 190,
  });
  await page.waitForTimeout(650);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await hold(hero);
  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await page.waitForTimeout(650);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await hold(hero);
  await hero.dispatchEvent("pointercancel", {
    pointerType: "touch",
    pointerId: 1,
  });
  await page.waitForTimeout(650);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const menu = hero.getByRole("button", { name: "検証用の物語の操作" });
  await menu.focus();
  await menu.press("Enter");
  const dialog = page.getByRole("dialog", { name: "検証用の物語の操作" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "キャンセル" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(menu).toBeFocused();
  await hero.dispatchEvent("contextmenu");
  await expect(dialog).toBeVisible();
});

test("entry actions duplicate independently and preserve original links; deletion can be undone directly", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".project-hero")).toBeVisible();
  await characters(page);
  const original = page
    .locator(".entry-card-wrap")
    .filter({ has: page.getByRole("heading", { name: "人物A", exact: true }) });
  await original
    .getByRole("button", { name: "人物Aの操作", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /複製する/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "人物A（コピー）", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".link-row")).toHaveCount(2);
  await expect(page.locator(".relation-link")).toHaveCount(0);
  await page
    .getByLabel("設定・メモ", { exact: true })
    .fill("複製だけに追記した内容");
  await saved(page);
  await page.getByRole("button", { name: "一覧へ戻る" }).click();
  await expect(page.locator(".entry-card")).toHaveCount(6);
  await original.locator(".entry-card").click();
  await expect(page.getByLabel("設定・メモ", { exact: true })).not.toHaveValue(
    "複製だけに追記した内容",
  );
  await page.getByRole("button", { name: "一覧へ戻る" }).click();
  await original
    .getByRole("button", { name: "人物Aの操作", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /削除する/ })
    .click();
  await page.getByRole("button", { name: "キャンセル", exact: true }).click();
  await expect(original).toHaveCount(1);
  await original
    .getByRole("button", { name: "人物Aの操作", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /削除する/ })
    .click();
  await page.getByRole("button", { name: "実行する", exact: true }).click();
  await expect(original).toHaveCount(0);
  await page.getByRole("button", { name: "元に戻す", exact: true }).click();
  await expect(original).toHaveCount(1);
  await original.locator(".entry-card").click();
  await expect(page.locator(".link-row")).toHaveCount(2);
  await expect(page.locator(".relation-link")).toHaveCount(4);
  await saved(page);
  await page.reload();
  await expect(page.locator(".topbar")).toBeVisible();
  await characters(page);
  await expect(page.locator(".entry-card")).toHaveCount(6);
  await page
    .locator(".entry-card")
    .filter({ hasText: "人物A（コピー）" })
    .click();
  await expect(page.getByLabel("設定・メモ", { exact: true })).toHaveValue(
    "複製だけに追記した内容",
  );
});

test("writing room autosaves, counts text, restores focus, and retains text through reload", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator(".project-hero")).toBeVisible();
  await characters(page);
  await page
    .locator(".entry-card")
    .filter({ has: page.getByRole("heading", { name: "人物A", exact: true }) })
    .click();
  const expand = page.getByRole("button", {
    name: "設定・メモを広げて書く",
    exact: true,
  });
  await expand.click();
  const room = page.getByRole("dialog", {
    name: "設定・メモの執筆",
    exact: true,
  });
  const text = "星の庭へ。🌸\n次の世代へ、物語は続く。";
  await room.getByRole("textbox").fill(text);
  await expect(room.locator(".writing-footer")).toContainText(
    `${Array.from(text).length} 文字`,
  );
  await expect(room.getByRole("status")).toHaveText("保存済み");
  // Escape during Japanese input composition must not close the writing room.
  await room
    .getByRole("textbox")
    .dispatchEvent("keydown", { key: "Escape", isComposing: true });
  await expect(room).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(room).toHaveCount(0);
  await expect(expand).toBeFocused();
  await expect(page.getByLabel("設定・メモ", { exact: true })).toHaveValue(
    text,
  );
  await saved(page);
  await page.reload();
  await expect(page.locator(".topbar")).toBeVisible();
  await characters(page);
  await page
    .locator(".entry-card")
    .filter({ has: page.getByRole("heading", { name: "人物A", exact: true }) })
    .click();
  await expect(page.getByLabel("設定・メモ", { exact: true })).toHaveValue(
    text,
  );
});

test("real touch hold and release keeps the action sheet open", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "android" || browserName !== "chromium",
    "Touch input is exercised in the Android profile.",
  );
  await page.goto("./");
  const hero = page.locator(".hero-open");
  await hero.scrollIntoViewIfNeeded();
  const box = (await page.locator(".hero-content h2").boundingBox())!;
  const client = await page.context().newCDPSession(page);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: box.x + Math.min(box.width / 2, 40), y: box.y + box.height / 2 },
    ],
  });
  const sheet = page.getByRole("dialog", { name: "検証用の物語の操作" });
  await expect(sheet).toBeVisible();
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
  // A person may continue holding after the menu has appeared.
  await page.waitForTimeout(1300);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(sheet).toBeVisible();
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
  await sheet.getByRole("button", { name: /編集する/ }).tap();
  await expect(page.getByRole("textbox", { name: /作品名/ })).toBeVisible();
  await client.detach();
});

test("large text stays usable on a narrow phone in list and writing views", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("./");
  await page.getByRole("button", { name: "カスタマイズ", exact: true }).click();
  await page.getByRole("button", { name: "大きめ", exact: true }).click();
  await page.getByRole("button", { name: "リスト", exact: true }).click();
  await characters(page);
  await expect(page.locator(".entry-card")).toHaveCount(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".entry-card-wrap")
    .first()
    .getByRole("button", { name: "人物Aの操作", exact: true })
    .click();
  const actions = page.getByRole("dialog", {
    name: "人物Aの操作",
    exact: true,
  });
  await expect(actions).toBeVisible();
  expect(await actions.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await actions.getByRole("button", { name: /編集する/ }).click();
  await page
    .getByRole("button", { name: "設定・メモを広げて書く", exact: true })
    .click();
  const room = page.getByRole("dialog", {
    name: "設定・メモの執筆",
    exact: true,
  });
  expect(await room.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
  await expect(
    room.getByRole("button", { name: "完了", exact: true }),
  ).toBeVisible();
  await expect(room.locator(".writing-footer")).toBeInViewport();
});

test("card selection is suppressed without disabling text selection in editors", async ({
  page,
}) => {
  await page.goto("./");
  const title = page.locator(".hero-content h2");
  await expect(title).toBeVisible();
  expect(
    await title.evaluate((element) => {
      const event = new Event("selectstart", {
        bubbles: true,
        cancelable: true,
      });
      return {
        cancelled: !element.dispatchEvent(event),
        userSelect: getComputedStyle(element).userSelect,
      };
    }),
  ).toEqual({ cancelled: true, userSelect: "none" });
  await page.locator(".hero-open").click();
  const description = page.getByLabel("説明", { exact: true });
  const selection = await description.evaluate(
    (element: HTMLTextAreaElement) => {
      element.select();
      return {
        cancelled: !element.dispatchEvent(
          new Event("selectstart", { bubbles: true, cancelable: true }),
        ),
        text: element.value.slice(element.selectionStart, element.selectionEnd),
      };
    },
  );
  expect(selection.cancelled).toBe(false);
  expect(selection.text).not.toBe("");
});

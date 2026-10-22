import { test, expect } from "./fixtures";
import { navStudio, saved } from "./studio-helpers";
test("map editor saves linked cities, touch dragging and polygon territories", async ({
  page,
}, info) => {
  await page.goto("./");
  await expect(page.locator(".project-hero")).toBeVisible();
  await navStudio(page, "世界地図");
  await expect
    .poll(() =>
      page
        .getByRole("navigation", { name: "創作スタジオの機能" })
        .evaluate((nav) => {
          const active = nav.querySelector('[aria-current="page"]')!;
          const a = active.getBoundingClientRect(),
            b = nav.getBoundingClientRect();
          return a.left >= b.left - 1 && a.right <= b.right + 1;
        }),
    )
    .toBe(true);
  await page.getByRole("button", { name: "地図を作成", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("地図の名前", { exact: true })
    .fill("検証用の世界地図");
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
  const canvas = page.locator(".map-canvas");
  const click = async (x: number, y: number) => {
    await page.locator(".map-viewport").evaluate((el) => {
      el.scrollTop = 0;
      el.scrollLeft = 0;
      el.scrollIntoView({ block: "center", behavior: "instant" });
    });
    const box = (await canvas.boundingBox())!;
    const point = {
      x: box.x + (x / 1000) * box.width,
      y: box.y + (y / 650) * box.height,
    };
    if (info.project.name === "android")
      await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
    await expect(page.locator(".map-canvas")).toBeVisible();
  };
  await page.getByRole("button", { name: "地点を置く", exact: true }).click();
  await click(150, 150);
  await page.getByLabel("地点の名前", { exact: true }).fill("検証都市");
  await page
    .getByLabel("関連する国家・都市などの設定", { exact: true })
    .selectOption("estate");
  await page
    .getByRole("button", { name: "地点：検証都市", exact: true })
    .locator("circle")
    .last()
    .scrollIntoViewIfNeeded();
  const before = await page
    .getByLabel("地点のX座標", { exact: true })
    .inputValue();
  const circle = (await page
    .getByRole("button", { name: "地点：検証都市", exact: true })
    .locator("circle")
    .last()
    .boundingBox())!;
  const x = circle.x + circle.width / 2,
    y = circle.y + circle.height / 2;
  if (info.project.name === "android") {
    const client = await page.context().newCDPSession(page);
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + 40, y: y + 20 }],
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await client.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 40, y + 20, { steps: 5 });
    await page.mouse.up();
  }
  await expect(page.getByLabel("地点のX座標", { exact: true })).not.toHaveValue(
    before,
  );
  await page.getByRole("button", { name: "領土を描く", exact: true }).click();
  await page
    .getByLabel("描いている領土の名前", { exact: true })
    .fill("検証領土");
  await click(100, 250);
  await expect(
    page.getByRole("status").filter({ hasText: "地図をタップして頂点を追加" }),
  ).toContainText("1 点");
  await click(400, 250);
  await expect(
    page.getByRole("status").filter({ hasText: "地図をタップして頂点を追加" }),
  ).toContainText("2 点");
  await click(200, 500);
  await expect(
    page.getByRole("status").filter({ hasText: "地図をタップして頂点を追加" }),
  ).toContainText("3 点");
  await page.getByRole("button", { name: "領土を確定", exact: true }).click();
  await expect(
    canvas.getByRole("button", { name: "領土：検証領土", exact: true }),
  ).toHaveCount(1);
  await saved(page);
  await page.reload();
  await expect(page.locator(".topbar")).toBeVisible();
  await navStudio(page, "世界地図");
  await expect
    .poll(() =>
      page
        .getByRole("navigation", { name: "創作スタジオの機能" })
        .evaluate((nav) => {
          const active = nav.querySelector('[aria-current="page"]')!;
          const a = active.getBoundingClientRect(),
            b = nav.getBoundingClientRect();
          return a.left >= b.left - 1 && a.right <= b.right + 1;
        }),
    )
    .toBe(true);
  await expect(
    canvas.getByRole("button", { name: "領土：検証領土", exact: true }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "地点：検証都市", exact: true }),
  ).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "地点：検証都市", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "検証用の建物", exact: true }),
  ).toBeVisible();
});

import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import { emptyData, newProject, newEntry } from "../src/model";
import { exportProjectPackage } from "../src/projectPackages";
async function settings(page: Page) {
  const menu=page.getByRole("button",{name:"メニューを開く",exact:true});if(await menu.isVisible())await menu.click();
  await page.getByRole("button",{name:"設定・バックアップ",exact:true}).click();
}
test("adds a scoped world/story package without replacing current data and exports selected copies",async({page})=>{
  const d=emptyData();d.projects=[{...newProject("world"),id:"w",name:"ユーフラス"},{...newProject(),id:"s",name:"明日も花は咲く",worldIds:["w"],collectionId:"w"}];
  d.entries=[{...newEntry("w","world"),id:"fact",name:"共有する設定",category:"国家・地域"}];
  const pack=exportProjectPackage(d,["s"]);
  await page.goto("./");await settings(page);
  await page.getByRole("button",{name:"世界観・ストーリーをJSONから追加",exact:true}).click();
  await page.getByLabel("JSONバックアップファイル").setInputFiles({name:"world.project.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(pack))});
  const dialog=page.getByRole("dialog");
  await expect(dialog).toContainText("現在のデータ・表示設定は保持");await expect(dialog).toContainText("ユーフラス");await expect(dialog).toContainText("明日も花は咲く");
  await dialog.getByRole("button",{name:"既存データを残して追加",exact:true}).click();
  await expect(page.locator(".save-indicator")).toContainText("保存済み");
  await page.reload();await settings(page);
  await expect(page.locator(".package-projects label")).toHaveCount(3);
  await expect(page.locator(".package-projects")).toContainText("検証用の物語");
  await page.locator(".package-projects").getByRole("checkbox",{name:/検証用の物語/}).uncheck();
  await page.locator(".package-projects").getByRole("checkbox",{name:/明日も花は咲く/}).check();
  await expect(page.locator(".package-included")).toContainText("ユーフラス");
  const download=page.waitForEvent("download");
  await page.getByRole("button",{name:"選んだ世界観・ストーリーをJSONで書き出す",exact:true}).click();
  const file=await(await download).path();const fs=await import("node:fs/promises");const exported=JSON.parse(await fs.readFile(file!,"utf8"));
  expect(exported.format).toBe("tsuzuriniwa-project-package");expect(exported.data.projects).toHaveLength(2);
  expect(JSON.stringify(exported)).not.toContain("検証用の物語");
  // Even the replace file picker routes a project package to safe additive import.
  await page.getByRole("button",{name:"JSONから復元・別の端末へ移行",exact:true}).click();
  await page.getByLabel("JSONバックアップファイル").setInputFiles(file!);
  await expect(page.getByRole("dialog").getByRole("button",{name:"既存データを残して追加",exact:true})).toBeVisible();
  await page.getByRole("dialog").getByRole("button",{name:"キャンセル",exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

import { test as base, expect } from "@playwright/test";
import { seed } from "./sample";
export { expect };
// Existing-content scenarios seed a fresh browser explicitly before app code
// loads. Only the database-upgrade transaction writes data, so reloads preserve
// edits. Fresh-profile tests use Playwright directly and receive no fixture.
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript((data) => {
      if (!localStorage.getItem("tsuzuriniwa:launch-mode")) {
        localStorage.setItem("tsuzuriniwa:launch-mode","resume");
        localStorage.setItem("tsuzuriniwa:active-workspace",data.projects[0]?.id||"");
        localStorage.setItem("tsuzuriniwa:resume-view","dashboard");
      }
      if (!localStorage.getItem("tsuzuriniwa:tools-expanded")) localStorage.setItem("tsuzuriniwa:tools-expanded","true");
      const request = indexedDB.open("tsuzuriniwa", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("state").put(data, "main");
      };
      request.onsuccess = () => request.result.close();
    }, seed());
    await use(page);
  },
});

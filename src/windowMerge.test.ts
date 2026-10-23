import { it, expect } from "vitest";
import { mergeWindows } from "./windowMerge";
it("merges separate windows without overwriting unrelated edits or restoring deleted rows", () => {
  const base = {
    scenes: [
      { id: "a", text: "old", memo: "old" },
      { id: "b", text: "remove" },
    ],
  };
  const local = {
    scenes: [
      { id: "a", text: "new", memo: "old" },
      { id: "b", text: "remove" },
    ],
  };
  const remote = { scenes: [{ id: "a", text: "old", memo: "remote" }] };
  expect(mergeWindows(base, local, remote)).toEqual({
    scenes: [{ id: "a", text: "new", memo: "remote" }],
  });
});
it("allows rapid local typing while saves are in flight and another window edits a different field", () => {
  const base = { scenes: [{ id: "a", text: "", memo: "" }] },
    own = new Map<string, unknown>();
  const first = { scenes: [{ id: "a", text: "one", memo: "" }] };
  mergeWindows(base, first, base, own);
  const remote = { scenes: [{ id: "a", text: "one", memo: "other window" }] };
  expect(
    mergeWindows(
      base,
      { scenes: [{ id: "a", text: "two", memo: "" }] },
      remote,
      own,
    ),
  ).toEqual({ scenes: [{ id: "a", text: "two", memo: "other window" }] });
});
it("rejects same-field edit conflicts and delete-versus-edit conflicts", () => {
  expect(() =>
    mergeWindows({ text: "a" }, { text: "b" }, { text: "c" }),
  ).toThrow(/別ウィンドウ/);
  expect(() =>
    mergeWindows([{ id: "a", text: "a" }], [], [{ id: "a", text: "b" }]),
  ).toThrow();
});

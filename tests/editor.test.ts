import { it, expect } from "vitest";
import {
  canPlace,
  commit,
  undo,
  redo,
  initialHistory,
} from "../lib/railway/editor";
import type { Track } from "../lib/railway/types";
const a: Track = { id: "a", type: "straight", x: 1, y: 1, rotation: 0 };
it("allows adjacent tracks but rejects occupied cells", () => {
  expect(canPlace([a], { ...a, id: "b", x: 2 })).toBe(true);
  expect(canPlace([a], { ...a, id: "b" })).toBe(false);
});
it.each([
  [-1, 0],
  [0, -1],
  [20, 0],
  [0, 20],
  [1.5, 2],
])("rejects board or grid violation %s,%s", (x, y) => {
  expect(canPlace([], { ...a, x, y })).toBe(false);
});
it("allows moving a piece while ignoring its previous position", () => {
  expect(canPlace([a], a, "a")).toBe(true);
});
it("undoes and redoes construction atomically", () => {
  const h = commit(initialHistory([]), [a]);
  expect(undo(h).present).toEqual([]);
  expect(redo(undo(h)).present).toEqual([a]);
});
it("limits undo to 50 actions", () => {
  let h = initialHistory([]);
  for (let i = 0; i < 80; i++) h = commit(h, [{ ...a, x: i % 20 }]);
  expect(h.past).toHaveLength(50);
});
it("clears redo after a new edit", () => {
  const h = undo(commit(initialHistory([]), [a]));
  expect(commit(h, [{ ...a, x: 2 }]).future).toHaveLength(0);
});

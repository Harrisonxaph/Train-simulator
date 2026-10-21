import { test, expect, type Page } from "@playwright/test";
async function ready(page: Page, sample = true) {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  const skip = page.getByRole("button", { name: "Skip tour" });
  if (await skip.isVisible()) await skip.click();
  if (sample)
    await page
      .getByRole("button", { name: "Sample railway", exact: true })
      .click();
}
async function cell(page: Page, x: number, y: number) {
  const c = page.getByRole("application", {
    name: "Railway construction board",
  });
  await c.scrollIntoViewIfNeeded();
  const b = await c.boundingBox();
  if (!b) throw Error("No board");
  const scale = Number(await c.getAttribute("data-scale")),
    ox = Number(await c.getAttribute("data-ox")),
    oy = Number(await c.getAttribute("data-oy"));
  return { x: b.x + ox + (x + 0.5) * scale, y: b.y + oy + (y + 0.5) * scale };
}
async function tapCell(page: Page, x: number, y: number) {
  const p = await cell(page, x, y);
  await page.mouse.click(p.x, p.y);
}
test("sample train runs on real tracks and pauses", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Sample railway" }).click();
  await page.getByRole("button", { name: "Drive mode" }).click();
  await page.getByRole("button", { name: "Classic Steam Engine" }).click();
  await tapCell(page, 7, 6);
  const status = page.getByTestId("train-status");
  const before = await status.getAttribute("data-position");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(status).toHaveAttribute("data-running", "true");
  await expect
    .poll(() => status.getAttribute("data-position"))
    .not.toBe(before);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(status).toHaveAttribute("data-running", "false");
  await page.waitForTimeout(200);
  const paused = await status.getAttribute("data-position");
  await page.waitForTimeout(400);
  expect(await status.getAttribute("data-position")).toBe(paused);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(status).toHaveAttribute("data-position", before!);
});
test("edits, rejects overlap, undo/redo and reloads a saved railway", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "New board" }).click();
  await page.getByRole("button", { name: "Clear board", exact: true }).click();
  await page
    .getByRole("button", { name: "Straight track", exact: true })
    .click();
  await tapCell(page, 8, 8);
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await tapCell(page, 8, 8);
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await page.getByRole("button", { name: "Curve track", exact: true }).click();
  await tapCell(page, 9, 8);
  await expect(page.getByTestId("piece-count")).toHaveText("2");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("2");
  await page.getByRole("button", { name: "Save railway", exact: true }).click();
  await page.reload();
  await expect(page.getByTestId("piece-count")).toHaveText("2");
});
test("builds an oval and recognises the loop", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "New board" }).click();
  await page.getByRole("button", { name: "Clear board", exact: true }).click();
  await page.getByRole("button", { name: "Curve track", exact: true }).click();
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  await tapCell(page, 7, 7);
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  await tapCell(page, 11, 7);
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  await tapCell(page, 11, 11);
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  await tapCell(page, 7, 11);
  await page
    .getByRole("button", { name: "Straight track", exact: true })
    .click();
  for (const y of [7, 11])
    for (const x of [8, 9, 10]) await tapCell(page, x, y);
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  for (const x of [7, 11])
    for (const y of [8, 9, 10]) await tapCell(page, x, y);
  await expect(page.getByTestId("loop-count")).toHaveText("1");
  await page.getByRole("button", { name: "Drive mode" }).click();
  await page.getByRole("button", { name: "Classic Steam Engine" }).click();
  await tapCell(page, 9, 7);
  await page.getByRole("button", { name: "Fast", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(() => page.getByTestId("train-status").getAttribute("data-laps"), {
      timeout: 25000,
    })
    .not.toBe("0");
});
test("recovers corrupt saves without overwriting them", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("little-railways-v1", "broken"),
  );
  await ready(page, false);
  await expect(page.getByTestId("piece-count")).toHaveText("0");
  await expect(page.getByRole("status")).toContainText("saved railway");
  await page.waitForTimeout(900);
  expect(
    await page.evaluate(() => localStorage.getItem("little-railways-v1")),
  ).toBe("broken");
});
test("drags pieces, moves, rotates, deletes and cancels outside drops", async ({
  page,
  isMobile,
}) => {
  await page.setViewportSize({ width: isMobile ? 390 : 1280, height: 1100 });
  await ready(page);
  await page.getByRole("button", { name: "New board" }).click();
  await page.getByRole("button", { name: "Clear board", exact: true }).click();
  const palette = page.getByRole("button", {
    name: "Straight track",
    exact: true,
  });
  await palette.scrollIntoViewIfNeeded();
  const to = await cell(page, 9, 10);
  const from = await palette.boundingBox();
  if (!from) throw Error("No palette");
  // Use one continuous pointer gesture; the drop is judged by the canvas bounds.
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await page.getByRole("button", { name: "Select and move" }).click();
  let p = await cell(page, 9, 10);
  await page.mouse.click(p.x, p.y);
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  p = await cell(page, 9, 10);
  const q = await cell(page, 10, 10);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(q.x, q.y, { steps: 10 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Save railway", exact: true }).click();
  let saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("little-railways-v1")!),
  );
  expect(saved.tracks[0]).toMatchObject({ x: 10, y: 10, rotation: 1 });
  await page.getByRole("button", { name: "Delete selected piece" }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("0");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await page.getByRole("button", { name: "Curve track", exact: true }).click();
  p = await cell(page, 11, 11);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(2, 2, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByTestId("piece-count")).toHaveText("1");
});
test("supports keyboard grid placement and locks editing while driving", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "New board" }).click();
  await page.getByRole("button", { name: "Clear board", exact: true }).click();
  await page.locator("summary").filter({ hasText: "Place by grid" }).click();
  await page.getByLabel("Column", { exact: true }).fill("9");
  await page.getByLabel("Row", { exact: true }).fill("9");
  await page.getByRole("button", { name: "Place piece", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await page.getByRole("button", { name: "Classic Steam Engine" }).click();
  await page.getByRole("button", { name: "Place engine", exact: true }).click();
  await expect(page.getByTestId("train-status")).not.toHaveAttribute(
    "data-position",
    "none",
  );
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Straight track", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Rotate", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  await expect(page.getByTestId("train-status")).toHaveAttribute(
    "data-running",
    "false",
    { timeout: 5000 },
  );
  await page.getByRole("button", { name: "Reverse", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByTestId("train-status")).toHaveAttribute(
    "data-running",
    "true",
  );
});
test("keeps touch gestures on the board and resizes without losing the route", async ({
  page,
  isMobile,
}) => {
  await ready(page);
  if (isMobile) {
    await page.getByRole("button", { name: "New board" }).click();
    await page
      .getByRole("button", { name: "Clear board", exact: true })
      .click();
    await page.getByRole("button", { name: "Curve track", exact: true }).tap();
    const p = await cell(page, 10, 10);
    await page.touchscreen.tap(p.x, p.y);
    await expect(page.getByTestId("piece-count")).toHaveText("1");
  }
  await page
    .getByRole("button", { name: "Sample railway", exact: true })
    .click();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.getByTestId("loop-count")).toHaveText("1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByTestId("train-status")).toHaveAttribute(
    "data-running",
    "true",
  );
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("loop-count")).toHaveText("1");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("cancels an interrupted gesture without leaving a piece", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "New board" }).click();
  await page.getByRole("button", { name: "Clear board", exact: true }).click();
  const p = await cell(page, 9, 9);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.mouse.up();
  await expect(page.getByTestId("piece-count")).toHaveText("0");
  await tapCell(page, 9, 9);
  await expect(page.getByTestId("piece-count")).toHaveText("1");
});
test("does not advance through time spent in a hidden tab", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const status = page.getByTestId("train-status");
  await expect(status).toHaveAttribute("data-running", "true");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(150);
  const position = await status.getAttribute("data-position");
  await page.waitForTimeout(700);
  expect(await status.getAttribute("data-position")).toBe(position);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() => status.getAttribute("data-position"))
    .not.toBe(position);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
});

test("keeps transport controls within reach on a phone", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Phone-specific quick controls");
  await ready(page);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("application").scrollIntoViewIfNeeded();
  const pause = page.getByRole("button", { name: "Pause train", exact: true });
  await expect(pause).toBeInViewport();
  await pause.tap();
  await expect(page.getByTestId("train-status")).toHaveAttribute(
    "data-running",
    "false",
  );
  await page.getByRole("button", { name: "Play train", exact: true }).tap();
  await expect(page.getByTestId("train-status")).toHaveAttribute(
    "data-running",
    "true",
  );
  await page.getByRole("button", { name: "Stop train", exact: true }).tap();
  await expect(page.getByTestId("train-status")).toHaveAttribute(
    "data-position",
    "sample-2:0.500",
  );
});

test("undo after loading different geometry clears an invalid train start", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() =>
    localStorage.setItem(
      "little-railways-v1",
      JSON.stringify({
        version: 1,
        tracks: [{ id: "sample-0", type: "straight", x: 8, y: 8, rotation: 0 }],
        trainKind: "steam",
        start: { pieceId: "sample-0", distance: 0.9, direction: 1 },
        muted: false,
      }),
    ),
  );
  await page.getByRole("button", { name: "Load railway", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("32");
  await page.getByRole("button", { name: "Save railway", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Railway saved");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("little-railways-v1")!),
  );
  expect(saved.tracks).toHaveLength(32);
  expect(saved.start).toBe(null);
});
test("failed manual load protects the file until explicit recovery", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Save railway", exact: true }).click();
  await page.evaluate(() =>
    localStorage.setItem("little-railways-v1", "malformed-record"),
  );
  await page.getByRole("button", { name: "Load railway", exact: true }).click();
  await page.getByRole("button", { name: "Mute sound", exact: true }).click();
  await page.waitForTimeout(900);
  expect(
    await page.evaluate(() => localStorage.getItem("little-railways-v1")),
  ).toBe("malformed-record");
  await expect(page.getByTestId("piece-count")).toHaveText("32");
  await page.getByRole("button", { name: "Save railway", exact: true }).click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("little-railways-v1")!),
  );
  expect(saved.muted).toBe(true);
  expect(saved.tracks).toHaveLength(32);
});

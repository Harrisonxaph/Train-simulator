import { test, expect, type Page } from "@playwright/test";
async function ready(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Play", exact: true }),
  ).toBeVisible();
  const skip = page.getByRole("button", { name: "Skip tour" });
  if (await skip.isVisible()) await skip.click();
}
test("first launch is empty and never generates track on engine or Play", async ({
  page,
}) => {
  await ready(page);
  await expect(page.getByTestId("piece-count")).toHaveText("0");
  await expect(page.getByTestId("train-status")).toHaveAttribute(
    "data-position",
    "none",
  );
  await expect(page.getByRole("status")).toContainText(
    "Let’s build your railway! Choose a track to get started.",
  );
  await page.getByRole("button", { name: "Classic Steam Engine" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Build some track before adding your train!",
  );
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("0");
  await expect(page.getByTestId("train-status")).toHaveAttribute(
    "data-position",
    "none",
  );
});
test("loads V1 progress and New explicitly clears it", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "little-railways-v1",
      JSON.stringify({
        version: 1,
        tracks: [{ id: "old", type: "straight", x: 8, y: 8, rotation: 0 }],
        start: { pieceId: "old", distance: 0.5, direction: 1 },
        trainKind: "diesel",
        muted: true,
      }),
    ),
  );
  await ready(page);
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await expect(page.getByTestId("train-status")).toHaveAttribute(
    "data-position",
    "old:0.500",
  );
  await page.getByRole("button", { name: "New board" }).click();
  await page.getByRole("button", { name: "Clear board", exact: true }).click();
  await expect(page.getByTestId("piece-count")).toHaveText("0");
  await expect(page.getByTestId("train-status")).toHaveAttribute(
    "data-position",
    "none",
  );
});
async function grid(page: Page) {
  const details = page.locator("details.grid-placement");
  if (!(await details.getAttribute("open"))) {
    if (!(await page.getByLabel("Column", { exact: true }).isVisible()))
      await page
        .locator("summary")
        .filter({ hasText: "Place by grid" })
        .click();
  }
}
async function coordinates(page: Page, x: number, y: number) {
  await grid(page);
  await page.getByLabel("Column", { exact: true }).fill(String(x + 1));
  await page.getByLabel("Row", { exact: true }).fill(String(y + 1));
}
async function piece(
  page: Page,
  name: string,
  x: number,
  y: number,
  rotation = 0,
) {
  await page
    .getByRole("button", { name: "Select and move", exact: true })
    .click();
  await page.getByRole("button", { name, exact: true }).click();
  for (let i = 0; i < rotation; i++)
    await page.getByRole("button", { name: "Rotate", exact: true }).click();
  await coordinates(page, x, y);
  await page.getByRole("button", { name: "Place piece", exact: true }).click();
}
async function savedTracks(page: Page) {
  await page.getByRole("button", { name: "Save railway", exact: true }).click();
  return page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("little-railways-v1")!).tracks as {
        id: string;
        type: string;
        x: number;
        y: number;
        switchState?: string;
      }[],
  );
}
test("places all five pieces and retains switch state through undo and refresh", async ({
  page,
}) => {
  await ready(page);
  await piece(page, "Straight track", 6, 7);
  await piece(page, "Curve track", 7, 7);
  await piece(page, "Crossing track", 8, 7);
  await piece(page, "Left switch track", 9, 7);
  await piece(page, "Right switch track", 12, 7);
  await expect(page.getByTestId("piece-count")).toHaveText("5");
  let tracks = await savedTracks(page);
  const left = tracks.find((t) => t.type === "switch-left")!;
  await page.getByLabel("Switch to control").selectOption(left.id);
  await page
    .getByRole("button", { name: "Switch branch", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Switch branch", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  tracks = await savedTracks(page);
  expect(tracks.find((t) => t.id === left.id)!.switchState).toBe("straight");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await savedTracks(page);
  await page.reload();
  await expect(page.getByTestId("piece-count")).toHaveText("5");
  tracks = await savedTracks(page);
  expect(tracks.find((t) => t.id === left.id)!.switchState).toBe("branch");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("crossing keeps horizontal and vertical train routes independent", async ({
  page,
}) => {
  await ready(page);
  await piece(page, "Crossing track", 8, 8);
  for (const [x, y, r] of [
    [7, 8, 0],
    [9, 8, 0],
    [8, 7, 1],
    [8, 9, 1],
  ])
    await piece(page, "Straight track", x, y, r);
  const tracks = await savedTracks(page);
  const status = page.getByTestId("train-status");
  for (const [x, y, outX, outY] of [
    [7, 8, 9, 8],
    [8, 7, 8, 9],
  ]) {
    await page
      .getByRole("button", { name: "Classic Steam Engine", exact: true })
      .click();
    await coordinates(page, x, y);
    await page
      .getByRole("button", { name: "Place engine", exact: true })
      .click();
    await page.getByRole("button", { name: "Fast", exact: true }).click();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(status).toHaveAttribute("data-running", "false", {
      timeout: 7000,
    });
    await expect(status).toHaveAttribute(
      "data-piece",
      tracks.find((t) => t.x === outX && t.y === outY)!.id,
    );
  }
});
for (const [name, branchY] of [
  ["Left switch track", 7],
  ["Right switch track", 9],
] as const)
  test(`${name} routes into branch and blocks occupied changes`, async ({
    page,
  }) => {
    await ready(page);
    await piece(page, name, 8, 8);
    await piece(page, "Straight track", 7, 8);
    await piece(page, "Straight track", 10, 8);
    await piece(page, "Straight track", 9, branchY, 1);
    const tracks = await savedTracks(page),
      sw = tracks.find((t) => t.type.startsWith("switch"))!,
      branch = tracks.find((t) => t.x === 9 && t.y === branchY)!;
    await page.getByLabel("Switch to control").selectOption(sw.id);
    await page
      .getByRole("button", { name: "Switch branch", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Classic Steam Engine", exact: true })
      .click();
    await coordinates(page, 8, 8);
    await page
      .getByRole("button", { name: "Place engine", exact: true })
      .click();
    await page.getByLabel("Switch to control").selectOption(sw.id);
    await expect(
      page.getByRole("button", { name: "Switch straight", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Fast", exact: true }).click();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(page.getByTestId("train-status")).toHaveAttribute(
      "data-running",
      "false",
      { timeout: 7000 },
    );
    await expect(page.getByTestId("train-status")).toHaveAttribute(
      "data-piece",
      branch.id,
    );
  });

async function boardCell(page: Page, x: number, y: number) {
  const board = page.getByRole("application", {
    name: "Railway construction board",
  });
  await board.scrollIntoViewIfNeeded();
  const b = (await board.boundingBox())!;
  return {
    x:
      b.x +
      Number(await board.getAttribute("data-ox")) +
      (x + 0.5) * Number(await board.getAttribute("data-scale")),
    y:
      b.y +
      Number(await board.getAttribute("data-oy")) +
      (y + 0.5) * Number(await board.getAttribute("data-scale")),
  };
}
test("second-cell switch drag preserves anchor and alignment, rotate/delete undo safely", async ({
  page,
}) => {
  await ready(page);
  await piece(page, "Left switch track", 8, 8);
  await piece(page, "Straight track", 8, 9);
  const initial = await savedTracks(page);
  await page
    .getByLabel("Switch to control")
    .selectOption(initial.find((t) => t.type === "switch-left")!.id);
  await page
    .getByRole("button", { name: "Switch branch", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select and move", exact: true })
    .click();
  let p = await boardCell(page, 9, 8),
    q = await boardCell(page, 10, 8);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(q.x, q.y, { steps: 10 });
  await page.mouse.up();
  let tracks = await savedTracks(page);
  expect(tracks.find((t) => t.type === "switch-left")).toMatchObject({
    x: 9,
    y: 8,
    switchState: "branch",
  });
  await page.getByRole("button", { name: "Rotate", exact: true }).click();
  tracks = await savedTracks(page);
  expect(tracks.find((t) => t.type === "switch-left")).toMatchObject({
    x: 9,
    y: 8,
    rotation: 1,
    switchState: "branch",
  });
  await page
    .getByRole("button", { name: "Delete selected piece", exact: true })
    .click();
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  tracks = await savedTracks(page);
  expect(tracks.find((t) => t.type === "switch-left")).toMatchObject({
    x: 9,
    y: 8,
    rotation: 1,
    switchState: "branch",
  });
  await piece(page, "Straight track", 9, 9);
  await expect(page.getByTestId("piece-count")).toHaveText("2");
});
test("crossing engine route choice persists on refresh", async ({ page }) => {
  await ready(page);
  await piece(page, "Crossing track", 8, 8);
  await page
    .getByRole("button", { name: "Classic Steam Engine", exact: true })
    .click();
  await coordinates(page, 8, 8);
  await page.getByLabel("Train route", { exact: true }).selectOption("cross");
  await page.getByRole("button", { name: "Place engine", exact: true }).click();
  await expect(page.getByTestId("train-status")).toHaveAttribute(
    "data-path",
    "cross",
  );
  await savedTracks(page);
  await page.reload();
  await expect(page.getByTestId("train-status")).toHaveAttribute(
    "data-path",
    "cross",
  );
});
test("phone palette can swipe horizontally and place a switch by touch", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Touch-only gesture");
  await ready(page);
  const palette = page.getByRole("group", { name: "Track pieces" });
  await palette.scrollIntoViewIfNeeded();
  const b = (await palette.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const x = b.x + b.width - 12,
    y = b.y + 25;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let i = 1; i <= 10; i++)
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x - (i * (b.width - 24)) / 10, y }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => palette.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Right switch track", exact: true })
    .tap();
  const p = await boardCell(page, 8, 8);
  await page.touchscreen.tap(p.x, p.y);
  await expect(page.getByTestId("piece-count")).toHaveText("1");
  expect((await savedTracks(page))[0]).toMatchObject({
    type: "switch-right",
    x: 8,
    y: 8,
  });
});

test("board rendering resumes after a temporary zero-sized container", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  const board = page.getByRole("application", {
    name: "Railway construction board",
  });
  await board.evaluate((el) => (el.parentElement!.style.display = "none"));
  await page.waitForTimeout(100);
  await page
    .locator(".board-wrap")
    .evaluate((el) => el.style.removeProperty("display"));
  await page
    .getByRole("button", { name: "Sample railway", exact: true })
    .click();
  const before = await page
    .getByTestId("train-status")
    .getAttribute("data-position");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect
    .poll(() => page.getByTestId("train-status").getAttribute("data-position"))
    .not.toBe(before);
  await page.waitForTimeout(250);
  expect(errors).toEqual([]);
});

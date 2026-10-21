import { test, expect } from "@playwright/test";
test("open railway brakes, stays put through extension, resumes and reverses", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("little-railways-v1"))
      localStorage.setItem(
        "little-railways-v1",
        JSON.stringify({
          version: 2,
          source: "user",
          muted: true,
          trainKind: "steam",
          tracks: Array.from({ length: 4 }, (_, i) => ({
            id: String(i),
            type: "straight",
            x: 7 + i,
            y: 8,
            rotation: 0,
          })),
          start: { pieceId: "0", pathId: "main", distance: 0.2, direction: 1 },
        }),
      );
  });
  await page.goto("/");
  const skip = page.getByRole("button", { name: "Skip tour" });
  if (await skip.isVisible()) await skip.click();
  const status = page.getByTestId("train-status");
  await page.getByRole("button", { name: "Fast", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(status).toHaveAttribute("data-piece", "3", { timeout: 8000 });
  await expect(status).toHaveAttribute("data-running", "false", {
    timeout: 8000,
  });
  await expect(page.getByRole("status")).toContainText(
    "End of the track! Add more pieces to keep going!",
  );
  await expect(status).toHaveAttribute("data-stop-reason", "end");
  const stopped = await status.getAttribute("data-position");
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect(status).toHaveAttribute("data-running", "false");
    await expect(status).toHaveAttribute("data-position", stopped!);
  }
  await page.getByRole("button", { name: "Build mode", exact: true }).click();
  await page
    .getByRole("button", { name: "Straight track", exact: true })
    .click();
  await page.locator("summary").filter({ hasText: "Place by grid" }).click();
  await page.getByLabel("Column", { exact: true }).fill("12");
  await page.getByLabel("Row", { exact: true }).fill("9");
  await page.getByRole("button", { name: "Place piece", exact: true }).click();
  await expect(status).toHaveAttribute("data-position", stopped!);
  await expect(page.getByTestId("piece-count")).toHaveText("5");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(status).toHaveAttribute("data-running", "false", {
    timeout: 8000,
  });
  await expect(status).not.toHaveAttribute("data-piece", "3");
  await page.getByRole("button", { name: "Reverse", exact: true }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(status).toHaveAttribute("data-piece", "0", { timeout: 8000 });
  await expect(status).toHaveAttribute("data-running", "false", {
    timeout: 8000,
  });
  await expect(status).toHaveAttribute("data-position", "0:0.000");
});

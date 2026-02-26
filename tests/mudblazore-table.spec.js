const { test, expect } = require("@playwright/test");

async function waitForInteractive(page) {
  await expect
    .poll(async () => page.evaluate(() => typeof window.Blazor !== "undefined"))
    .toBe(true);
}

async function clickUntilVisible(toggleLocator, targetLocator) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await toggleLocator.click();

    try {
      await expect(targetLocator).toBeVisible({ timeout: 500 });
      return;
    } catch {
      // Retry to handle first click before Blazor interactivity has settled.
    }
  }

  throw new Error("Failed to reveal target content after retries.");
}

test("MudBlazoreTable supports expansion and status filtering", async ({ page }) => {
  await page.goto("/mudblazore-table");
  await waitForInteractive(page);

  await expect(page.getByRole("heading", { name: "MudBlazoreTable" })).toBeVisible();
  await expect(page.getByText("User 001")).toBeVisible();

  const parentRow = page.getByRole("row", { name: /User 001/ }).first();
  await expect(parentRow).toBeVisible();
  const parentToggle = parentRow.getByRole("button").first();
  const level2Heading = page.getByText("Sub-rows for User 001").first();

  await clickUntilVisible(parentToggle, level2Heading);
  await expect(level2Heading).toContainText("Sub-rows for User 001");

  const level2Grid = level2Heading.locator("xpath=following::table[1]");
  const statusFilter = level2Grid.locator("thead").getByText("All").first();
  await statusFilter.click();
  await page.locator("p", { hasText: /^Warning$/ }).first().click();

  await expect(level2Grid.locator("td", { hasText: /^Warning$/ }).first()).toBeVisible();
  await expect(level2Grid.locator("td", { hasText: /^Healthy$/ })).toHaveCount(0);
  await expect(level2Grid.locator("td", { hasText: /^Offline$/ })).toHaveCount(0);
});

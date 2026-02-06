const { test, expect } = require("@playwright/test");

const SAMPLE_COUNT = 3;
const thresholdsMs = {
  openLevel2Max: Number(process.env.OPEN_LEVEL2_MAX_MS ?? 2000),
  openLevel3Max: Number(process.env.OPEN_LEVEL3_MAX_MS ?? 2000),
  closeLevel3Max: Number(process.env.CLOSE_LEVEL3_MAX_MS ?? 2000),
  closeLevel2Max: Number(process.env.CLOSE_LEVEL2_MAX_MS ?? 2000)
};

function summarize(values) {
  const sum = values.reduce((acc, value) => acc + value, 0);
  return {
    samples: values.length,
    avgMs: Math.round((sum / values.length) * 100) / 100,
    maxMs: Math.round(Math.max(...values) * 100) / 100,
    minMs: Math.round(Math.min(...values) * 100) / 100
  };
}

async function measureMs(action, waitForCompletion) {
  const start = performance.now();
  await action();
  await waitForCompletion();
  return performance.now() - start;
}

async function ensureExpanded(toggleLocator, targetLocator) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await toggleLocator.click();
    try {
      await expect(targetLocator).toHaveCount(1, { timeout: 500 });
      return;
    } catch {
      // First click can be ignored before Blazor interactivity is fully established.
    }
  }

  throw new Error("Failed to expand target after retries.");
}

async function ensureCollapsed(toggleLocator, targetLocator) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await toggleLocator.click();
    try {
      await expect(targetLocator).toHaveCount(0, { timeout: 500 });
      return;
    } catch {
      // Keep retrying until collapse applies.
    }
  }

  throw new Error("Failed to collapse target after retries.");
}

test("measures nested table open/close speed across levels", async ({ page }, testInfo) => {
  await page.goto("/table");
  await expect
    .poll(async () => page.evaluate(() => typeof window.Blazor !== "undefined"))
    .toBe(true);

  const level1Toggle = page.getByTestId("level1-toggle-1");
  const level2Table = page.getByTestId("level2-table-1");
  const level2Toggle = page.getByTestId("level2-toggle-1-1");
  const level3Table = page.getByTestId("level3-table-1-1");

  await expect(level1Toggle).toBeVisible();

  // Warm-up to ensure the page is interactive before timed samples begin.
  await ensureExpanded(level1Toggle, level2Table);
  await expect(level2Toggle).toBeVisible();
  await ensureExpanded(level2Toggle, level3Table);
  await ensureCollapsed(level2Toggle, level3Table);
  await ensureCollapsed(level1Toggle, level2Table);

  const timings = {
    openLevel2Ms: [],
    openLevel3Ms: [],
    closeLevel3Ms: [],
    closeLevel2Ms: []
  };

  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    timings.openLevel2Ms.push(
      await measureMs(
        () => level1Toggle.click(),
        () => expect(level2Table).toHaveCount(1)
      )
    );

    await expect(level2Toggle).toBeVisible();

    timings.openLevel3Ms.push(
      await measureMs(
        () => level2Toggle.click(),
        () => expect(level3Table).toHaveCount(1)
      )
    );

    timings.closeLevel3Ms.push(
      await measureMs(
        () => level2Toggle.click(),
        () => expect(level3Table).toHaveCount(0)
      )
    );

    timings.closeLevel2Ms.push(
      await measureMs(
        () => level1Toggle.click(),
        () => expect(level2Table).toHaveCount(0)
      )
    );
  }

  const summary = {
    openLevel2: summarize(timings.openLevel2Ms),
    openLevel3: summarize(timings.openLevel3Ms),
    closeLevel3: summarize(timings.closeLevel3Ms),
    closeLevel2: summarize(timings.closeLevel2Ms)
  };

  await testInfo.attach("expand-collapse-speed-summary.json", {
    body: Buffer.from(JSON.stringify({ thresholdsMs, summary }, null, 2)),
    contentType: "application/json"
  });

  console.log("Nested table expand/collapse speed summary (ms):");
  console.log(JSON.stringify(summary, null, 2));

  expect(summary.openLevel2.maxMs).toBeLessThanOrEqual(thresholdsMs.openLevel2Max);
  expect(summary.openLevel3.maxMs).toBeLessThanOrEqual(thresholdsMs.openLevel3Max);
  expect(summary.closeLevel3.maxMs).toBeLessThanOrEqual(thresholdsMs.closeLevel3Max);
  expect(summary.closeLevel2.maxMs).toBeLessThanOrEqual(thresholdsMs.closeLevel2Max);
});

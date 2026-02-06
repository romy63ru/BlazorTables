const { test, expect } = require("@playwright/test");

const SAMPLE_COUNT = Number(process.env.RENDER_SAMPLE_COUNT ?? 3);
const thresholdsMs = {
  tableMax: Number(process.env.RENDER_TABLE_MAX_MS ?? 5000),
  sunburstMax: Number(process.env.RENDER_SUNBURST_MAX_MS ?? 6000),
  scatterMatrixMax: Number(process.env.RENDER_SCATTER_MAX_MS ?? 7000)
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

async function waitForInteractive(page) {
  await expect
    .poll(async () => page.evaluate(() => typeof window.Blazor !== "undefined"))
    .toBe(true);
}

async function measureRenderMs(page, route, waitForReady) {
  const start = performance.now();
  await page.goto(route);
  await waitForInteractive(page);
  await waitForReady();
  return performance.now() - start;
}

test("measures rendering speed for table and D3 pages", async ({ page }, testInfo) => {
  const timings = {
    tableMs: [],
    sunburstMs: [],
    scatterMatrixMs: []
  };

  // Warm-up navigation to reduce first-load startup skew.
  await page.goto("/table");
  await waitForInteractive(page);
  await expect(page.getByTestId("level1-toggle-1")).toBeVisible();

  for (let sample = 0; sample < SAMPLE_COUNT; sample += 1) {
    timings.tableMs.push(
      await measureRenderMs(
        page,
        "/table",
        () => expect(page.getByTestId("level1-toggle-1")).toBeVisible()
      )
    );

    timings.sunburstMs.push(
      await measureRenderMs(page, "/sunburst", async () => {
        await expect(page.locator("#earth-sunburst-chart svg")).toBeVisible();
        await expect(page.locator("#earth-sunburst-chart svg path").first()).toBeVisible();
        await expect
          .poll(async () => page.locator(".sunburst-legend .legend-item").count())
          .toBeGreaterThan(0);
      })
    );

    timings.scatterMatrixMs.push(
      await measureRenderMs(page, "/scatter-matrix", async () => {
        await expect(page.locator("#scatter-matrix-chart svg")).toBeVisible();
        await expect
          .poll(async () => page.locator("#scatter-matrix-chart circle.point").count())
          .toBeGreaterThan(0);
        await expect
          .poll(async () => page.locator("#scatter-matrix-chart g.brush").count())
          .toBeGreaterThan(0);
      })
    );
  }

  const summary = {
    table: summarize(timings.tableMs),
    sunburst: summarize(timings.sunburstMs),
    scatterMatrix: summarize(timings.scatterMatrixMs)
  };

  await testInfo.attach("render-speed-summary.json", {
    body: Buffer.from(JSON.stringify({ thresholdsMs, summary }, null, 2)),
    contentType: "application/json"
  });

  console.log("Render speed summary (ms):");
  console.log(JSON.stringify(summary, null, 2));

  expect(summary.table.maxMs).toBeLessThanOrEqual(thresholdsMs.tableMax);
  expect(summary.sunburst.maxMs).toBeLessThanOrEqual(thresholdsMs.sunburstMax);
  expect(summary.scatterMatrix.maxMs).toBeLessThanOrEqual(thresholdsMs.scatterMatrixMax);
});

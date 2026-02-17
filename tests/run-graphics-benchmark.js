const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:5088";
const SAMPLES = Number(process.env.GRAPHICS_BENCH_SAMPLES ?? 5);

const thresholdsMs = {
  sunburstFirstPaintMax: Number(process.env.SUNBURST_FIRST_PAINT_MAX_MS ?? 4000),
  sunburstReadyMax: Number(process.env.SUNBURST_READY_MAX_MS ?? 6000),
  scatterFirstPaintMax: Number(process.env.SCATTER_FIRST_PAINT_MAX_MS ?? 5000),
  scatterReadyMax: Number(process.env.SCATTER_READY_MAX_MS ?? 7000)
};

function round(value) {
  return Math.round(value * 100) / 100;
}

function summarize(values) {
  const sum = values.reduce((acc, value) => acc + value, 0);
  return {
    samples: values.length,
    avgMs: round(sum / values.length),
    minMs: round(Math.min(...values)),
    maxMs: round(Math.max(...values))
  };
}

async function waitForBlazor(page) {
  for (let i = 0; i < 100; i += 1) {
    const ready = await page.evaluate(() => typeof window.Blazor !== "undefined");
    if (ready) {
      return;
    }
    await page.waitForTimeout(100);
  }

  throw new Error("Blazor runtime was not ready in time.");
}

async function waitForSunburstReady(page) {
  await page.waitForSelector("#earth-sunburst-chart svg", { timeout: 15_000 });
  await page.waitForFunction(
    () => {
      const paths = document.querySelectorAll("#earth-sunburst-chart svg path").length;
      const legends = document.querySelectorAll(".sunburst-legend .legend-item").length;
      return paths > 0 && legends > 0;
    },
    { timeout: 15_000 }
  );
}

async function waitForScatterReady(page) {
  await page.waitForSelector("#scatter-matrix-chart svg", { timeout: 15_000 });
  await page.waitForFunction(
    () => {
      const points = document.querySelectorAll("#scatter-matrix-chart circle.point").length;
      const brushes = document.querySelectorAll("#scatter-matrix-chart g.brush").length;
      return points > 0 && brushes > 0;
    },
    { timeout: 15_000 }
  );
}

async function measurePageRender(page, route, firstSelector, waitForReady) {
  const start = performance.now();
  await page.goto(`${BASE_URL}${route}`);
  await waitForBlazor(page);
  await page.waitForSelector(firstSelector, { timeout: 15_000 });
  const firstPaintMs = performance.now() - start;
  await waitForReady(page);
  const readyMs = performance.now() - start;
  return { firstPaintMs, readyMs };
}

function evaluateStatus(summary) {
  if (
    summary.sunburst.firstPaint.maxMs <= thresholdsMs.sunburstFirstPaintMax &&
    summary.sunburst.ready.maxMs <= thresholdsMs.sunburstReadyMax &&
    summary.scatter.firstPaint.maxMs <= thresholdsMs.scatterFirstPaintMax &&
    summary.scatter.ready.maxMs <= thresholdsMs.scatterReadyMax
  ) {
    return "PASS";
  }

  return "FAIL";
}

function toMarkdown(summary, status) {
  const lines = [];
  lines.push("# Graphics Render Benchmark");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Base URL: ${BASE_URL}`);
  lines.push(`Samples: ${SAMPLES}`);
  lines.push(`Overall status: ${status}`);
  lines.push("");
  lines.push("## Thresholds (ms)");
  lines.push("");
  lines.push(`- Sunburst first paint: ${thresholdsMs.sunburstFirstPaintMax}`);
  lines.push(`- Sunburst ready: ${thresholdsMs.sunburstReadyMax}`);
  lines.push(`- Scatter matrix first paint: ${thresholdsMs.scatterFirstPaintMax}`);
  lines.push(`- Scatter matrix ready: ${thresholdsMs.scatterReadyMax}`);
  lines.push("");
  lines.push("## Results");
  lines.push("");
  lines.push("| Graphic | Metric | Avg (ms) | Min (ms) | Max (ms) |");
  lines.push("| --- | --- | --- | --- | --- |");
  lines.push(`| Sunburst | First paint | ${summary.sunburst.firstPaint.avgMs} | ${summary.sunburst.firstPaint.minMs} | ${summary.sunburst.firstPaint.maxMs} |`);
  lines.push(`| Sunburst | Ready | ${summary.sunburst.ready.avgMs} | ${summary.sunburst.ready.minMs} | ${summary.sunburst.ready.maxMs} |`);
  lines.push(`| Scatter Matrix | First paint | ${summary.scatter.firstPaint.avgMs} | ${summary.scatter.firstPaint.minMs} | ${summary.scatter.firstPaint.maxMs} |`);
  lines.push(`| Scatter Matrix | Ready | ${summary.scatter.ready.avgMs} | ${summary.scatter.ready.minMs} | ${summary.scatter.ready.maxMs} |`);
  lines.push("");
  lines.push("## Notes");
  lines.push("");
  lines.push("- First paint = first visible SVG element for the graphic.");
  lines.push("- Ready = SVG plus expected graphic elements (paths/legend for Sunburst, points/brush layers for Scatter Matrix).");
  return lines.join("\n");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const sunburstFirstPaint = [];
  const sunburstReady = [];
  const scatterFirstPaint = [];
  const scatterReady = [];

  try {
    for (let i = 0; i < SAMPLES; i += 1) {
      const sunburst = await measurePageRender(
        page,
        "/sunburst",
        "#earth-sunburst-chart svg",
        waitForSunburstReady
      );
      sunburstFirstPaint.push(sunburst.firstPaintMs);
      sunburstReady.push(sunburst.readyMs);

      const scatter = await measurePageRender(
        page,
        "/scatter-matrix",
        "#scatter-matrix-chart svg",
        waitForScatterReady
      );
      scatterFirstPaint.push(scatter.firstPaintMs);
      scatterReady.push(scatter.readyMs);

      console.log(`Sample ${i + 1}/${SAMPLES} completed`);
    }
  } finally {
    await browser.close();
  }

  const summary = {
    sunburst: {
      firstPaint: summarize(sunburstFirstPaint),
      ready: summarize(sunburstReady)
    },
    scatter: {
      firstPaint: summarize(scatterFirstPaint),
      ready: summarize(scatterReady)
    }
  };

  const status = evaluateStatus(summary);
  const markdown = toMarkdown(summary, status);

  const outputDir = path.join(process.cwd(), "tests", "results");
  const outputMd = path.join(outputDir, "graphics-render-benchmark.md");
  const outputJson = path.join(outputDir, "graphics-render-benchmark.json");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputMd, markdown, "utf8");
  fs.writeFileSync(outputJson, JSON.stringify({ thresholdsMs, summary, status }, null, 2), "utf8");

  console.log("Graphics benchmark summary:");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Saved markdown report: ${outputMd}`);
  console.log(`Saved json report: ${outputJson}`);

  if (status !== "PASS") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

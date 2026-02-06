const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:5088";
const SAMPLES_PER_APPROACH = Number(process.env.SAMPLES_PER_APPROACH ?? 3);
const THRESHOLDS_MS = {
  openLevel2Max: Number(process.env.OPEN_LEVEL2_MAX_MS ?? 2000),
  openLevel3Max: Number(process.env.OPEN_LEVEL3_MAX_MS ?? 2000),
  closeLevel3Max: Number(process.env.CLOSE_LEVEL3_MAX_MS ?? 2000),
  closeLevel2Max: Number(process.env.CLOSE_LEVEL2_MAX_MS ?? 2000)
};

const approaches = [
  { id: 1, parentId: 1, childId: 1, description: "Top row path (first parent, first child)." },
  { id: 2, parentId: 1, childId: 50, description: "Top parent, middle child." },
  { id: 3, parentId: 1, childId: 100, description: "Top parent, last child." },
  { id: 4, parentId: 10, childId: 1, description: "Early parent, first child." },
  { id: 5, parentId: 10, childId: 100, description: "Early parent, last child." },
  { id: 6, parentId: 50, childId: 1, description: "Middle parent, first child." },
  { id: 7, parentId: 50, childId: 50, description: "Middle parent, middle child." },
  { id: 8, parentId: 50, childId: 100, description: "Middle parent, last child." },
  { id: 9, parentId: 100, childId: 1, description: "Bottom parent, first child." },
  { id: 10, parentId: 100, childId: 100, description: "Bottom parent, last child." }
];

function summarize(values) {
  const sum = values.reduce((acc, value) => acc + value, 0);
  return {
    samples: values.length,
    avgMs: round(sum / values.length),
    minMs: round(Math.min(...values)),
    maxMs: round(Math.max(...values))
  };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function status(summary) {
  if (
    summary.openLevel2.maxMs <= THRESHOLDS_MS.openLevel2Max &&
    summary.openLevel3.maxMs <= THRESHOLDS_MS.openLevel3Max &&
    summary.closeLevel3.maxMs <= THRESHOLDS_MS.closeLevel3Max &&
    summary.closeLevel2.maxMs <= THRESHOLDS_MS.closeLevel2Max
  ) {
    return "PASS";
  }

  return "FAIL";
}

async function waitForBlazor(page) {
  for (let i = 0; i < 100; i += 1) {
    const ready = await page.evaluate(() => typeof window.Blazor !== "undefined");
    if (ready) {
      return;
    }

    await page.waitForTimeout(100);
  }

  throw new Error("Blazor interactivity did not initialize.");
}

async function waitForCount(locator, count, timeoutMs = 15_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const current = await locator.count();
    if (current === count) {
      return;
    }

    await locator.page().waitForTimeout(50);
  }

  throw new Error(`Locator count did not reach ${count} within ${timeoutMs}ms.`);
}

async function ensureExpanded(toggleLocator, targetLocator) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await toggleLocator.click();
    try {
      await waitForCount(targetLocator, 1, 800);
      return;
    } catch {
      // Retry until the UI applies.
    }
  }

  throw new Error("Failed to expand target after retries.");
}

async function ensureCollapsed(toggleLocator, targetLocator) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await toggleLocator.click();
    try {
      await waitForCount(targetLocator, 0, 800);
      return;
    } catch {
      // Retry until the UI applies.
    }
  }

  throw new Error("Failed to collapse target after retries.");
}

async function measureMs(action, waitForCompletion) {
  const start = performance.now();
  await action();
  await waitForCompletion();
  return performance.now() - start;
}

async function runApproach(page, approach) {
  await page.goto(`${BASE_URL}/table`);
  await waitForBlazor(page);

  const level1Toggle = page.getByTestId(`level1-toggle-${approach.parentId}`);
  const level2Table = page.getByTestId(`level2-table-${approach.parentId}`);
  const level2Toggle = page.getByTestId(`level2-toggle-${approach.parentId}-${approach.childId}`);
  const level3Table = page.getByTestId(`level3-table-${approach.parentId}-${approach.childId}`);

  await level1Toggle.waitFor({ state: "visible", timeout: 15_000 });

  // Warm-up to avoid counting initial hydration jitter.
  await ensureExpanded(level1Toggle, level2Table);
  await level2Toggle.waitFor({ state: "visible", timeout: 15_000 });
  await ensureExpanded(level2Toggle, level3Table);
  await ensureCollapsed(level2Toggle, level3Table);
  await ensureCollapsed(level1Toggle, level2Table);

  const openLevel2Ms = [];
  const openLevel3Ms = [];
  const closeLevel3Ms = [];
  const closeLevel2Ms = [];

  for (let sample = 0; sample < SAMPLES_PER_APPROACH; sample += 1) {
    openLevel2Ms.push(
      await measureMs(
        () => level1Toggle.click(),
        () => waitForCount(level2Table, 1)
      )
    );

    await level2Toggle.waitFor({ state: "visible", timeout: 15_000 });

    openLevel3Ms.push(
      await measureMs(
        () => level2Toggle.click(),
        () => waitForCount(level3Table, 1)
      )
    );

    closeLevel3Ms.push(
      await measureMs(
        () => level2Toggle.click(),
        () => waitForCount(level3Table, 0)
      )
    );

    closeLevel2Ms.push(
      await measureMs(
        () => level1Toggle.click(),
        () => waitForCount(level2Table, 0)
      )
    );
  }

  return {
    approach,
    openLevel2: summarize(openLevel2Ms),
    openLevel3: summarize(openLevel3Ms),
    closeLevel3: summarize(closeLevel3Ms),
    closeLevel2: summarize(closeLevel2Ms)
  };
}

function toMarkdown(results) {
  const lines = [];
  lines.push("# Nested Table Speed Results (10 Approaches)");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Base URL: ${BASE_URL}`);
  lines.push(`Samples per approach: ${SAMPLES_PER_APPROACH}`);
  lines.push("");
  lines.push("## Thresholds (ms)");
  lines.push("");
  lines.push(`- openLevel2 max: ${THRESHOLDS_MS.openLevel2Max}`);
  lines.push(`- openLevel3 max: ${THRESHOLDS_MS.openLevel3Max}`);
  lines.push(`- closeLevel3 max: ${THRESHOLDS_MS.closeLevel3Max}`);
  lines.push(`- closeLevel2 max: ${THRESHOLDS_MS.closeLevel2Max}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| # | Approach | Description | Open L2 avg/max (ms) | Open L3 avg/max (ms) | Close L3 avg/max (ms) | Close L2 avg/max (ms) | Status |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");

  for (const result of results) {
    lines.push(
      `| ${result.approach.id} | P${result.approach.parentId} -> C${result.approach.childId} | ${result.approach.description} | ${result.openLevel2.avgMs}/${result.openLevel2.maxMs} | ${result.openLevel3.avgMs}/${result.openLevel3.maxMs} | ${result.closeLevel3.avgMs}/${result.closeLevel3.maxMs} | ${result.closeLevel2.avgMs}/${result.closeLevel2.maxMs} | ${status(result)} |`
    );
  }

  lines.push("");
  lines.push("## Detailed Results");
  lines.push("");

  for (const result of results) {
    lines.push(`### Approach ${result.approach.id}: P${result.approach.parentId} -> C${result.approach.childId}`);
    lines.push(result.approach.description);
    lines.push("");
    lines.push(`- Open Level 2: avg ${result.openLevel2.avgMs} ms, min ${result.openLevel2.minMs} ms, max ${result.openLevel2.maxMs} ms`);
    lines.push(`- Open Level 3: avg ${result.openLevel3.avgMs} ms, min ${result.openLevel3.minMs} ms, max ${result.openLevel3.maxMs} ms`);
    lines.push(`- Close Level 3: avg ${result.closeLevel3.avgMs} ms, min ${result.closeLevel3.minMs} ms, max ${result.closeLevel3.maxMs} ms`);
    lines.push(`- Close Level 2: avg ${result.closeLevel2.avgMs} ms, min ${result.closeLevel2.minMs} ms, max ${result.closeLevel2.maxMs} ms`);
    lines.push(`- Result: ${status(result)}`);
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];

  try {
    for (const approach of approaches) {
      const result = await runApproach(page, approach);
      results.push(result);
      console.log(
        `Approach ${approach.id} complete: P${approach.parentId} -> C${approach.childId}`
      );
    }
  } finally {
    await browser.close();
  }

  const markdown = toMarkdown(results);
  const outputDir = path.join(process.cwd(), "tests", "results");
  const outputPath = path.join(outputDir, "nested-table-speed-10-approaches.md");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, markdown, "utf8");

  console.log(`Saved report: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

# BlazorTables

Blazor Server sample focused on multi-level nested tables with measurable expand/collapse performance.

## Current Project Goals

- Provide a stable 3-level nested table experience:
  - Level 1: parent rows
  - Level 2: child rows shown directly under the expanded parent row
  - Level 3: detail rows shown directly under the expanded child row
- Keep nested levels aligned vertically (no horizontal shift when expanding deeper levels).
- Generate realistic volume for UI behavior checks:
  - 100 parent rows
  - 100 child rows per parent
  - 100 detail rows per child
- Track interaction speed with automated browser tests and benchmark reporting.

## Tech Stack

- .NET 10 Blazor Server
- Razor components
- Playwright (Node.js) for end-to-end timing tests

## Run the App

From the repository root:

```bash
dotnet run --project BlazorTables.csproj --launch-profile http
```

App URL:

- `http://localhost:5088`

Alternative launcher script:

```bash
./run-site.ps1
```

## Test and Benchmark

### 1) Build and .NET tests

```bash
dotnet build BlazorTables.sln -v minimal
dotnet test BlazorTables.sln -v minimal
```

### 2) Install Playwright dependencies (one-time)

```bash
npm install
npx playwright install chromium
```

### 3) Run nested table speed test

```bash
npm run test:e2e -- tests/table-expand-collapse-speed.spec.js
```

### 4) Generate 10-approach benchmark Markdown report

```bash
npm run benchmark:approaches
```

Report output:

- `tests/results/nested-table-speed-10-approaches.md`

## Notes

- `data-testid` attributes are included in table markup for deterministic Playwright selectors.
- Timing thresholds are configurable with environment variables:
  - `OPEN_LEVEL2_MAX_MS`
  - `OPEN_LEVEL3_MAX_MS`
  - `CLOSE_LEVEL3_MAX_MS`
  - `CLOSE_LEVEL2_MAX_MS`

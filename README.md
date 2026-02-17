# BlazorTables

Blazor Server sample focused on multi-level nested tables, shared generated data, and D3 visualization.

## Quick Links

- Repository: [BlazorTables](https://github.com/romy63ru/BlazorTables)
- Local Table page: [http://localhost:5088/table](http://localhost:5088/table)
- Local Sunburst page: [http://localhost:5088/sunburst](http://localhost:5088/sunburst)
- Local Scatter Matrix page: [http://localhost:5088/scatter-matrix](http://localhost:5088/scatter-matrix)
- Benchmark report: [`tests/results/nested-table-speed-10-approaches.md`](tests/results/nested-table-speed-10-approaches.md)
- Graphics benchmark report: [`tests/results/graphics-render-benchmark.md`](tests/results/graphics-render-benchmark.md)

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
- Reuse one Blazor-side data source across:
  - the nested table page
  - the D3 Sunburst page
  - the D3 brushable scatterplot matrix page
- Track interaction speed with automated browser tests and benchmark reporting.

## Tech Stack

- .NET 10 Blazor Server
- Razor components
- D3.js for Sunburst and brushable scatterplot matrix visualizations
- Playwright (Node.js) for end-to-end timing tests

## Rendering Mode

- Interactive Server rendering (Blazor Server circuit over SignalR)
- Initial UI is rendered as HTML
- Component interactivity runs on the server (not WebAssembly in the browser)

## Data Model and Generation

Shared generator and models are used by both the table and diagram:

- Service: `Services/TableDataGenerator.cs`
- Models: `Models/NestedTableModels.cs`

This keeps page data in one place and avoids duplicated generation logic.

## Pages

- `/table`: 3-level nested table with expand/collapse and generated 100x100 child/detail rows
- `/sunburst`: interactive D3 Sunburst sourced from Blazor-side generated data
- `/scatter-matrix`: brushable D3 scatterplot matrix sourced from Blazor-side generated data

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

Open:

- `http://localhost:5088/table`
- `http://localhost:5088/sunburst`
- `http://localhost:5088/scatter-matrix`

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

### 5) Run page render-speed test

```bash
npm run test:e2e:render-speed
```

Spec file:

- `tests/render-speed.spec.js`

### 6) Run graphics benchmark (D3 rendering)

```bash
npm run benchmark:graphics
```

Runner file:

- `tests/run-graphics-benchmark.js`

Report output:

- `tests/results/graphics-render-benchmark.md`
- `tests/results/graphics-render-benchmark.json`

## D3 Sunburst Notes

The Sunburst diagram supports:

- hover details
- click-to-zoom on arcs
- center click to reset zoom

Data for the diagram is sent from Blazor (`Sunburst.razor`) through JS interop to D3 (`wwwroot/js/earth-sunburst.js`).

## D3 Scatter Matrix Notes

The scatter matrix supports:

- multidimensional scatter cells
- per-cell brush selection
- cross-cell point highlighting

Data for the diagram is sent from Blazor (`ScatterMatrix.razor`) through JS interop to D3 (`wwwroot/js/brushable-scatter-matrix.js`).

## Notes

- `data-testid` attributes are included in table markup for deterministic Playwright selectors.
- Timing thresholds are configurable with environment variables:
  - `OPEN_LEVEL2_MAX_MS`
  - `OPEN_LEVEL3_MAX_MS`
  - `CLOSE_LEVEL3_MAX_MS`
  - `CLOSE_LEVEL2_MAX_MS`

# Graphics Render Benchmark

Generated: 2026-02-06T21:12:41.793Z
Base URL: http://127.0.0.1:5088
Samples: 5
Overall status: PASS

## Thresholds (ms)

- Sunburst first paint: 4000
- Sunburst ready: 6000
- Scatter matrix first paint: 5000
- Scatter matrix ready: 7000

## Results

| Graphic | Metric | Avg (ms) | Min (ms) | Max (ms) |
| --- | --- | --- | --- | --- |
| Sunburst | First paint | 86.09 | 44.14 | 179.24 |
| Sunburst | Ready | 95.26 | 53.69 | 192.49 |
| Scatter Matrix | First paint | 59.49 | 53.06 | 70.58 |
| Scatter Matrix | Ready | 72.59 | 61.91 | 83.97 |

## Notes

- First paint = first visible SVG element for the graphic.
- Ready = SVG plus expected graphic elements (paths/legend for Sunburst, points/brush layers for Scatter Matrix).
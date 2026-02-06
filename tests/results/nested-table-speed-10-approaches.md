# Nested Table Speed Results (10 Approaches)

Generated: 2026-02-06T20:35:13.740Z
Base URL: http://127.0.0.1:5088
Samples per approach: 3

## Thresholds (ms)

- openLevel2 max: 2000
- openLevel3 max: 2000
- closeLevel3 max: 2000
- closeLevel2 max: 2000

## Summary

| # | Approach | Description | Open L2 avg/max (ms) | Open L3 avg/max (ms) | Close L3 avg/max (ms) | Close L2 avg/max (ms) | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | P1 -> C1 | Top row path (first parent, first child). | 81.9/83.36 | 82.91/84.34 | 81.76/83.21 | 85.05/85.58 | PASS |
| 2 | P1 -> C50 | Top parent, middle child. | 81.97/82.63 | 82.76/83.77 | 82.6/83.01 | 84.68/84.98 | PASS |
| 3 | P1 -> C100 | Top parent, last child. | 81.73/82.36 | 84.29/84.54 | 81.84/82.62 | 84.18/85.54 | PASS |
| 4 | P10 -> C1 | Early parent, first child. | 81.96/82.26 | 83.18/83.82 | 81.39/81.46 | 84.91/85.62 | PASS |
| 5 | P10 -> C100 | Early parent, last child. | 84.68/90.44 | 85.87/88.55 | 82.64/84.37 | 84.54/85.49 | PASS |
| 6 | P50 -> C1 | Middle parent, first child. | 81.04/82.13 | 84.77/85.33 | 81.63/82.68 | 85/85.78 | PASS |
| 7 | P50 -> C50 | Middle parent, middle child. | 81.88/81.95 | 83.74/84.59 | 89.95/106.15 | 87.76/92.78 | PASS |
| 8 | P50 -> C100 | Middle parent, last child. | 81.52/81.6 | 84.43/85.69 | 82.05/82.42 | 83.96/84.57 | PASS |
| 9 | P100 -> C1 | Bottom parent, first child. | 82.31/82.95 | 92.14/110.3 | 84.88/87.47 | 84.29/84.9 | PASS |
| 10 | P100 -> C100 | Bottom parent, last child. | 82.58/83.3 | 83.34/84.7 | 83.45/85.44 | 82.92/84.2 | PASS |

## Detailed Results

### Approach 1: P1 -> C1
Top row path (first parent, first child).

- Open Level 2: avg 81.9 ms, min 81.07 ms, max 83.36 ms
- Open Level 3: avg 82.91 ms, min 80.87 ms, max 84.34 ms
- Close Level 3: avg 81.76 ms, min 80.4 ms, max 83.21 ms
- Close Level 2: avg 85.05 ms, min 84.32 ms, max 85.58 ms
- Result: PASS

### Approach 2: P1 -> C50
Top parent, middle child.

- Open Level 2: avg 81.97 ms, min 81.3 ms, max 82.63 ms
- Open Level 3: avg 82.76 ms, min 81.86 ms, max 83.77 ms
- Close Level 3: avg 82.6 ms, min 82.18 ms, max 83.01 ms
- Close Level 2: avg 84.68 ms, min 84.19 ms, max 84.98 ms
- Result: PASS

### Approach 3: P1 -> C100
Top parent, last child.

- Open Level 2: avg 81.73 ms, min 80.74 ms, max 82.36 ms
- Open Level 3: avg 84.29 ms, min 83.85 ms, max 84.54 ms
- Close Level 3: avg 81.84 ms, min 80.54 ms, max 82.62 ms
- Close Level 2: avg 84.18 ms, min 82.94 ms, max 85.54 ms
- Result: PASS

### Approach 4: P10 -> C1
Early parent, first child.

- Open Level 2: avg 81.96 ms, min 81.47 ms, max 82.26 ms
- Open Level 3: avg 83.18 ms, min 82.71 ms, max 83.82 ms
- Close Level 3: avg 81.39 ms, min 81.27 ms, max 81.46 ms
- Close Level 2: avg 84.91 ms, min 84.06 ms, max 85.62 ms
- Result: PASS

### Approach 5: P10 -> C100
Early parent, last child.

- Open Level 2: avg 84.68 ms, min 81.54 ms, max 90.44 ms
- Open Level 3: avg 85.87 ms, min 84.47 ms, max 88.55 ms
- Close Level 3: avg 82.64 ms, min 81.41 ms, max 84.37 ms
- Close Level 2: avg 84.54 ms, min 83.54 ms, max 85.49 ms
- Result: PASS

### Approach 6: P50 -> C1
Middle parent, first child.

- Open Level 2: avg 81.04 ms, min 80.45 ms, max 82.13 ms
- Open Level 3: avg 84.77 ms, min 83.9 ms, max 85.33 ms
- Close Level 3: avg 81.63 ms, min 80.09 ms, max 82.68 ms
- Close Level 2: avg 85 ms, min 84.32 ms, max 85.78 ms
- Result: PASS

### Approach 7: P50 -> C50
Middle parent, middle child.

- Open Level 2: avg 81.88 ms, min 81.75 ms, max 81.95 ms
- Open Level 3: avg 83.74 ms, min 83.03 ms, max 84.59 ms
- Close Level 3: avg 89.95 ms, min 80.8 ms, max 106.15 ms
- Close Level 2: avg 87.76 ms, min 84.62 ms, max 92.78 ms
- Result: PASS

### Approach 8: P50 -> C100
Middle parent, last child.

- Open Level 2: avg 81.52 ms, min 81.46 ms, max 81.6 ms
- Open Level 3: avg 84.43 ms, min 83.35 ms, max 85.69 ms
- Close Level 3: avg 82.05 ms, min 81.79 ms, max 82.42 ms
- Close Level 2: avg 83.96 ms, min 83.16 ms, max 84.57 ms
- Result: PASS

### Approach 9: P100 -> C1
Bottom parent, first child.

- Open Level 2: avg 82.31 ms, min 81.3 ms, max 82.95 ms
- Open Level 3: avg 92.14 ms, min 82.89 ms, max 110.3 ms
- Close Level 3: avg 84.88 ms, min 83.59 ms, max 87.47 ms
- Close Level 2: avg 84.29 ms, min 83.16 ms, max 84.9 ms
- Result: PASS

### Approach 10: P100 -> C100
Bottom parent, last child.

- Open Level 2: avg 82.58 ms, min 81.73 ms, max 83.3 ms
- Open Level 3: avg 83.34 ms, min 82.22 ms, max 84.7 ms
- Close Level 3: avg 83.45 ms, min 81.88 ms, max 85.44 ms
- Close Level 2: avg 82.92 ms, min 81.52 ms, max 84.2 ms
- Result: PASS

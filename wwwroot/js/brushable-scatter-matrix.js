(function () {
    "use strict";

    function resolveHost(selectorOrElement) {
        if (!selectorOrElement) {
            return null;
        }

        if (typeof selectorOrElement === "string") {
            return document.querySelector(selectorOrElement);
        }

        return selectorOrElement;
    }

    function formatNumber(value) {
        return Math.round(value * 100) / 100;
    }

    function cross(dimensions) {
        const pairs = [];
        for (const x of dimensions) {
            for (const y of dimensions) {
                pairs.push({ x, y });
            }
        }
        return pairs;
    }

    function render(selectorOrElement, data) {
        const host = resolveHost(selectorOrElement);
        if (!host) {
            return;
        }

        if (!window.d3) {
            host.innerHTML = "<p>D3 was not loaded. Please refresh the page.</p>";
            return;
        }

        dispose(host);

        const d3 = window.d3;
        const info = d3.select(host)
            .append("div")
            .attr("class", "matrix-info")
            .text("Brush in any cell to highlight matching points across all charts.");

        const dimensions = [
            { key: "healthySubRows", label: "Healthy SubRows" },
            { key: "warningSubRows", label: "Warning SubRows" },
            { key: "offlineSubRows", label: "Offline SubRows" },
            { key: "avgDetailValue", label: "Avg Detail Value" },
            { key: "highDetailRate", label: "High Detail Rate %" }
        ];

        const n = dimensions.length;
        const cellSize = 132;
        const padding = 22;
        const margin = { top: 36, right: 22, bottom: 26, left: 38 };
        const size = cellSize * n;
        const width = size + margin.left + margin.right;
        const height = size + margin.top + margin.bottom;

        const svg = d3.select(host)
            .append("svg")
            .attr("viewBox", [0, 0, width, height])
            .attr("width", width)
            .attr("height", height)
            .style("max-width", "100%")
            .style("height", "auto")
            .style("font", "11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif");

        const chart = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const roles = Array.from(new Set(data.map((d) => d.role))).sort();
        const color = d3.scaleOrdinal()
            .domain(roles)
            .range(["#2563eb", "#0f766e", "#b45309", "#7c3aed", "#db2777", "#374151"]);

        const xScale = new Map();
        const yScale = new Map();

        for (const dim of dimensions) {
            const extent = d3.extent(data, (d) => Number(d[dim.key]));
            const span = (extent[1] ?? 0) - (extent[0] ?? 0);
            const pad = span === 0 ? 1 : span * 0.08;
            xScale.set(dim.key, d3.scaleLinear()
                .domain([(extent[0] ?? 0) - pad, (extent[1] ?? 0) + pad])
                .range([padding / 2, cellSize - padding / 2]));
            yScale.set(dim.key, d3.scaleLinear()
                .domain([(extent[0] ?? 0) - pad, (extent[1] ?? 0) + pad])
                .range([cellSize - padding / 2, padding / 2]));
        }

        for (let i = 0; i < n; i += 1) {
            const xAxis = d3.axisBottom(xScale.get(dimensions[i].key)).ticks(4);
            chart.append("g")
                .attr("transform", `translate(${i * cellSize},${size})`)
                .call(xAxis)
                .call((g) => g.select(".domain").attr("stroke", "#9aa6b2"))
                .call((g) => g.selectAll("line").attr("stroke", "#d0d7de"));

            const yAxis = d3.axisLeft(yScale.get(dimensions[i].key)).ticks(4);
            chart.append("g")
                .attr("transform", `translate(0,${i * cellSize})`)
                .call(yAxis)
                .call((g) => g.select(".domain").attr("stroke", "#9aa6b2"))
                .call((g) => g.selectAll("line").attr("stroke", "#d0d7de"));
        }

        const cell = chart.selectAll(".cell")
            .data(cross(dimensions))
            .join("g")
            .attr("class", "cell")
            .attr("transform", (d) => {
                const xIndex = dimensions.findIndex((dim) => dim.key === d.x.key);
                const yIndex = dimensions.findIndex((dim) => dim.key === d.y.key);
                return `translate(${xIndex * cellSize},${yIndex * cellSize})`;
            });

        cell.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", cellSize)
            .attr("height", cellSize)
            .attr("fill", "#ffffff")
            .attr("stroke", "#d0d7de");

        const pointGroups = cell.filter((d) => d.x.key !== d.y.key)
            .append("g")
            .attr("class", "points");

        pointGroups.selectAll("circle")
            .data((_, cellIndex) => data.map((p, pointIndex) => ({ point: p, pointIndex, cellIndex })))
            .join("circle")
            .attr("class", "point")
            .attr("cx", (d) => {
                const c = cross(dimensions)[d.cellIndex];
                return xScale.get(c.x.key)(Number(d.point[c.x.key]));
            })
            .attr("cy", (d) => {
                const c = cross(dimensions)[d.cellIndex];
                return yScale.get(c.y.key)(Number(d.point[c.y.key]));
            })
            .attr("r", 2.8)
            .attr("fill", (d) => color(d.point.role))
            .attr("fill-opacity", 0.72)
            .attr("data-point-id", (d) => d.pointIndex);

        cell.filter((d) => d.x.key === d.y.key)
            .append("text")
            .attr("x", 10)
            .attr("y", 18)
            .attr("fill", "#1f2937")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .text((d) => d.x.label);

        let activeBrushCell = null;
        let brushDimensions = null;

        const brush = d3.brush()
            .extent([[0, 0], [cellSize, cellSize]])
            .on("start", function brushStart(event, cellDef) {
                if (activeBrushCell && activeBrushCell !== this) {
                    d3.select(activeBrushCell).call(brush.move, null);
                }
                activeBrushCell = this;
                brushDimensions = cellDef;
            })
            .on("brush", function brushed(event, cellDef) {
                if (!event.selection) {
                    return;
                }

                const [[x0, y0], [x1, y1]] = event.selection;
                const x = xScale.get(cellDef.x.key);
                const y = yScale.get(cellDef.y.key);
                const selected = new Set();

                data.forEach((point, index) => {
                    const px = x(Number(point[cellDef.x.key]));
                    const py = y(Number(point[cellDef.y.key]));
                    if (px >= x0 && px <= x1 && py >= y0 && py <= y1) {
                        selected.add(index);
                    }
                });

                chart.selectAll("circle.point")
                    .attr("fill-opacity", function () {
                        const index = Number(this.getAttribute("data-point-id"));
                        return selected.has(index) ? 0.9 : 0.08;
                    });

                info.text(
                    `${selected.size} / ${data.length} points selected using ${cellDef.x.label} x ${cellDef.y.label}.`
                );
            })
            .on("end", (event) => {
                if (event.selection) {
                    return;
                }

                chart.selectAll("circle.point").attr("fill-opacity", 0.72);
                info.text("Brush in any cell to highlight matching points across all charts.");
                activeBrushCell = null;
                brushDimensions = null;
            });

        cell.filter((d) => d.x.key !== d.y.key)
            .append("g")
            .attr("class", "brush")
            .call(brush);

        const legend = d3.select(host).append("div").attr("class", "matrix-legend");
        roles.forEach((role) => {
            const row = legend.append("div").attr("class", "legend-item");
            row.append("span")
                .attr("class", "legend-swatch")
                .style("background-color", color(role));
            row.append("span").text(role);
        });

        // Click outside brush areas resets any active selection.
        svg.on("click", () => {
            if (activeBrushCell && brushDimensions) {
                d3.select(activeBrushCell).call(brush.move, null);
            }
        });
    }

    function dispose(selectorOrElement) {
        const host = resolveHost(selectorOrElement);
        if (!host) {
            return;
        }

        host.innerHTML = "";
    }

    window.scatterMatrix = {
        render,
        dispose
    };
})();

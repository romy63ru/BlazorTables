(function () {
    "use strict";

    const instances = new Map();

    function resolveHost(selectorOrElement) {
        if (!selectorOrElement) {
            return null;
        }

        if (typeof selectorOrElement === "string") {
            return document.querySelector(selectorOrElement);
        }

        return selectorOrElement;
    }

    function stripSymbol(text) {
        return (text ?? "").replace(/\s*\(.+\)\s*$/, "");
    }

    function nodeVisible(node) {
        return node.y1 <= 3 && node.y0 >= 1 && node.x1 > node.x0;
    }

    function labelVisible(node) {
        return nodeVisible(node) && (node.x1 - node.x0) * (node.y1 - node.y0) > 0.02;
    }

    function labelRotation(node) {
        const angle = ((node.x0 + node.x1) / 2) * 180 / Math.PI - 90;
        return angle < 180 ? angle : angle - 180;
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
        const width = Math.min(Math.max(host.clientWidth || 680, 520), 920);
        const height = width;
        const radius = width / 6;

        const root = d3.hierarchy(data)
            .sum((d) => d.value || 0)
            .sort((a, b) => (b.value || 0) - (a.value || 0));
        d3.partition()
            .size([2 * Math.PI, root.height + 1])(root);

        root.each((d) => {
            d.current = d;
        });

        const topLayers = root.children ? root.children.map((d) => d.data.name) : [data.name];
        const color = d3.scaleOrdinal()
            .domain(topLayers)
            .range(d3.quantize(d3.interpolateSpectral, topLayers.length + 1).reverse());

        const arc = d3.arc()
            .startAngle((d) => d.x0)
            .endAngle((d) => d.x1)
            .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.007))
            .padRadius(radius * 0.5)
            .innerRadius((d) => d.y0 * radius)
            .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

        const details = d3.select(host)
            .append("div")
            .attr("class", "sunburst-details")
            .attr("aria-live", "polite")
            .text("Hover for details. Click a segment to zoom in. Click center to reset.");

        const svg = d3.select(host)
            .append("svg")
            .attr("viewBox", [0, 0, width, height])
            .attr("width", "100%")
            .attr("height", "auto")
            .style("font", "12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif");

        const group = svg
            .append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);

        const nodes = root.descendants().slice(1);

        const path = group.append("g")
            .selectAll("path")
            .data(nodes)
            .join("path")
            .attr("fill", (d) => {
                let current = d;
                while (current.depth > 1) {
                    current = current.parent;
                }
                return color(current.data.name);
            })
            .attr("fill-opacity", (d) => (d.children ? 0.78 : 0.52))
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1)
            .attr("pointer-events", (d) => nodeVisible(d.current) ? "auto" : "none")
            .attr("d", (d) => arc(d.current))
            .style("cursor", "pointer")
            .on("mouseenter", (event, d) => {
                const chain = d.ancestors().map((x) => stripSymbol(x.data.name)).reverse().join(" -> ");
                const fraction = root.value ? ((d.value || 0) / root.value) * 100 : 0;
                details.text(`${chain}: ${(d.value || 0).toFixed(2)} units (${fraction.toFixed(2)}%)`);
            })
            .on("mouseleave", () => {
                details.text("Hover for details. Click a segment to zoom in. Click center to reset.");
            })
            .on("click", (event, d) => {
                event.stopPropagation();
                clicked(d);
            });

        path
            .append("title")
            .text((d) => {
                const name = d.ancestors().map((x) => stripSymbol(x.data.name)).reverse().join(" -> ");
                const fraction = root.value ? ((d.value || 0) / root.value) * 100 : 0;
                return `${name}\n${(d.value || 0).toFixed(2)} units (${fraction.toFixed(2)}%)`;
            });

        const label = group.append("g")
            .attr("pointer-events", "none")
            .attr("text-anchor", "middle")
            .selectAll("text")
            .data(nodes)
            .join("text")
            .attr("dy", "0.35em")
            .attr("transform", (d) => {
                const [x, y] = arc.centroid(d.current);
                return `translate(${x},${y}) rotate(${labelRotation(d)})`;
            })
            .attr("fill-opacity", (d) => +labelVisible(d.current))
            .attr("fill", "#13213a")
            .style("font-size", "10px")
            .text((d) => stripSymbol(d.data.name));

        const center = group.append("g")
            .style("cursor", "pointer")
            .on("click", () => clicked(root));

        center.append("circle")
            .attr("r", radius * 0.18)
            .attr("fill", "#ffffff")
            .attr("stroke", "#d0d7de")
            .attr("stroke-width", 1.2);

        center.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "-0.2em")
            .style("font-size", "13px")
            .style("font-weight", "700")
            .text("Data");

        center.append("text")
            .attr("text-anchor", "middle")
            .attr("dy", "1.1em")
            .style("font-size", "10px")
            .attr("fill", "#425466")
            .text("reset zoom");

        const legend = d3.select(host).append("div").attr("class", "sunburst-legend");
        const layerValues = root.children || [];

        layerValues.forEach((layer) => {
            const row = legend.append("div").attr("class", "legend-item");
            row.append("span")
                .attr("class", "legend-swatch")
                .style("background-color", color(layer.data.name));
            row.append("span").text(`${layer.data.name}: ${(layer.value || 0).toFixed(2)}%`);
        });

        function clicked(focusNode) {
            const denominator = focusNode.x1 - focusNode.x0;
            root.each((d) => {
                d.target = {
                    x0: Math.max(0, Math.min(1, (d.x0 - focusNode.x0) / denominator)) * 2 * Math.PI,
                    x1: Math.max(0, Math.min(1, (d.x1 - focusNode.x0) / denominator)) * 2 * Math.PI,
                    y0: Math.max(0, d.y0 - focusNode.depth),
                    y1: Math.max(0, d.y1 - focusNode.depth)
                };
            });

            const transition = group.transition().duration(680);

            path
                .transition(transition)
                .tween("data", (d) => {
                    const interpolator = d3.interpolate(d.current, d.target);
                    return (t) => {
                        d.current = interpolator(t);
                    };
                })
                .attr("fill-opacity", (d) => nodeVisible(d.target) ? (d.children ? 0.78 : 0.52) : 0)
                .attr("pointer-events", (d) => nodeVisible(d.target) ? "auto" : "none")
                .attrTween("d", (d) => () => arc(d.current));

            label
                .filter((d) => labelVisible(d.target) || labelVisible(d.current))
                .transition(transition)
                .attr("fill-opacity", (d) => +labelVisible(d.current))
                .attrTween("transform", (d) => () => {
                    const [x, y] = arc.centroid(d.current);
                    return `translate(${x},${y}) rotate(${labelRotation(d.current)})`;
                });
        }

        instances.set(host, { svg: svg.node(), legend: legend.node(), details: details.node() });
    }

    function dispose(selectorOrElement) {
        const host = resolveHost(selectorOrElement);
        if (!host) {
            return;
        }

        host.innerHTML = "";
        instances.delete(host);
    }

    window.earthSunburst = {
        render,
        dispose
    };
})();

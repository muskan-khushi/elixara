import { useEffect } from "react";
import * as d3 from "d3";
import { ENTITY_COLORS } from "../styles/theme";

const NODE_RADIUS = (d) => Math.max(6, Math.min(22, Math.log1p(d.mentions || 1) * 4));

export function useD3Graph(svgRef, { nodes, edges }, { onNodeClick, pathNodeIds = [] }) {
  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth || 900;
    const height = svgRef.current.clientHeight || 600;

    svg.selectAll("*").remove();

    // Defs: arrowhead marker
    const defs = svg.append("defs");
    defs
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -4 8 8")
      .attr("refX", 14)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L8,0L0,4")
      .attr("fill", "#3d3570");

    const g = svg.append("g");

    // Zoom + Pan
    const zoom = d3
      .zoom()
      .scaleExtent([0.15, 5])
      .on("zoom", (e) => g.attr("transform", e.transform));
    svg.call(zoom);

    // Clone node/edge data so D3 can mutate x/y
    const nodeData = nodes.map((n) => ({ ...n }));
    const edgeData = edges
      .map((e) => ({
        ...e,
        source: nodeData.find((n) => n.id === e.source) || e.source,
        target: nodeData.find((n) => n.id === e.target) || e.target,
      }))
      .filter((e) => e.source && e.target);

    // Force simulation
    const sim = d3
      .forceSimulation(nodeData)
      .force(
        "link",
        d3
          .forceLink(edgeData)
          .id((d) => d.id)
          .strength(0.2)
          .distance(90)
      )
      .force("charge", d3.forceManyBody().strength(-180))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide((d) => NODE_RADIUS(d) + 10));

    // Edges
    const link = g
      .append("g")
      .selectAll("line")
      .data(edgeData)
      .join("line")
      .attr("stroke", (e) => {
        const isPath =
          pathNodeIds.length > 1 &&
          pathNodeIds.includes(typeof e.source === "object" ? e.source.id : e.source) &&
          pathNodeIds.includes(typeof e.target === "object" ? e.target.id : e.target);
        return isPath ? "#e8a930" : "#3d3570";
      })
      .attr("stroke-width", (e) => {
        const isPath =
          pathNodeIds.length > 1 &&
          pathNodeIds.includes(typeof e.source === "object" ? e.source.id : e.source) &&
          pathNodeIds.includes(typeof e.target === "object" ? e.target.id : e.target);
        return isPath ? 3 : Math.log1p(e.weight || 1) * 0.8;
      })
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", "url(#arrow)");

    // Nodes
    const node = g
      .append("g")
      .selectAll("circle")
      .data(nodeData)
      .join("circle")
      .attr("r", NODE_RADIUS)
      .attr("fill", (d) => ENTITY_COLORS[d.type] || "#6c3fc8")
      .attr("stroke", (d) =>
        pathNodeIds.includes(d.id) ? "#e8a930" : "#1c1640"
      )
      .attr("stroke-width", (d) => (pathNodeIds.includes(d.id) ? 3 : 2))
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onNodeClick && onNodeClick(d);
      })
      .call(
        d3
          .drag()
          .on("start", (e, d) => {
            if (!e.active) sim.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (e, d) => {
            d.fx = e.x;
            d.fy = e.y;
          })
          .on("end", (e, d) => {
            if (!e.active) sim.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Labels
    const label = g
      .append("g")
      .selectAll("text")
      .data(nodeData)
      .join("text")
      .text((d) => (d.label.length > 16 ? d.label.slice(0, 15) + "…" : d.label))
      .attr("font-size", 10)
      .attr("fill", "#a89ec8")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => NODE_RADIUS(d) + 13)
      .style("pointer-events", "none")
      .style("user-select", "none");

    sim.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      label.attr("x", (d) => d.x).attr("y", (d) => d.y);
    });

    return () => sim.stop();
  }, [nodes, edges, pathNodeIds]);
}

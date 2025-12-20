import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import * as d3 from 'd3';

export const WeightChart = ({ data, targetWeight, unit }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    // Only render if we have at least one data point
    if (!svgRef.current || !data || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 30, left: 45 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // 1. Prepare and Sort Data (Ensures chronological order)
    const sortedData = [...data]
      .map(d => ({ date: new Date(d[1]), weight: d[2] }))
      .sort((a, b) => a.date - b.date);

    // 2. Handle the X-Axis Domain
    let xDomain = d3.extent(sortedData, d => d.date);
    
    // FIX: If only one data point, pad the domain by 1 day so the axis can draw
    if (xDomain[0]?.getTime() === xDomain[1]?.getTime()) {
      xDomain = [
        d3.timeDay.offset(xDomain[0], -1), 
        d3.timeDay.offset(xDomain[1], 1)
      ];
    }

    const x = d3.scaleTime().domain(xDomain).range([0, width]);

    // 3. Handle the Y-Axis Domain
    const yMin = Math.min(d3.min(sortedData, d => d.weight), targetWeight || Infinity);
    const yMax = Math.max(d3.max(sortedData, d => d.weight), targetWeight || -Infinity);
    const y = d3.scaleLinear()
      .domain([yMin * 0.98, yMax * 1.02]) // 2% padding
      .range([height, 0]);

    // 4. Draw Lines
    const line = d3.line().x(d => x(d.date)).y(d => y(d.weight));
    
    // Weight Line (only if more than 1 point)
    if (sortedData.length > 1) {
      g.append("path")
        .datum(sortedData)
        .attr("fill", "none")
        .attr("stroke", "var(--color-accent-emphasis)")
        .attr("stroke-width", 2)
        .attr("d", line);
    }

    // Individual Dots (helpful for single points)
    g.selectAll(".dot")
      .data(sortedData)
      .enter().append("circle")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.weight))
      .attr("r", 4)
      .attr("fill", "var(--color-accent-emphasis)");

    // Target Goal Line
    if (targetWeight) {
      g.append("line")
        .attr("x1", 0).attr("x2", width)
        .attr("y1", y(targetWeight)).attr("y2", y(targetWeight))
        .attr("stroke", "var(--color-accent-success)")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,4");
    }

    // 5. Build Axes with Explicit Date Formatting
    const xAxis = d3.axisBottom(x)
      .ticks(Math.min(sortedData.length + 1, 5))
      .tickFormat(d3.timeFormat("%b %d")); // Example: "Oct 27"

    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(xAxis)
      .style("color", "var(--color-text-muted)");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .style("color", "var(--color-text-muted)");

  }, [data, targetWeight]);

  return <svg ref={svgRef} style={{ width: '100%', height: '200px', display: 'block' }} />;
};

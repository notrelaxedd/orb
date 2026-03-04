'use client';
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function BubbleMap({ groups, onSelectGroup }: { groups: any[], onSelectGroup: (g: any) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || groups.length === 0) return;
    const width = 800;
    const height = 600;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const simulation = d3.forceSimulation(groups)
      .force('charge', d3.forceManyBody().strength(15))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.r + 5));

    const nodeGroup = svg.append('g');

    const nodes = nodeGroup.selectAll('g')
      .data(groups)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (e: any, d: any) => onSelectGroup(d)) // FIX: Added explicit types
      .call(d3.drag()
        .on('start', (e: any, d: any) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }) // FIX: Added explicit types
        .on('drag', (e: any, d: any) => { d.fx = e.x; d.fy = e.y; }) // FIX: Added explicit types
        .on('end', (e: any, d: any) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }) as any); // FIX: Added explicit types

    nodes.append('circle')
      .attr('r', (d: any) => d.r)
      .attr('fill', (d: any) => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('transition', 'all 0.2s ease');

    nodes.append('text')
      .text((d: any) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .style('fill', '#fff')
      .style('font-size', (d: any) => Math.min(16, Math.max(10, d.r / 3)) + 'px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none');

    simulation.on('tick', () => {
      nodes.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [groups, onSelectGroup]);

  return <svg ref={svgRef} className="w-full h-full min-h-[600px]" />;
}

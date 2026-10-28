import { useEffect, useRef, useState } from 'react';
import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';

export type GraphNode = {
  id: string;
  name: string;
  path: string;
  kind: string;
  loc?: number;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  kind: string;
};

type AtlasGraphProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId?: string;
  highlightedIds?: string[];
  onSelect: (id: string) => void;
  depth: number;
  fitKey: number;
  resetKey: number;
  focusId?: string;
  focusKey: number;
};

function layoutOptions(depth: number) {
  return {
    name: 'breadthfirst' as const,
    directed: true,
    circle: false,
    grid: false,
    animate: false,
    fit: true,
    padding: 58,
    spacingFactor: 1.35 + Math.min(depth, 3) * 0.05,
    avoidOverlap: true,
    nodeDimensionsIncludeLabels: true,
  };
}

const theme = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      color: '#f2ebdd',
      'font-family': 'IBM Plex Mono, monospace',
      'font-size': 11,
      'font-weight': 500,
      'text-wrap': 'wrap',
      'text-max-width': 125,
      'text-valign': 'bottom',
      'text-margin-y': 9,
      'text-outline-color': '#1d1a18',
      'text-outline-width': 2,
      'background-color': '#af8c57',
      'border-color': '#f2ebdd',
      'border-width': 1,
      width: 18,
      height: 18,
      'overlay-opacity': 0,
    },
  },
  { selector: 'node[kind = "file"]', style: { shape: 'round-rectangle', width: 20, height: 20 } },
  { selector: 'node[kind = "module"]', style: { shape: 'diamond', 'background-color': '#7c8980', width: 24, height: 24 } },
  { selector: 'node[kind = "function"]', style: { shape: 'ellipse', 'background-color': '#8f3030', width: 15, height: 15 } },
  { selector: 'node:selected', style: { 'background-color': '#f2ebdd', 'border-color': '#d89a6c', 'border-width': 3, width: 25, height: 25, 'z-index': 10 } },
  { selector: 'node.faded', style: { opacity: 0.23, 'text-opacity': 0.35 } },
  { selector: 'node.search-hit', style: { 'border-color': '#d89a6c', 'border-width': 3, 'z-index': 9 } },
  {
    selector: 'edge',
    style: {
      width: 1.4,
      'line-color': '#7c8980',
      'target-arrow-color': '#7c8980',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'arrow-scale': 0.8,
      opacity: 0.66,
    },
  },
  { selector: 'edge[kind = "imports"]', style: { 'line-style': 'solid', 'line-color': '#af8c57', 'target-arrow-color': '#af8c57' } },
  { selector: 'edge[kind = "calls"]', style: { 'line-style': 'dashed', 'line-color': '#7c8980', 'target-arrow-color': '#7c8980' } },
  { selector: 'edge[kind = "other"]', style: { 'line-style': 'dotted', 'line-color': '#b99874', 'target-arrow-color': '#b99874' } },
  { selector: 'edge.faded', style: { opacity: 0.12 } },
  { selector: 'edge.highlighted', style: { width: 3, opacity: 1, 'z-index': 8 } },
] as const;

export function AtlasGraph({ nodes, edges, selectedId, highlightedIds = [], onSelect, depth, fitKey, resetKey, focusId, focusKey }: AtlasGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const lastResetKey = useRef(resetKey);
  const onSelectRef = useRef(onSelect);
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const nodesRef = useRef(nodes);
  onSelectRef.current = onSelect;
  nodesRef.current = nodes;

  useEffect(() => {
    if (!containerRef.current) return;
    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [...theme] as any,
      layout: layoutOptions(depth),
      minZoom: 0.35,
      maxZoom: 2.5,
      wheelSensitivity: 0.22,
      selectionType: 'single',
    });
    cyRef.current = cy;
    cy.on('tap', 'node', (event) => onSelectRef.current(String(event.target.id())));
    cy.on('mouseover', 'node', (event) => {
      setHovered(nodesRef.current.find((node) => node.id === String(event.target.id())) ?? null);
    });
    cy.on('mouseout', 'node', () => setHovered(null));
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      if (containerRef.current?.clientWidth && containerRef.current.clientHeight) cy.resize();
    });
    if (containerRef.current) resizeObserver?.observe(containerRef.current);
    return () => {
      resizeObserver?.disconnect();
      cy.destroy();
      cyRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    const allowed = new Set(nodes.map((node) => node.id));
    const visibleEdges = edges.filter((edge) => allowed.has(edge.source) && allowed.has(edge.target));
    const elements: ElementDefinition[] = [
      ...nodes.map((node) => ({ data: { id: node.id, label: node.name, path: node.path, kind: node.kind, loc: node.loc } })),
      ...visibleEdges.map((edge) => ({ data: { id: edge.id, source: edge.source, target: edge.target, kind: edge.kind } })),
    ];
    cy.elements().remove();
    cy.add(elements);
    cy.layout(layoutOptions(depth)).run();
  }, [nodes, edges, depth]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().unselect();
    const selected = cy.getElementById(selectedId ?? '');
    if (selected.length) selected.select();
    cy.elements().removeClass('faded search-hit highlighted');
    for (const id of highlightedIds) {
      const element = cy.getElementById(id);
      if (element.length) element.addClass('search-hit');
    }
    if (highlightedIds.length > 1) {
      cy.edges().forEach((edge) => {
        if (highlightedIds.includes(String(edge.source().id())) && highlightedIds.includes(String(edge.target().id()))) edge.addClass('highlighted');
      });
    }
  }, [selectedId, highlightedIds]);

  useEffect(() => {
    const cy = cyRef.current;
    const target = cy?.getElementById(focusId ?? '');
    if (cy && target?.length && focusKey > 0) cy.animate({ center: { eles: target }, duration: 180 });
  }, [focusId, focusKey]);

  useEffect(() => {
    const cy = cyRef.current;
    if (cy && fitKey > 0) cy.fit(cy.elements(), 48);
  }, [fitKey]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || resetKey <= lastResetKey.current) return;
    lastResetKey.current = resetKey;
    cy.layout(layoutOptions(depth)).run();
    cy.fit(cy.elements(), 48);
  }, [resetKey, depth, nodes, edges]);

  return (
    <div className="atlas-canvas-wrap">
      <div className="atlas-canvas" ref={containerRef} role="region" aria-label="Interactive dependency graph. Choose a file from the accessible file list to select and inspect a node." />
      <div className="graph-depth-marker" aria-hidden="true">DEPTH <strong>{depth}</strong></div>
      {hovered && <div className="graph-hover-card" aria-live="polite"><span>{hovered.kind}</span><strong>{hovered.path}</strong></div>}
      {!nodes.length && <div className="graph-empty">No graph nodes were returned for this view.</div>}
    </div>
  );
}

import cytoscape from 'cytoscape';

const NODE_COUNT = 600;
const EDGE_COUNT = 3000;
const cyContainer = document.querySelector('#cy');
const resultsElement = document.querySelector('#results');
const statusElement = document.querySelector('#status');
let cy;
let renderResult;

function makeElements() {
  const elements = [];
  const columns = 30;
  for (let i = 0; i < NODE_COUNT; i += 1) {
    elements.push({ data: { id: `n${i}`, label: `Node ${i}` }, position: { x: (i % columns) * 56, y: Math.floor(i / columns) * 48 } });
  }
  // Deterministic modular sequence. Edges are unique and exclude self-links.
  for (let i = 0; i < EDGE_COUNT; i += 1) {
    const source = i % NODE_COUNT;
    const target = (source + 1 + Math.floor(i / NODE_COUNT) * 17) % NODE_COUNT;
    elements.push({ data: { id: `e${i}`, source: `n${source}`, target: `n${target}` } });
  }
  return elements;
}

function summarize() {
  return {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
    graph: { nodes: cy.nodes().length, edges: cy.edges().length },
    render: renderResult,
    interactions: window.graphBenchmark.interactions,
    frameSample: window.graphBenchmark.frameSample || null,
    note: 'Elapsed action-call measurements; not FPS and not a frame-time measurement.'
  };
}

function show() {
  resultsElement.textContent = JSON.stringify(summarize(), null, 2);
}

function measure(name, action) {
  if (!cy) return;
  const start = performance.now();
  action();
  const elapsedMs = performance.now() - start;
  window.graphBenchmark.interactions.push({ action: name, elapsedMs: Number(elapsedMs.toFixed(3)) });
  show();
}

function build() {
  if (cy) cy.destroy();
  window.graphBenchmark = { interactions: [] };
  const elements = makeElements();
  const start = performance.now();
  cy = cytoscape({
    container: cyContainer,
    elements,
    layout: { name: 'preset', fit: true, padding: 24 },
    style: [
      { selector: 'node', style: { 'background-color': '#3976c5', label: 'data(label)', color: '#24334a', 'font-size': 7, width: 13, height: 13, 'text-valign': 'bottom', 'text-margin-y': 2 } },
      { selector: 'edge', style: { width: 0.7, 'line-color': '#aab8ca', 'curve-style': 'bezier', opacity: 0.65 } },
      { selector: ':selected', style: { 'background-color': '#ed8b35', 'line-color': '#ed8b35', 'border-width': 2, 'border-color': '#7d4212' } }
    ],
    minZoom: 0.05,
    maxZoom: 5,
    wheelSensitivity: 0.2,
    hideEdgesOnViewport: false,
    textureOnViewport: false
  });
  // Cytoscape's render event indicates the renderer has drawn; use elapsed time to this event.
  cy.one('render', () => {
    renderResult = { elapsedToFirstRenderMs: Number((performance.now() - start).toFixed(3)) };
    statusElement.textContent = `Ready · ${cy.nodes().length} nodes · ${cy.edges().length} edges`;
    show();
    if (new URLSearchParams(location.search).has('autofps')) { const button=document.querySelector('#fps'); button.disabled=false; setTimeout(() => button.click(), 200); }
  });
  // Fallback/report setup duration when render event is not emitted by a given renderer.
  setTimeout(() => {
    if (!renderResult) {
      renderResult = { elapsedToFirstRenderMs: null, setupElapsedMs: Number((performance.now() - start).toFixed(3)), note: 'No render event observed; setup time is not render time.' };
      statusElement.textContent = `Created · ${cy.nodes().length} nodes · ${cy.edges().length} edges`;
      show();
    }
  }, 3000);
}

window.graphBenchmark = { interactions: [] };
document.querySelector('#rerun').addEventListener('click', build);
document.querySelector('#pan').addEventListener('click', () => measure('panBy', () => cy.panBy({ x: 100, y: 60 })));
document.querySelector('#zoom').addEventListener('click', () => measure('zoomTo', () => cy.zoom({ level: Math.min(cy.zoom() * 1.2, 5), renderedPosition: { x: cyContainer.clientWidth / 2, y: cyContainer.clientHeight / 2 } })));
document.querySelector('#select').addEventListener('click', () => measure('select 100 nodes', () => { cy.$(':selected').unselect(); cy.nodes().slice(0, 100).select(); }));
document.querySelector('#fps').addEventListener('click', (event) => {
  if (!cy) return;
  const button=event.currentTarget;
  button.disabled=true;
  const intervals=[];let previous=null,frames=0,start=performance.now();
  function sample(timestamp){
    if(previous!==null){intervals.push(timestamp-previous);frames++;if(frames%30===0)cy.panBy({x:1,y:0});}
    previous=timestamp;
    if(timestamp-start<3000){requestAnimationFrame(sample);return;}
    const elapsed=timestamp-start,sorted=[...intervals].sort((a,b)=>a-b),percentile=p=>sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))]||0;
    window.graphBenchmark.frameSample={durationMs:Number(elapsed.toFixed(1)),frames,meanCallbacksPerSecond:Number((frames*1000/elapsed).toFixed(2)),medianFrameIntervalMs:Number(percentile(.5).toFixed(2)),p95FrameIntervalMs:Number(percentile(.95).toFixed(2)),note:'requestAnimationFrame callback cadence while applying a small pan every 30 callbacks; not a guarantee of displayed FPS or paint-complete latency'};
    button.disabled=false;show();
  }
  requestAnimationFrame(sample);
});
build();

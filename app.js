// DijkstraFlow - Main Application Coordinator

import { RoadGraph } from './graph.js';
import { SketchHandler } from './sketch.js';
import { runDijkstra, getEdgeWeight } from './dijkstra.js';

document.addEventListener('DOMContentLoaded', () => {

  const canvas = document.getElementById('main-canvas');
  const ctx = canvas.getContext('2d');

  const graph = new RoadGraph();
  const sketch = new SketchHandler(canvas);

  let currentMode = 'add-node';
  let mapTheme = 'blueprint';

  let activeNode = null;
  let activeEdge = null;
  let linkStartNode = null;
  let mousePos = { x: 0, y: 0 };

  let routeStartNode = null;
  let routeEndNode = null;
  let activeRouteData = null;

  let visitedAnimIndex = -1;
  let visitedAnimTimer = null;
  let showFinalPath = false;
  let vehicleProgress = 0;

  let sliderWeights = { dist: 1.0, beauty: 1.0, safety: 1.0, traffic: 1.0 };

  // ── UI References ──────────────────────────────────────
  const btnAddNode   = document.getElementById('btn-add-node');
  const btnAddEdge   = document.getElementById('btn-add-edge');
  const btnSketch    = document.getElementById('btn-sketch');
  const btnClear     = document.getElementById('btn-clear');
  const btnRunSim    = document.getElementById('btn-run-sim');
  const btnExplain   = document.getElementById('btn-explain');
  const instructionText    = document.getElementById('instruction-text');
  const canvasModeDisplay  = document.getElementById('canvas-mode-display');

  const selectStartNode = document.getElementById('select-start-node');
  const selectEndNode   = document.getElementById('select-end-node');
  const mapThemeSelect  = document.getElementById('map-theme-select');
  const canvasGridBg    = document.getElementById('canvas-grid-bg');

  const balancedWeightsSection = document.getElementById('balanced-weights-section');
  const sliderWDist    = document.getElementById('slider-w-dist');
  const sliderWBeauty  = document.getElementById('slider-w-beauty');
  const sliderWSafety  = document.getElementById('slider-w-safety');
  const sliderWTraffic = document.getElementById('slider-w-traffic');
  const valWDist       = document.getElementById('val-w-dist');
  const valWBeauty     = document.getElementById('val-w-beauty');
  const valWSafety     = document.getElementById('val-w-safety');
  const valWTraffic    = document.getElementById('val-w-traffic');

  const edgeEditorSection  = document.getElementById('edge-editor-section');
  const nodeEditorSection  = document.getElementById('node-editor-section');
  const editRoadLabel      = document.getElementById('edit-road-label');
  const editNodeLabel      = document.getElementById('edit-node-label');
  const sliderEdgeDist     = document.getElementById('slider-edge-dist');
  const sliderEdgeBeauty   = document.getElementById('slider-edge-beauty');
  const sliderEdgeSafety   = document.getElementById('slider-edge-safety');
  const sliderEdgeTraffic  = document.getElementById('slider-edge-traffic');
  const selectEdgeCondition = document.getElementById('select-edge-condition');
  const valEdgeDist    = document.getElementById('val-edge-dist');
  const valEdgeBeauty  = document.getElementById('val-edge-beauty');
  const valEdgeSafety  = document.getElementById('val-edge-safety');
  const valEdgeTraffic = document.getElementById('val-edge-traffic');
  const btnDeleteEdge  = document.getElementById('btn-delete-edge');
  const inputNodeName  = document.getElementById('input-node-name');
  const btnDeleteNode  = document.getElementById('btn-delete-node');

  const statDistance = document.getElementById('stat-distance');
  const statBeauty   = document.getElementById('stat-beauty');
  const statSafety   = document.getElementById('stat-safety');
  const statTime     = document.getElementById('stat-time');
  const aiRecommendationText = document.getElementById('ai-recommendation-text');
  const toastNotification    = document.getElementById('toast-notification');

  const explainModal  = document.getElementById('explain-modal');
  const modalTitle    = document.getElementById('modal-route-title');
  const modalBody     = document.getElementById('modal-body-content');
  const btnCloseModal = document.getElementById('btn-close-modal');

  // ── Canvas Resize ──────────────────────────────────────
  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width  = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // ── Tool Mode ──────────────────────────────────────────
  function setToolMode(mode) {
    currentMode = mode;
    // Do NOT clear activeNode/activeEdge here — let editors persist
    linkStartNode = null;

    [btnAddNode, btnAddEdge, btnSketch].forEach(b => b.classList.remove('active'));

    if (mode === 'add-node') {
      btnAddNode.classList.add('active');
      instructionText.textContent = 'Click anywhere to place road junctions. Drag nodes to move them.';
      canvasModeDisplay.textContent = 'ADD JUNCTION';
      canvas.style.cursor = 'crosshair';
    } else if (mode === 'add-edge') {
      btnAddEdge.classList.add('active');
      instructionText.textContent = 'Drag from one junction to another to create a road. The tool stays active — keep linking!';
      canvasModeDisplay.textContent = 'LINK ROADS';
      canvas.style.cursor = 'default';
    } else if (mode === 'sketch') {
      btnSketch.classList.add('active');
      instructionText.textContent = 'Draw roads freehand. Stop drawing for 1.2s and the sketch auto-converts to a graph.';
      canvasModeDisplay.textContent = 'SKETCH MODE';
      canvas.style.cursor = 'crosshair';
    }
  }

  btnAddNode.addEventListener('click', () => setToolMode('add-node'));
  btnAddEdge.addEventListener('click', () => setToolMode('add-edge'));
  btnSketch.addEventListener('click',  () => setToolMode('sketch'));

  // ── Map Theme ──────────────────────────────────────────
  mapThemeSelect.addEventListener('change', (e) => {
    mapTheme = e.target.value;
    canvasGridBg.className = 'canvas-bg';
    if (mapTheme === 'blueprint')  canvasGridBg.classList.add('grid-mode');
    else if (mapTheme === 'satellite') canvasGridBg.classList.add('satellite-mode');
    else if (mapTheme === 'minimal')   canvasGridBg.classList.add('minimal-mode');
  });

  // ── Balanced Weights ───────────────────────────────────
  function updateSliderWeights() {
    sliderWeights.dist    = parseFloat(sliderWDist.value);
    sliderWeights.beauty  = parseFloat(sliderWBeauty.value);
    sliderWeights.safety  = parseFloat(sliderWSafety.value);
    sliderWeights.traffic = parseFloat(sliderWTraffic.value);
    valWDist.textContent    = sliderWeights.dist.toFixed(1);
    valWBeauty.textContent  = sliderWeights.beauty.toFixed(1);
    valWSafety.textContent  = sliderWeights.safety.toFixed(1);
    valWTraffic.textContent = sliderWeights.traffic.toFixed(1);
    recalculateRoute();
  }
  [sliderWDist, sliderWBeauty, sliderWSafety, sliderWTraffic].forEach(s => s.addEventListener('input', updateSliderWeights));

  // ── Routing Mode Radio Buttons ─────────────────────────
  document.querySelectorAll('input[name="routing-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('active'));
      e.target.closest('.radio-card').classList.add('active');

      if (e.target.value === 'balanced') {
        balancedWeightsSection.classList.remove('hidden');
      } else {
        balancedWeightsSection.classList.add('hidden');
      }
      recalculateRoute();
    });
  });

  // ── Node Dropdowns ─────────────────────────────────────
  function populateNodeDropdowns() {
    const startVal = selectStartNode.value;
    const endVal   = selectEndNode.value;
    selectStartNode.innerHTML = '<option value="">- Select -</option>';
    selectEndNode.innerHTML   = '<option value="">- Select -</option>';

    const sorted = [...graph.nodes].sort((a, b) => a.label.localeCompare(b.label));
    for (const node of sorted) {
      const oS = document.createElement('option');
      oS.value = node.id; oS.textContent = `Junction ${node.label}`;
      selectStartNode.appendChild(oS);
      const oE = document.createElement('option');
      oE.value = node.id; oE.textContent = `Junction ${node.label}`;
      selectEndNode.appendChild(oE);
    }

    if (graph.getNodeById(startVal)) selectStartNode.value = startVal;
    if (graph.getNodeById(endVal))   selectEndNode.value   = endVal;

    routeStartNode = graph.getNodeById(selectStartNode.value);
    routeEndNode   = graph.getNodeById(selectEndNode.value);
    btnRunSim.disabled = !routeStartNode || !routeEndNode;
  }

  selectStartNode.addEventListener('change', () => {
    routeStartNode = graph.getNodeById(selectStartNode.value);
    btnRunSim.disabled = !routeStartNode || !routeEndNode;
    resetRouteCalculation();
  });

  selectEndNode.addEventListener('change', () => {
    routeEndNode = graph.getNodeById(selectEndNode.value);
    btnRunSim.disabled = !routeStartNode || !routeEndNode;
    resetRouteCalculation();
  });

  // ── Reset ──────────────────────────────────────────────
  btnClear.addEventListener('click', () => {
    if (confirm('Reset layout? This clears all junctions, roads, and routes.')) {
      graph.clear();
      activeNode = null; activeEdge = null;
      resetRouteCalculation();
      populateNodeDropdowns();
      updateHUDStats();
      updateEditorsVisibility();
    }
  });

  function resetRouteCalculation() {
    if (visitedAnimTimer) clearInterval(visitedAnimTimer);
    visitedAnimIndex = -1;
    showFinalPath    = false;
    activeRouteData  = null;
    vehicleProgress  = 0;
    statDistance.textContent = '--';
    statBeauty.textContent   = '--';
    statSafety.textContent   = '--';
    statTime.textContent     = '--';
    document.getElementById('hud-active-path').textContent = 'NONE';
    resetAnalysisMatrix();
    aiRecommendationText.textContent = 'Grid idle. Place junctions and connect roads to generate routing recommendations.';
  }

  function resetAnalysisMatrix() {
    ['shortest','safest','scenic','balanced'].forEach(m => {
      const row = document.getElementById(`row-${m}`);
      row.querySelector('.stat-c-dist').textContent   = '--';
      row.querySelector('.stat-c-safe').textContent   = '--';
      row.querySelector('.stat-c-scenic').textContent = '--';
      row.querySelector('.stat-c-time').textContent   = '--';
      row.classList.remove('active-row');
    });
  }

  // ── Editors — NO tool-mode reset ──────────────────────
  function selectEdgeForEditing(edge) {
    activeEdge = edge;
    activeNode = null;
    // *** GLITCH FIX: do NOT call setToolMode here ***
    updateEditorsVisibility();
  }

  function selectNodeForEditing(node) {
    activeNode = node;
    activeEdge = null;
    // *** GLITCH FIX: do NOT call setToolMode here ***
    updateEditorsVisibility();
  }

  function updateEditorsVisibility() {
    if (activeEdge) {
      edgeEditorSection.classList.remove('hidden');
      nodeEditorSection.classList.add('hidden');
      editRoadLabel.textContent = `ROAD ${activeEdge.source.label} → ${activeEdge.target.label}`;
      sliderEdgeDist.value    = activeEdge.distance;
      sliderEdgeBeauty.value  = activeEdge.beauty;
      sliderEdgeSafety.value  = activeEdge.safety;
      sliderEdgeTraffic.value = activeEdge.traffic;
      selectEdgeCondition.value = activeEdge.condition;
      valEdgeDist.textContent    = activeEdge.distance;
      valEdgeBeauty.textContent  = `${activeEdge.beauty}/10`;
      valEdgeSafety.textContent  = `${activeEdge.safety}/10`;
      valEdgeTraffic.textContent = `${activeEdge.traffic}/10`;
    } else if (activeNode) {
      edgeEditorSection.classList.add('hidden');
      nodeEditorSection.classList.remove('hidden');
      editNodeLabel.textContent = `JUNCTION ${activeNode.label}`;
      inputNodeName.value = activeNode.label;
    } else {
      edgeEditorSection.classList.add('hidden');
      nodeEditorSection.classList.add('hidden');
    }
  }

  // ── Edge Editor Listeners ──────────────────────────────
  sliderEdgeDist.addEventListener('input', () => {
    if (activeEdge) { activeEdge.distance = parseInt(sliderEdgeDist.value); valEdgeDist.textContent = activeEdge.distance; recalculateRoute(); }
  });
  sliderEdgeBeauty.addEventListener('input', () => {
    if (activeEdge) { activeEdge.beauty = parseInt(sliderEdgeBeauty.value); valEdgeBeauty.textContent = `${activeEdge.beauty}/10`; recalculateRoute(); }
  });
  sliderEdgeSafety.addEventListener('input', () => {
    if (activeEdge) { activeEdge.safety = parseInt(sliderEdgeSafety.value); valEdgeSafety.textContent = `${activeEdge.safety}/10`; recalculateRoute(); }
  });
  sliderEdgeTraffic.addEventListener('input', () => {
    if (activeEdge) { activeEdge.traffic = parseInt(sliderEdgeTraffic.value); valEdgeTraffic.textContent = `${activeEdge.traffic}/10`; recalculateRoute(); }
  });
  selectEdgeCondition.addEventListener('change', () => {
    if (activeEdge) { activeEdge.condition = selectEdgeCondition.value; recalculateRoute(); }
  });
  btnDeleteEdge.addEventListener('click', () => {
    if (activeEdge) { graph.deleteEdge(activeEdge.id); activeEdge = null; updateEditorsVisibility(); resetRouteCalculation(); updateHUDStats(); }
  });

  // ── Node Editor Listeners ──────────────────────────────
  inputNodeName.addEventListener('input', () => {
    if (activeNode) {
      const newLabel = inputNodeName.value.trim().toUpperCase();
      if (newLabel && !graph.nodes.some(n => n.id !== activeNode.id && n.label === newLabel)) {
        activeNode.label = newLabel;
        editNodeLabel.textContent = `JUNCTION ${newLabel}`;
        populateNodeDropdowns();
      }
    }
  });
  btnDeleteNode.addEventListener('click', () => {
    if (activeNode) { graph.deleteNode(activeNode.id); activeNode = null; updateEditorsVisibility(); resetRouteCalculation(); populateNodeDropdowns(); updateHUDStats(); }
  });

  // ── Route Calculation ──────────────────────────────────
  function recalculateRoute() {
    if (!routeStartNode || !routeEndNode) return;
    calculateAllComparisonRoutes();
    const mode = document.querySelector('input[name="routing-mode"]:checked').value;
    const res  = runDijkstra(graph, routeStartNode, routeEndNode, mode, sliderWeights);
    if (res) {
      activeRouteData = res;
      if (showFinalPath) updateStatsPanel(res);
    } else {
      activeRouteData = null;
      resetRouteCalculation();
    }
  }

  function calculateAllComparisonRoutes() {
    const mode = document.querySelector('input[name="routing-mode"]:checked').value;
    ['shortest','safest','scenic','balanced'].forEach(m => {
      const res = runDijkstra(graph, routeStartNode, routeEndNode, m, sliderWeights);
      const row = document.getElementById(`row-${m}`);
      if (res) {
        row.querySelector('.stat-c-dist').textContent   = `${res.totalDistance}km`;
        row.querySelector('.stat-c-safe').textContent   = `${res.avgSafety}/10`;
        row.querySelector('.stat-c-scenic').textContent = `${res.avgBeauty}/10`;
        row.querySelector('.stat-c-time').textContent   = `${Math.round(res.totalTime)}m`;
        row.classList.toggle('active-row', m === mode);
      } else {
        row.querySelector('.stat-c-dist').textContent   = '--';
        row.querySelector('.stat-c-safe').textContent   = '--';
        row.querySelector('.stat-c-scenic').textContent = '--';
        row.querySelector('.stat-c-time').textContent   = '--';
        row.classList.remove('active-row');
      }
    });
    generateAIRecommendation();
  }

  function generateAIRecommendation() {
    if (!routeStartNode || !routeEndNode) return;
    const rShort  = runDijkstra(graph, routeStartNode, routeEndNode, 'shortest',  sliderWeights);
    const rSafe   = runDijkstra(graph, routeStartNode, routeEndNode, 'safest',    sliderWeights);
    const rScenic = runDijkstra(graph, routeStartNode, routeEndNode, 'scenic',    sliderWeights);

    if (!rShort) {
      aiRecommendationText.innerHTML = `⚠️ No path found between Junction <b>${routeStartNode.label}</b> and <b>${routeEndNode.label}</b>. Connect more roads.`;
      return;
    }
    let text = `Routing from <b>${routeStartNode.label}</b> → <b>${routeEndNode.label}</b>:<br>`;
    text += `• ⚡ Shortest: <b>${rShort.totalDistance}km</b> in <b>${Math.round(rShort.totalTime)} min</b><br>`;
    if (rSafe && rSafe.totalDistance !== rShort.totalDistance)
      text += `• 🛡️ Safest adds <b>${rSafe.totalDistance - rShort.totalDistance}km</b> but safety ↑ to <b>${rSafe.avgSafety}/10</b><br>`;
    if (rScenic && rScenic.totalDistance !== rShort.totalDistance)
      text += `• 🌸 Scenic achieves beauty <b>${rScenic.avgBeauty}/10</b> in <b>${Math.round(rScenic.totalTime)} min</b><br>`;
    aiRecommendationText.innerHTML = text;
  }

  // ── Run Simulation ─────────────────────────────────────
  btnRunSim.addEventListener('click', () => {
    if (!routeStartNode || !routeEndNode) return;
    if (visitedAnimTimer) clearInterval(visitedAnimTimer);
    calculateAllComparisonRoutes();
    const mode = document.querySelector('input[name="routing-mode"]:checked').value;
    const res  = runDijkstra(graph, routeStartNode, routeEndNode, mode, sliderWeights);
    if (res) {
      activeRouteData  = res;
      showFinalPath    = false;
      visitedAnimIndex = 0;
      vehicleProgress  = 0;
      btnRunSim.disabled = true;
      visitedAnimTimer = setInterval(() => {
        visitedAnimIndex++;
        if (visitedAnimIndex >= res.visited.length) {
          clearInterval(visitedAnimTimer);
          visitedAnimTimer = null;
          showFinalPath    = true;
          btnRunSim.disabled = false;
          updateStatsPanel(res);
        }
      }, 100);
    }
  });

  function updateStatsPanel(res) {
    statDistance.textContent = `${res.totalDistance} km`;
    statBeauty.textContent   = `${res.avgBeauty} / 10`;
    statSafety.textContent   = `${res.avgSafety} / 10`;
    statTime.textContent     = `${Math.round(res.totalTime)} mins`;
    document.getElementById('hud-active-path').textContent = res.path.map(n => n.label).join(' → ');
  }

  // ── HUD Stats ──────────────────────────────────────────
  function updateHUDStats() {
    document.getElementById('hud-total-nodes').textContent = graph.nodes.length;
    document.getElementById('hud-total-edges').textContent = graph.edges.length;
  }

  // ── Toast ──────────────────────────────────────────────
  function showToast(msg) {
    toastNotification.textContent = msg;
    toastNotification.classList.remove('hidden');
    setTimeout(() => toastNotification.classList.add('hidden'), 3000);
  }

  // ── Algorithm Explainer Modal ──────────────────────────
  btnExplain.addEventListener('click', () => {
    openExplainerModal();
  });

  btnCloseModal.addEventListener('click', () => {
    explainModal.classList.add('hidden');
  });

  explainModal.addEventListener('click', (e) => {
    if (e.target === explainModal) explainModal.classList.add('hidden');
  });

  function openExplainerModal() {
    const mode = document.querySelector('input[name="routing-mode"]:checked').value;
    modalTitle.textContent = `ALGORITHM EXPLAINER — ${mode.toUpperCase()} MODE`;
    modalBody.innerHTML = '';

    // 1. Formula section
    const formulaBox = document.createElement('div');
    formulaBox.className = 'explain-formula-box';

    let formulaTitle = '', formulaMath = '', formulaDesc = '';

    if (mode === 'shortest') {
      formulaTitle = '⚡ Shortest Path (Standard Dijkstra)';
      formulaMath  = 'Cost(edge) = distance';
      formulaDesc  = 'Dijkstra\'s algorithm finds the path with the minimum total distance. Starting from your source junction, it greedily picks the unvisited junction with the lowest accumulated cost, relaxes its neighbors, and repeats until the destination is reached.';
    } else if (mode === 'safest') {
      formulaTitle = '🛡️ Safest Route (Safety-Weighted Dijkstra)';
      formulaMath  = 'Cost(edge) = distance × (11 − safety)';
      formulaDesc  = 'Safety is rated 1–10. A road with safety=10 has multiplier ×1 (no penalty). A road with safety=1 has multiplier ×10 (very expensive). The algorithm is biased to choose safer roads even if slightly longer.';
    } else if (mode === 'scenic') {
      formulaTitle = '🌸 Scenic Route (Beauty-Weighted Dijkstra)';
      formulaMath  = 'Cost(edge) = distance × (11 − beauty)';
      formulaDesc  = 'Beauty is rated 1–10. Highly beautiful roads are treated as "shorter" in the algorithm\'s eyes, so the optimizer naturally prefers scenic corridors. A beauty=10 road has multiplier ×1; beauty=1 has multiplier ×10.';
    } else if (mode === 'balanced') {
      formulaTitle = '⚖️ Balanced Route (Multi-Parameter Dijkstra)';
      formulaMath  = `Cost(edge) = d × (w₁ + w₂×(11−b)/3 + w₃×(11−s)/3 + w₄×t/3)`;
      formulaDesc  = `Combines all four parameters with your custom weights:\n• d = distance, b = beauty, s = safety, t = traffic\n• w₁=${sliderWeights.dist}, w₂=${sliderWeights.beauty}, w₃=${sliderWeights.safety}, w₄=${sliderWeights.traffic}\nThis lets you tune the trade-off between speed, safety, scenery, and traffic avoidance.`;
    }

    formulaBox.innerHTML = `
      <div class="explain-formula-title">${formulaTitle}</div>
      <div class="explain-formula-math">${formulaMath}</div>
      <div class="explain-formula-desc">${formulaDesc.replace(/\n/g, '<br>')}</div>
    `;
    modalBody.appendChild(formulaBox);

    // 2. Step-by-step path breakdown (only if a route is computed)
    if (!routeStartNode || !routeEndNode) {
      const note = document.createElement('div');
      note.className = 'explain-no-route';
      note.textContent = '⚠️ No route computed yet. Select START and DEST junctions and click RUN DIJKSTRA first.';
      modalBody.appendChild(note);
      explainModal.classList.remove('hidden');
      return;
    }

    const res = runDijkstra(graph, routeStartNode, routeEndNode, mode, sliderWeights);

    if (!res || res.path.length < 2) {
      const note = document.createElement('div');
      note.className = 'explain-no-route';
      note.textContent = '⚠️ No valid path found between these junctions. Add more connecting roads.';
      modalBody.appendChild(note);
      explainModal.classList.remove('hidden');
      return;
    }

    // Step-by-step table
    const stepBox = document.createElement('div');
    stepBox.className = 'explain-formula-box';
    stepBox.innerHTML = `<div class="explain-formula-title">📊 Step-by-Step Path Cost Breakdown</div>`;

    const table = document.createElement('table');
    table.className = 'explain-steps-table';
    table.innerHTML = `
      <thead>
        <tr>
          <th>#</th>
          <th>Segment</th>
          <th>Dist (km)</th>
          <th>Safety</th>
          <th>Beauty</th>
          <th>Traffic</th>
          <th>Edge Cost</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody id="explain-steps-body"></tbody>
    `;

    let runningTotal = 0;
    const tbody = table.querySelector('#explain-steps-body');

    for (let i = 0; i < res.path.length - 1; i++) {
      const u = res.path[i];
      const v = res.path[i + 1];
      const edge = res.edges[i];
      if (!edge) continue;

      const rawCost = getEdgeWeight(edge, mode, sliderWeights);
      runningTotal += rawCost;

      let costFormula = '';
      if (mode === 'shortest') {
        costFormula = `${edge.distance}`;
      } else if (mode === 'safest') {
        costFormula = `${edge.distance} × ${11 - edge.safety} = ${(edge.distance * (11 - edge.safety)).toFixed(1)}`;
      } else if (mode === 'scenic') {
        costFormula = `${edge.distance} × ${11 - edge.beauty} = ${(edge.distance * (11 - edge.beauty)).toFixed(1)}`;
      } else {
        costFormula = rawCost.toFixed(2);
      }

      const tr = document.createElement('tr');
      tr.className = 'path-row';
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${u.label} → ${v.label}</td>
        <td>${edge.distance}</td>
        <td>${edge.safety}/10</td>
        <td>${edge.beauty}/10</td>
        <td>${edge.traffic}/10</td>
        <td>${costFormula}</td>
        <td>${runningTotal.toFixed(1)}</td>
      `;
      tbody.appendChild(tr);
    }

    stepBox.appendChild(table);
    modalBody.appendChild(stepBox);

    // Summary stat box
    const summaryBox = document.createElement('div');
    summaryBox.className = 'explain-formula-box';
    summaryBox.innerHTML = `
      <div class="explain-formula-title">✅ Final Route Summary: ${res.path.map(n => n.label).join(' → ')}</div>
      <div class="explain-formula-desc">
        <b>Total Distance:</b> ${res.totalDistance} km &nbsp;|&nbsp;
        <b>Avg Safety:</b> ${res.avgSafety}/10 &nbsp;|&nbsp;
        <b>Avg Beauty:</b> ${res.avgBeauty}/10 &nbsp;|&nbsp;
        <b>Est. Travel Time:</b> ${Math.round(res.totalTime)} mins
      </div>
    `;
    modalBody.appendChild(summaryBox);

    explainModal.classList.remove('hidden');
  }

  // ── Mouse Interaction on Canvas ───────────────────────
  let isDraggingNode = false;
  let dragTargetNode = null;

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (currentMode === 'sketch') { sketch.startDrawing(mx, my); return; }

    const clickedNode = graph.nodes.find(n => n.isPointInside(mx, my));

    if (clickedNode) {
      if (currentMode === 'add-node') {
        isDraggingNode = true;
        dragTargetNode = clickedNode;
        clickedNode.isDragging = true;
        selectNodeForEditing(clickedNode);
      } else if (currentMode === 'add-edge') {
        linkStartNode = clickedNode;
      }
    } else {
      const clickedEdge = graph.edges.find(e => e.isPointNear(mx, my));
      if (clickedEdge) {
        selectEdgeForEditing(clickedEdge);
      } else {
        activeNode = null;
        activeEdge = null;
        updateEditorsVisibility();
        if (currentMode === 'add-node') {
          const node = graph.addNode(mx, my);
          selectNodeForEditing(node);
          populateNodeDropdowns();
          updateHUDStats();
        }
      }
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    mousePos = { x: mx, y: my };

    if (currentMode === 'sketch') { sketch.draw(mx, my); return; }

    if (isDraggingNode && dragTargetNode) {
      dragTargetNode.x = mx;
      dragTargetNode.y = my;
      recalculateRoute();
      return;
    }

    let nodeHovered = false;
    for (const node of graph.nodes) {
      node.isHovered = node.isPointInside(mx, my);
      if (node.isHovered) nodeHovered = true;
    }
    for (const edge of graph.edges) {
      edge.isHovered = !nodeHovered && edge.isPointNear(mx, my);
    }
  });

  canvas.addEventListener('mouseup', () => {
    if (currentMode === 'sketch') { sketch.endDrawing(); return; }

    if (isDraggingNode && dragTargetNode) {
      dragTargetNode.isDragging = false;
      isDraggingNode = false;
      dragTargetNode = null;
    }

    if (currentMode === 'add-edge' && linkStartNode) {
      const targetNode = graph.nodes.find(n => n.isPointInside(mousePos.x, mousePos.y));
      if (targetNode && targetNode.id !== linkStartNode.id) {
        const edge = graph.addEdge(linkStartNode, targetNode);
        if (edge) {
          selectEdgeForEditing(edge);
          showToast(`🔗 Road ${edge.source.label} → ${edge.target.label} created! (Safety: ${edge.safety}/10, Beauty: ${edge.beauty}/10)`);
        }
        updateHUDStats();
        recalculateRoute();
      }
      linkStartNode = null;
      // *** GLITCH FIX: do NOT reset the tool mode — stay in 'add-edge' ***
    }
  });

  // ── Sketch Processor ───────────────────────────────────
  sketch.onSketchProcessed = (clusters, strokes) => {
    for (const cl of clusters) graph.addNode(cl.x, cl.y);

    for (const stroke of strokes) {
      if (stroke.length < 2) continue;
      const startPt = stroke[0];
      const endPt   = stroke[stroke.length - 1];
      let closestStart = null, closestEnd = null;
      let startMin = Infinity, endMin = Infinity;
      for (const node of graph.nodes) {
        const dS = Math.hypot(node.x - startPt.x, node.y - startPt.y);
        const dE = Math.hypot(node.x - endPt.x,   node.y - endPt.y);
        if (dS < startMin && dS < 60) { startMin = dS; closestStart = node; }
        if (dE < endMin   && dE < 60) { endMin   = dE; closestEnd   = node; }
      }
      if (closestStart && closestEnd && closestStart.id !== closestEnd.id)
        graph.addEdge(closestStart, closestEnd);
    }

    populateNodeDropdowns();
    updateHUDStats();
    recalculateRoute();
    showToast('✍️ Sketch parsed! Graph generated from your drawing.');
  };

  // ── Render Loop ────────────────────────────────────────
  function renderLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const mode = document.querySelector('input[name="routing-mode"]:checked')?.value || 'shortest';
    let heatmapMode = 'normal';
    if (mode === 'safest')   heatmapMode = 'safety';
    else if (mode === 'scenic')   heatmapMode = 'beauty';
    else if (mode === 'balanced') heatmapMode = 'traffic';

    // Draw edges
    for (const edge of graph.edges) {
      const isInPath = showFinalPath && activeRouteData && activeRouteData.edges.some(e => e.id === edge.id);
      edge.draw(ctx, isInPath, heatmapMode);
    }

    // Rubber-band link line
    if (currentMode === 'add-edge' && linkStartNode) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(linkStartNode.x, linkStartNode.y);
      ctx.lineTo(mousePos.x, mousePos.y);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.restore();
    }

    // Sketch strokes
    if (currentMode === 'sketch') sketch.drawStrokes(ctx);

    // Draw nodes
    for (const node of graph.nodes) {
      const isStart = routeStartNode && routeStartNode.id === node.id;
      const isEnd   = routeEndNode   && routeEndNode.id   === node.id;
      const isInPath = showFinalPath && activeRouteData && activeRouteData.path.some(n => n.id === node.id);
      let isVisited = false;
      if (visitedAnimIndex >= 0 && activeRouteData) {
        isVisited = activeRouteData.visited.slice(0, visitedAnimIndex).some(n => n.id === node.id);
      }
      node.draw(ctx, isStart, isEnd, isInPath, isVisited);
    }

    // Vehicle animation
    if (showFinalPath && activeRouteData && activeRouteData.edges.length > 0) {
      ctx.save();
      const pathNodes = activeRouteData.path;
      const edgeIndex = Math.floor(vehicleProgress);
      const fraction  = vehicleProgress - edgeIndex;
      if (edgeIndex < pathNodes.length - 1) {
        const u = pathNodes[edgeIndex];
        const v = pathNodes[edgeIndex + 1];
        const vx = u.x + (v.x - u.x) * fraction;
        const vy = u.y + (v.y - u.y) * fraction;
        // Flat shadow
        ctx.beginPath();
        ctx.arc(vx + 3, vy + 3, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#000000'; ctx.fill();
        // White circle
        ctx.beginPath();
        ctx.arc(vx, vy, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = 2.5;
        ctx.fill(); ctx.stroke();
        // Crosshair
        ctx.beginPath();
        ctx.moveTo(vx - 4, vy); ctx.lineTo(vx + 4, vy);
        ctx.moveTo(vx, vy - 4); ctx.lineTo(vx, vy + 4);
        ctx.strokeStyle = '#000000'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.restore();
      vehicleProgress += 0.02;
      if (vehicleProgress >= pathNodes.length - 1) vehicleProgress = 0;
    }

    requestAnimationFrame(renderLoop);
  }

  // ── Seed Default Network ───────────────────────────────
  function seedDefaultNetwork() {
    const pts = [
      { x: 150, y: 220 }, { x: 340, y: 120 }, { x: 300, y: 320 },
      { x: 530, y: 140 }, { x: 480, y: 330 }
    ];
    const ns = pts.map(p => graph.addNode(p.x, p.y));

    const roads = [
      [0,1, 14,3,8,6,'asphalt'], [0,2, 10,7,4,2,'concrete'],
      [1,3, 22,4,9,5,'asphalt'], [2,4, 18,8,3,1,'gravel'],
      [1,2, 12,5,6,4,'asphalt'], [3,4, 15,9,8,2,'concrete'],
      [2,3, 25,6,7,3,'dirt']
    ];
    roads.forEach(([u,v,d,b,s,t,c]) => {
      const e = graph.addEdge(ns[u], ns[v]);
      if (e) { e.distance=d; e.beauty=b; e.safety=s; e.traffic=t; e.condition=c; }
    });

    populateNodeDropdowns();
    updateHUDStats();

    if (graph.nodes.length >= 5) {
      selectStartNode.value = graph.nodes[0].id;
      selectEndNode.value   = graph.nodes[4].id;
      routeStartNode = graph.nodes[0];
      routeEndNode   = graph.nodes[4];
      btnRunSim.disabled = false;
      recalculateRoute();
    }
  }

  seedDefaultNetwork();
  renderLoop();
  setToolMode('add-node');
});

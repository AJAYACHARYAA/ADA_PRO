// Dijkstra's Algorithm Implementation with Custom Cost Functions

// Compute speed and travel time for an edge
function calculateEdgeTravelTime(edge) {
  // Base speed: 60 km/h
  // Traffic reduces speed: traffic 1 -> -0 km/h, traffic 10 -> -45 km/h
  let baseSpeed = 70 - (edge.traffic * 5); // 20 km/h to 65 km/h
  baseSpeed = Math.max(15, baseSpeed); // minimum 15 km/h

  // Surface multiplier
  let surfaceMultiplier = 1.0;
  if (edge.condition === 'concrete') surfaceMultiplier = 0.95;
  else if (edge.condition === 'gravel') surfaceMultiplier = 0.65;
  else if (edge.condition === 'dirt') surfaceMultiplier = 0.45;

  const actualSpeed = baseSpeed * surfaceMultiplier;
  
  // Time in hours = distance / speed
  // Time in minutes = (distance / speed) * 60
  const timeMinutes = (edge.distance / actualSpeed) * 60;
  return timeMinutes;
}

// Compute dynamic weights for the Dijkstra priorities
function getEdgeWeight(edge, mode, weights) {
  const d = edge.distance;
  const b = edge.beauty;  // 1-10
  const s = edge.safety;  // 1-10
  const t = edge.traffic; // 1-10

  switch (mode) {
    case 'shortest':
      return d;
      
    case 'safest':
      // Safety penalty: lower safety rating increases path cost significantly
      // Max safety (10) -> multiplier 1
      // Min safety (1) -> multiplier 10
      return d * (11 - s);
      
    case 'scenic':
      // Scenic penalty: lower beauty rating increases path cost
      // Max beauty (10) -> multiplier 1
      // Min beauty (1) -> multiplier 10
      return d * (11 - b);
      
    case 'balanced':
      // Retrieve slider weights
      const wDist = weights ? parseFloat(weights.dist) : 1.0;
      const wBeauty = weights ? parseFloat(weights.beauty) : 1.0;
      const wSafety = weights ? parseFloat(weights.safety) : 1.0;
      const wTraffic = weights ? parseFloat(weights.traffic) : 1.0;

      const fDist = wDist * 1.0;
      const fBeauty = wBeauty * ((11 - b) / 3);
      const fSafety = wSafety * ((11 - s) / 3);
      const fTraffic = wTraffic * (t / 3);

      const multiplier = Math.max(0.1, fDist + fBeauty + fSafety + fTraffic);
      return d * multiplier;

    default:
      return d;
  }
}

// Find path using Dijkstra
function runDijkstra(graph, startNode, endNode, mode, weights) {
  if (!startNode || !endNode) return null;
  if (startNode.id === endNode.id) {
    return {
      path: [startNode],
      edges: [],
      visited: [startNode],
      totalDistance: 0,
      avgSafety: 10,
      avgBeauty: 10,
      totalTime: 0
    };
  }

  const nodes = graph.nodes;
  const edges = graph.edges;

  // Initialize data structures
  const distances = {};
  const previous = {};
  const visitedNodesOrder = []; // Track sequence of visited nodes for animations
  const queue = new Set();

  for (const node of nodes) {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    queue.add(node);
  }

  distances[startNode.id] = 0;

  while (queue.size > 0) {
    // Find node with minimum distance in queue
    let currentNode = null;
    let minDistance = Infinity;

    for (const node of queue) {
      if (distances[node.id] < minDistance) {
        minDistance = distances[node.id];
        currentNode = node;
      }
    }

    if (currentNode === null) break; // Unreachable
    if (currentNode.id === endNode.id) break; // Destination reached

    queue.delete(currentNode);
    visitedNodesOrder.push(currentNode);

    // Get neighbors of currentNode
    const neighbors = [];
    const connectedEdges = edges.filter(e => e.source.id === currentNode.id || e.target.id === currentNode.id);

    for (const edge of connectedEdges) {
      const neighbor = edge.source.id === currentNode.id ? edge.target : edge.source;
      if (queue.has(neighbor)) {
        const weight = getEdgeWeight(edge, mode, weights);
        neighbors.push({ node: neighbor, edge: edge, weight: weight });
      }
    }

    // Relax neighbors
    for (const { node, weight } of neighbors) {
      const alt = distances[currentNode.id] + weight;
      if (alt < distances[node.id]) {
        distances[node.id] = alt;
        previous[node.id] = currentNode;
      }
    }
  }

  // Reconstruct path
  const path = [];
  let curr = endNode;
  if (previous[curr.id] !== null || curr.id === startNode.id) {
    while (curr !== null) {
      path.unshift(curr);
      curr = previous[curr.id];
    }
  }

  if (path.length === 0 || path[0].id !== startNode.id) {
    return null; // No path found
  }

  // Retrieve path edges
  const pathEdges = [];
  let totalDistance = 0;
  let sumSafety = 0;
  let sumBeauty = 0;
  let totalTime = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const u = path[i];
    const v = path[i + 1];
    const edge = edges.find(
      e => (e.source.id === u.id && e.target.id === v.id) ||
           (e.source.id === v.id && e.target.id === u.id)
    );
    if (edge) {
      pathEdges.push(edge);
      totalDistance += edge.distance;
      sumSafety += edge.safety;
      sumBeauty += edge.beauty;
      totalTime += calculateEdgeTravelTime(edge);
    }
  }

  const avgSafety = pathEdges.length > 0 ? (sumSafety / pathEdges.length) : 0;
  const avgBeauty = pathEdges.length > 0 ? (sumBeauty / pathEdges.length) : 0;

  return {
    path: path,
    edges: pathEdges,
    visited: visitedNodesOrder,
    totalDistance: totalDistance,
    avgSafety: parseFloat(avgSafety.toFixed(1)),
    avgBeauty: parseFloat(avgBeauty.toFixed(1)),
    totalTime: parseFloat(totalTime.toFixed(1))
  };
}

export { calculateEdgeTravelTime, getEdgeWeight, runDijkstra };


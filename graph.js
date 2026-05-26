// Graph Data Structure and Neo-Brutalist Rendering Logic

class Node {
  constructor(id, label, x, y) {
    this.id = id;
    this.label = label;
    this.x = x;
    this.y = y;
    this.radius = 18;
    this.isDragging = false;
    this.isHovered = false;
  }

  draw(ctx, isStart, isEnd, isInPath, isVisitedDuringAnim) {
    ctx.save();
    
    // Flat offset shadow for active nodes
    if (isStart || isEnd || isInPath || this.isHovered) {
      ctx.beginPath();
      ctx.arc(this.x + 3, this.y + 3, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#000000';
      ctx.fill();
    }

    // Main Node circle
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    
    let fillColor = '#ffffff';
    let strokeColor = '#000000';
    ctx.lineWidth = 3;

    if (isStart) {
      fillColor = '#b19ffb'; // Vibrant Purple
    } else if (isEnd) {
      fillColor = '#fda4af'; // Vibrant Coral
    } else if (isInPath) {
      fillColor = '#7bf1a8'; // Vibrant Mint
    } else if (isVisitedDuringAnim) {
      fillColor = '#fef08a'; // Vibrant Yellow
    } else if (this.isHovered) {
      fillColor = '#e0f2fe'; // Light Blue
    }

    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;
    
    // Disable shadow blur for clean neo-brutalist flat lines
    ctx.shadowBlur = 0;
    
    ctx.fill();
    ctx.stroke();
    
    // Text Label inside node
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.label, this.x, this.y);
    
    ctx.restore();
  }

  isPointInside(px, py) {
    const dist = Math.hypot(px - this.x, py - this.y);
    return dist <= this.radius;
  }
}

class Edge {
  constructor(id, sourceNode, targetNode) {
    this.id = id;
    this.source = sourceNode;
    this.target = targetNode;
    
    // Default edge attributes — randomized for realistic variety
    const pixelDist = Math.hypot(targetNode.x - sourceNode.x, targetNode.y - sourceNode.y);
    this.distance = Math.max(1, Math.round(pixelDist / 12)); // scaled distance
    
    this.beauty  = Math.floor(Math.random() * 10) + 1; // Random 1–10
    this.safety  = Math.floor(Math.random() * 10) + 1; // Random 1–10
    this.traffic = Math.floor(Math.random() * 10) + 1; // Random 1–10
    this.condition = 'asphalt';

    
    this.isHovered = false;
  }

  draw(ctx, isInPath, heatmapMode) {
    ctx.save();
    
    // Base colors
    let color = '#ffffff'; 
    let baseLineWidth = 5;
    
    // Heatmap coloring (Flat high-contrast pastel colors)
    if (heatmapMode === 'safety') {
      if (this.safety >= 8) color = '#7bf1a8';      // Safe: Vibrant Mint
      else if (this.safety >= 5) color = '#fef08a'; // Medium: Yellow
      else color = '#fda4af';                       // Dangerous: Coral
    } else if (heatmapMode === 'beauty') {
      if (this.beauty >= 8) color = '#a5f3fc';      // Beautiful: Turquoise
      else if (this.beauty >= 5) color = '#c084fc';  // Medium: Soft Purple
      else color = '#e2e8f0';                       // Dull: Gray
    } else if (heatmapMode === 'traffic') {
      if (this.traffic >= 8) color = '#fda4af';     // Heavy traffic: Coral
      else if (this.traffic >= 5) color = '#fef08a'; // Medium traffic: Yellow
      else color = '#7bf1a8';                       // Clear: Mint
    }

    if (this.isHovered) {
      color = '#e0f2fe'; // Light sky blue
      baseLineWidth = 7;
    }

    if (isInPath) {
      color = '#7bf1a8'; // Active Path: Vibrant Mint
      baseLineWidth = 9;
    }

    // DOUBLE-PASS STROKE: Outline first, then color fill
    ctx.beginPath();
    ctx.moveTo(this.source.x, this.source.y);
    ctx.lineTo(this.target.x, this.target.y);
    
    // 1. Draw outer black boundary
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = baseLineWidth + 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // 2. Draw colored fill inside boundary
    ctx.strokeStyle = color;
    ctx.lineWidth = baseLineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    const midX = (this.source.x + this.target.x) / 2;
    const midY = (this.source.y + this.target.y) / 2;

    // Draw solid-color flat circular distance badge along road
    if (!isInPath && !this.isHovered) {
      ctx.beginPath();
      ctx.arc(midX, midY, 12, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.distance.toString(), midX, midY);
    } else {
      // Draw Neo-Brutalist floating details tooltip box (card with black border and offset shadow)
      const width = 74;
      const height = 34;
      const shadowOffset = 4;

      // 1. Draw flat card black shadow
      ctx.fillStyle = '#000000';
      ctx.fillRect(midX - width / 2 + shadowOffset, midY - height / 2 + shadowOffset, width, height);

      // 2. Draw card body
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.5;
      ctx.fillRect(midX - width / 2, midY - height / 2, width, height);
      ctx.strokeRect(midX - width / 2, midY - height / 2, width, height);

      // 3. Draw Text details
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 10px "Outfit", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.distance} km`, midX, midY - 4);
      
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.fillText(`🛡️${this.safety} 🌸${this.beauty}`, midX, midY + 9);
    }

    ctx.restore();
  }

  isPointNear(px, py) {
    const x1 = this.source.x;
    const y1 = this.source.y;
    const x2 = this.target.x;
    const y2 = this.target.y;

    const l2 = Math.hypot(x2 - x1, y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1) <= 12;
    
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    
    const dist = Math.hypot(px - projX, py - projY);
    return dist <= 10;
  }
}

class RoadGraph {
  constructor() {
    this.nodes = [];
    this.edges = [];
    this.nodeCounter = 0;
    this.selectedNode = null;
    this.selectedEdge = null;
  }

  addNode(x, y) {
    const label = this.generateNodeLabel(this.nodeCounter++);
    const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const node = new Node(id, label, x, y);
    this.nodes.push(node);
    return node;
  }

  generateNodeLabel(index) {
    let label = '';
    while (index >= 0) {
      label = String.fromCharCode((index % 26) + 65) + label;
      index = Math.floor(index / 26) - 1;
    }
    return label;
  }

  addEdge(sourceNode, targetNode) {
    if (sourceNode.id === targetNode.id) return null;
    const exists = this.edges.find(
      e => (e.source.id === sourceNode.id && e.target.id === targetNode.id) ||
           (e.source.id === targetNode.id && e.target.id === sourceNode.id)
    );
    if (exists) return exists;

    const id = `edge-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const edge = new Edge(id, sourceNode, targetNode);
    this.edges.push(edge);
    return edge;
  }

  deleteNode(nodeId) {
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.edges = this.edges.filter(e => e.source.id !== nodeId && e.target.id !== nodeId);
    if (this.selectedNode && this.selectedNode.id === nodeId) {
      this.selectedNode = null;
    }
  }

  deleteEdge(edgeId) {
    this.edges = this.edges.filter(e => e.id !== edgeId);
    if (this.selectedEdge && this.selectedEdge.id === edgeId) {
      this.selectedEdge = null;
    }
  }

  clear() {
    this.nodes = [];
    this.edges = [];
    this.nodeCounter = 0;
    this.selectedNode = null;
    this.selectedEdge = null;
  }

  getNodeById(id) {
    return this.nodes.find(n => n.id === id);
  }

  getNodeByLabel(label) {
    return this.nodes.find(n => n.label === label);
  }
}

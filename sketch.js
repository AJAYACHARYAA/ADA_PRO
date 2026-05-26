// Freehand Sketch-to-Graph Parser (Computer Vision Lite)

class SketchHandler {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.strokes = [];
    this.currentStroke = [];
    this.isDrawing = false;
    this.inactivityTimer = null;
    this.onSketchProcessed = null; // Callback when graph is generated
  }

  startDrawing(x, y) {
    this.isDrawing = true;
    this.currentStroke = [{ x, y }];
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
  }

  draw(x, y) {
    if (!this.isDrawing) return;
    
    // Subsample points: only store if moved at least 10px to reduce noise
    const lastPt = this.currentStroke[this.currentStroke.length - 1];
    const dist = Math.hypot(x - lastPt.x, y - lastPt.y);
    if (dist > 8) {
      this.currentStroke.push({ x, y });
    }
  }

  endDrawing() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentStroke.length > 1) {
      this.strokes.push(this.currentStroke);
    }
    this.currentStroke = [];

    // Trigger auto-conversion after 1.2 seconds of no drawing activity
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => {
      this.processSketch();
    }, 1200);
  }

  clear() {
    this.strokes = [];
    this.currentStroke = [];
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
  }

  drawStrokes(ctx) {
    ctx.save();
    ctx.strokeStyle = '#000000'; // Solid black ink line
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 0;

    // Draw past strokes
    for (const stroke of this.strokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x, stroke[i].y);
      }
      ctx.stroke();
    }

    // Draw active drawing stroke
    if (this.isDrawing && this.currentStroke.length >= 2) {
      ctx.strokeStyle = '#555555'; // Dark gray during active drawing drag
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(this.currentStroke[0].x, this.currentStroke[0].y);
      for (let i = 1; i < this.currentStroke.length; i++) {
        ctx.lineTo(this.currentStroke[i].x, this.currentStroke[i].y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // Simplified Line segment intersection
  getIntersection(p0, p1, p2, p3) {
    const s1_x = p1.x - p0.x;
    const s1_y = p1.y - p0.y;
    const s2_x = p3.x - p2.x;
    const s2_y = p3.y - p2.y;

    const denominator = (-s2_x * s1_y + s1_x * s2_y);
    if (Math.abs(denominator) < 0.0001) return null; // parallel

    const s = (-s1_y * (p0.x - p2.x) + s1_x * (p0.y - p2.y)) / denominator;
    const t = (s2_x * (p0.y - p2.y) - s2_y * (p0.x - p2.x)) / denominator;

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
      return {
        x: p0.x + (t * s1_x),
        y: p0.y + (t * s1_y)
      };
    }
    return null;
  }

  processSketch() {
    if (this.strokes.length === 0) return;

    const candidates = [];
    const minDistanceThreshold = 35; // px to merge close points

    // 1. Gather all endpoints
    for (const stroke of this.strokes) {
      if (stroke.length === 0) continue;
      candidates.push(stroke[0]);
      candidates.push(stroke[stroke.length - 1]);
    }

    // 2. Gather intersections
    for (let i = 0; i < this.strokes.length; i++) {
      const s1 = this.strokes[i];
      for (let j = i; j < this.strokes.length; j++) {
        const s2 = this.strokes[j];
        
        for (let idx1 = 0; idx1 < s1.length - 1; idx1++) {
          const start2Idx = (i === j) ? idx1 + 2 : 0; // Avoid adjacent segments of the same stroke
          for (let idx2 = start2Idx; idx2 < s2.length - 1; idx2++) {
            const p = this.getIntersection(
              s1[idx1], s1[idx1 + 1],
              s2[idx2], s2[idx2 + 1]
            );
            if (p) {
              candidates.push(p);
            }
          }
        }
      }
    }

    // 3. Cluster Candidates (Spatial Merge)
    const clusters = [];
    for (const pt of candidates) {
      let foundCluster = false;
      for (const cl of clusters) {
        const dist = Math.hypot(pt.x - cl.x, pt.y - cl.y);
        if (dist < minDistanceThreshold) {
          // Merge to cluster (rolling average)
          cl.points.push(pt);
          cl.x = cl.points.reduce((sum, p) => sum + p.x, 0) / cl.points.length;
          cl.y = cl.points.reduce((sum, p) => sum + p.y, 0) / cl.points.length;
          foundCluster = true;
          break;
        }
      }
      if (!foundCluster) {
        clusters.push({
          x: pt.x,
          y: pt.y,
          points: [pt]
        });
      }
    }

    // 4. Create Graph Nodes and connect edges
    if (this.onSketchProcessed && clusters.length > 0) {
      this.onSketchProcessed(clusters, this.strokes);
    }

    // Reset strokes
    this.clear();
  }
}

export { SketchHandler };


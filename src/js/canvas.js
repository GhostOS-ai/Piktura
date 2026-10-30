/**
 * Piktura Studio — Canvas Viewport & Coordinate Engine
 */
const Canvas = {
  zoom: 1.0,
  panX: 0,
  panY: 0,
  isPanning: false,
  startPanX: 0,
  startPanY: 0,
  rulersVisible: true,
  gridVisible: false,

  init() {
    this.setupViewportEvents();
    this.updateViewportTransform();
    this.drawRulers();
  },

  setupViewportEvents() {
    const stage = document.getElementById("canvas-stage");
    if (!stage) return;

    // Mouse wheel zoom (Option + Scroll or standard pinch/zoom)
    stage.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey || e.altKey) {
        const delta = e.deltaY < 0 ? 1.15 : 0.85;
        this.setZoom(this.zoom * delta, e.clientX, e.clientY);
      } else {
        // Standard two-finger pan
        this.panX -= e.deltaX;
        this.panY -= e.deltaY;
        this.updateViewportTransform();
        this.drawRulers();
      }
    }, { passive: false });

    // Track Cursor Coordinates for Status Bar
    stage.addEventListener("mousemove", (e) => {
      const artboard = document.getElementById("artboard");
      if (!artboard) return;
      const rect = artboard.getBoundingClientRect();
      const canvasX = Math.round((e.clientX - rect.left) / this.zoom);
      const canvasY = Math.round((e.clientY - rect.top) / this.zoom);

      const coordEl = document.getElementById("status-cursor-coords");
      if (coordEl) {
        coordEl.innerText = `X: ${canvasX} px   Y: ${canvasY} px`;
      }
    });

    // Spacebar Pan Tool Hotkey
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !this.isPanning && document.activeElement.tagName !== "INPUT") {
        stage.style.cursor = "grab";
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        stage.style.cursor = "default";
      }
    });
  },

  setZoom(newZoom, centerX = null, centerY = null) {
    const clamped = Math.max(0.05, Math.min(32.0, newZoom));
    this.zoom = clamped;
    this.updateViewportTransform();
    this.drawRulers();

    const zoomLabel = document.getElementById("status-zoom-label");
    if (zoomLabel) {
      zoomLabel.innerText = `${Math.round(this.zoom * 100)}%`;
    }
  },

  zoomIn() {
    this.setZoom(this.zoom * 1.25);
  },

  zoomOut() {
    this.setZoom(this.zoom / 1.25);
  },

  fitToScreen() {
    const stage = document.getElementById("canvas-stage");
    if (!stage) return;
    const stageW = stage.clientWidth - 80;
    const stageH = stage.clientHeight - 80;

    const scaleX = stageW / Layers.docWidth;
    const scaleY = stageH / Layers.docHeight;
    const fitScale = Math.min(scaleX, scaleY, 1.0);

    this.panX = 0;
    this.panY = 0;
    this.setZoom(fitScale);
  },

  actualPixels() {
    this.panX = 0;
    this.panY = 0;
    this.setZoom(1.0);
  },

  promptZoom() {
    const val = prompt("Enter zoom percentage (5 - 3200):", Math.round(this.zoom * 100));
    if (val) {
      const num = parseFloat(val);
      if (!isNaN(num)) this.setZoom(num / 100);
    }
  },

  updateViewportTransform() {
    const artboard = document.getElementById("artboard");
    if (artboard) {
      artboard.style.width = `${Layers.docWidth}px`;
      artboard.style.height = `${Layers.docHeight}px`;
      artboard.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
    }
  },

  drawRulers() {
    if (!this.rulersVisible) return;
    const hCanvas = document.getElementById("ruler-h-canvas");
    const vCanvas = document.getElementById("ruler-v-canvas");
    if (!hCanvas || !vCanvas) return;

    hCanvas.width = hCanvas.parentElement.clientWidth;
    hCanvas.height = 18;
    vCanvas.width = 18;
    vCanvas.height = vCanvas.parentElement.clientHeight;

    const hCtx = hCanvas.getContext("2d");
    const vCtx = vCanvas.getContext("2d");

    hCtx.fillStyle = "#22252a";
    hCtx.fillRect(0, 0, hCanvas.width, 18);
    hCtx.fillStyle = "#9ba1b0";
    hCtx.font = "9px -apple-system, sans-serif";

    vCtx.fillStyle = "#22252a";
    vCtx.fillRect(0, 0, 18, vCanvas.height);
    vCtx.fillStyle = "#9ba1b0";
    vCtx.font = "9px -apple-system, sans-serif";

    // Step calculation based on zoom
    const step = this.zoom > 2 ? 50 : (this.zoom < 0.5 ? 200 : 100);
    const artboard = document.getElementById("artboard");
    if (!artboard) return;
    const rect = artboard.getBoundingClientRect();
    const stageRect = document.getElementById("canvas-stage").getBoundingClientRect();

    const originX = rect.left - stageRect.left;
    const originY = rect.top - stageRect.top;

    // Horizontal Ruler ticks
    hCtx.strokeStyle = "#484c57";
    hCtx.beginPath();
    for (let px = 0; px <= Layers.docWidth; px += step) {
      const screenX = originX + (px * this.zoom);
      if (screenX >= 0 && screenX <= hCanvas.width) {
        hCtx.moveTo(screenX, 10);
        hCtx.lineTo(screenX, 18);
        hCtx.fillText(px.toString(), screenX + 2, 9);
      }
    }
    hCtx.stroke();

    // Vertical Ruler ticks
    vCtx.strokeStyle = "#484c57";
    vCtx.beginPath();
    for (let py = 0; py <= Layers.docHeight; py += step) {
      const screenY = originY + (py * this.zoom);
      if (screenY >= 0 && screenY <= vCanvas.height) {
        vCtx.moveTo(10, screenY);
        vCtx.lineTo(18, screenY);
        vCtx.save();
        vCtx.translate(9, screenY - 2);
        vCtx.rotate(-Math.PI / 2);
        vCtx.fillText(py.toString(), 0, 0);
        vCtx.restore();
      }
    }
    vCtx.stroke();
  },

  toggleRulers() {
    this.rulersVisible = !this.rulersVisible;
    const rH = document.getElementById("ruler-h");
    const rV = document.getElementById("ruler-v");
    if (rH) rH.style.display = this.rulersVisible ? "block" : "none";
    if (rV) rV.style.display = this.rulersVisible ? "block" : "none";
    this.drawRulers();
  },

  toggleGrid() {
    this.gridVisible = !this.gridVisible;
    // Toggle fine pixel grid CSS on artboard
  },

  rotate(degrees) {
    // Rotate canvas degrees
    const currentW = Layers.docWidth;
    const currentH = Layers.docHeight;
    Layers.docWidth = currentH;
    Layers.docHeight = currentW;

    Layers.layers.forEach(l => {
      const temp = document.createElement("canvas");
      temp.width = l.canvas.width;
      temp.height = l.canvas.height;
      temp.getContext("2d").drawImage(l.canvas, 0, 0);

      l.canvas.width = currentH;
      l.canvas.height = currentW;
      l.ctx.save();
      l.ctx.translate(l.canvas.width / 2, l.canvas.height / 2);
      l.ctx.rotate((degrees * Math.PI) / 180);
      l.ctx.drawImage(temp, -temp.width / 2, -temp.height / 2);
      l.ctx.restore();
    });

    this.updateViewportTransform();
    Layers.renderLayersPanel();
    History.pushState(`Rotate Canvas ${degrees}°`);
  },

  flipHorizontal() {
    Layers.layers.forEach(l => {
      const temp = document.createElement("canvas");
      temp.width = l.canvas.width;
      temp.height = l.canvas.height;
      temp.getContext("2d").drawImage(l.canvas, 0, 0);

      l.ctx.save();
      l.ctx.clearRect(0, 0, l.canvas.width, l.canvas.height);
      l.ctx.translate(l.canvas.width, 0);
      l.ctx.scale(-1, 1);
      l.ctx.drawImage(temp, 0, 0);
      l.ctx.restore();
    });
    Layers.renderLayersPanel();
    History.pushState(`Flip Horizontal`);
  },

  flipVertical() {
    Layers.layers.forEach(l => {
      const temp = document.createElement("canvas");
      temp.width = l.canvas.width;
      temp.height = l.canvas.height;
      temp.getContext("2d").drawImage(l.canvas, 0, 0);

      l.ctx.save();
      l.ctx.clearRect(0, 0, l.canvas.width, l.canvas.height);
      l.ctx.translate(0, l.canvas.height);
      l.ctx.scale(1, -1);
      l.ctx.drawImage(temp, 0, 0);
      l.ctx.restore();
    });
    Layers.renderLayersPanel();
    History.pushState(`Flip Vertical`);
  },

  redraw() {
    this.updateViewportTransform();
    this.drawRulers();
  }
};

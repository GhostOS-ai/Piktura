/**
 * Piktura Studio — Tool Engine & Pipeline
 */
const Tools = {
  currentTool: "brush",
  isDrawing: false,
  lastX: 0,
  lastY: 0,

  // Tool Settings
  brushSize: 30,
  brushHardness: 80,
  brushOpacity: 1.0,
  brushFlow: 1.0,
  brushSmoothing: 20,

  init() {
    this.select("brush");
    this.setupDrawingCanvas();
  },

  select(toolName) {
    this.currentTool = toolName;
    
    // Highlight in Left Toolbar
    document.querySelectorAll(".tool-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tool") === toolName);
    });

    // Update Top Options Bar
    this.updateOptionsBar(toolName);
  },

  updateOptionsBar(tool) {
    const badgeIcon = document.getElementById("opt-tool-icon");
    const badgeName = document.getElementById("opt-tool-name");
    const container = document.getElementById("options-dynamic-container");
    if (!container) return;

    const toolMeta = {
      move: { name: "Move Tool", icon: "✥" },
      marquee: { name: "Marquee Tool", icon: "⬚" },
      lasso: { name: "Lasso Tool", icon: "➰" },
      wand: { name: "Magic Wand", icon: "🪄" },
      crop: { name: "Crop Tool", icon: "⯐" },
      eyedropper: { name: "Eyedropper", icon: "💧" },
      healing: { name: "Spot Healing", icon: "🩹" },
      brush: { name: "Brush Tool", icon: "🖌️" },
      stamp: { name: "Clone Stamp", icon: "⚚" },
      "history-brush": { name: "History Brush", icon: "📜" },
      eraser: { name: "Eraser Tool", icon: "🧹" },
      bucket: { name: "Paint Bucket", icon: "🪣" },
      dodge: { name: "Dodge & Burn", icon: "☀️" },
      pen: { name: "Pen Tool", icon: "✒️" },
      text: { name: "Horizontal Type", icon: "T" },
      shape: { name: "Shape Tool", icon: "▭" },
      hand: { name: "Hand Tool", icon: "✋" },
      zoom: { name: "Zoom Tool", icon: "🔍" }
    };

    const meta = toolMeta[tool] || { name: tool, icon: "🛠️" };
    if (badgeIcon) badgeIcon.innerText = meta.icon;
    if (badgeName) badgeName.innerText = meta.name;

    // Render Options based on active tool
    if (tool === "brush" || tool === "eraser" || tool === "stamp" || tool === "healing") {
      container.innerHTML = `
        <div class="opt-group">
          <label>Size:</label>
          <input type="range" min="1" max="500" value="${this.brushSize}" oninput="Tools.setBrushSize(this.value)">
          <span class="opt-val">${this.brushSize} px</span>

          <label>Hardness:</label>
          <input type="range" min="0" max="100" value="${this.brushHardness}" oninput="Tools.setBrushHardness(this.value)">
          <span class="opt-val">${this.brushHardness}%</span>

          <label>Opacity:</label>
          <input type="range" min="1" max="100" value="${Math.round(this.brushOpacity * 100)}" oninput="Tools.setBrushOpacity(this.value)">
          <span class="opt-val">${Math.round(this.brushOpacity * 100)}%</span>
        </div>
      `;
    } else if (tool === "marquee" || tool === "wand") {
      container.innerHTML = `
        <div class="opt-group">
          <label>Feather:</label>
          <input type="number" class="ps-num-input" style="width:50px" value="0" min="0" max="100"> px
          <label style="margin-left:12px">Tolerance:</label>
          <input type="number" class="ps-num-input" style="width:50px" value="32" min="1" max="255">
          <label style="margin-left:12px"><input type="checkbox" checked> Anti-alias</label>
          <label><input type="checkbox" checked> Contiguous</label>
        </div>
      `;
    } else if (tool === "text") {
      container.innerHTML = `
        <div class="opt-group">
          <label>Font:</label>
          <select class="ps-select">
            <option>Helvetica Neue</option>
            <option>SF Pro Display</option>
            <option>Arial</option>
            <option>Georgia</option>
            <option>Courier New</option>
          </select>
          <label>Size:</label>
          <input type="number" class="ps-num-input" style="width:55px" value="72"> pt
          <label>Style:</label>
          <select class="ps-select">
            <option>Regular</option>
            <option>Bold</option>
            <option>Italic</option>
          </select>
        </div>
      `;
    } else {
      container.innerHTML = `<span style="color:var(--ps-text-dim)">No extra options for this tool.</span>`;
    }
  },

  setBrushSize(val) {
    this.brushSize = parseInt(val, 10);
    this.updateOptionsBar(this.currentTool);
  },

  setBrushHardness(val) {
    this.brushHardness = parseInt(val, 10);
    this.updateOptionsBar(this.currentTool);
  },

  setBrushOpacity(val) {
    this.brushOpacity = parseInt(val, 10) / 100;
    this.updateOptionsBar(this.currentTool);
  },

  setBrushFlow(val) {
    this.brushFlow = parseInt(val, 10) / 100;
  },

  setBrushSmoothing(val) {
    this.brushSmoothing = parseInt(val, 10);
  },

  setupDrawingCanvas() {
    const artboard = document.getElementById("artboard");
    if (!artboard) return;

    const getCanvasCoords = (e) => {
      const rect = artboard.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / Canvas.zoom,
        y: (e.clientY - rect.top) / Canvas.zoom
      };
    };

    artboard.addEventListener("mousedown", (e) => {
      // Spacebar or Middle Click pan override
      if (e.code === "Space" || e.button === 1 || this.currentTool === "hand") {
        Canvas.isPanning = true;
        Canvas.startPanX = e.clientX - Canvas.panX;
        Canvas.startPanY = e.clientY - Canvas.panY;
        return;
      }

      const activeLayer = Layers.getActiveLayer();
      if (!activeLayer || !activeLayer.visible) return;

      const coords = getCanvasCoords(e);
      this.isDrawing = true;
      this.lastX = coords.x;
      this.lastY = coords.y;

      if (this.currentTool === "brush") {
        this.paintDot(activeLayer.ctx, coords.x, coords.y, ColorPicker.getFgColor());
      } else if (this.currentTool === "eraser") {
        this.eraseDot(activeLayer.ctx, coords.x, coords.y);
      } else if (this.currentTool === "bucket") {
        this.floodFill(activeLayer.ctx, Math.round(coords.x), Math.round(coords.y), ColorPicker.getFgColor());
        Layers.renderLayersPanel();
        History.pushState("Paint Bucket");
      } else if (this.currentTool === "eyedropper") {
        this.sampleColor(coords.x, coords.y);
      }
    });

    window.addEventListener("mousemove", (e) => {
      if (Canvas.isPanning) {
        Canvas.panX = e.clientX - Canvas.startPanX;
        Canvas.panY = e.clientY - Canvas.startPanY;
        Canvas.updateViewportTransform();
        Canvas.drawRulers();
        return;
      }

      if (!this.isDrawing) return;
      const activeLayer = Layers.getActiveLayer();
      if (!activeLayer) return;

      const coords = getCanvasCoords(e);

      if (this.currentTool === "brush") {
        this.paintLine(activeLayer.ctx, this.lastX, this.lastY, coords.x, coords.y, ColorPicker.getFgColor());
      } else if (this.currentTool === "eraser") {
        this.eraseLine(activeLayer.ctx, this.lastX, this.lastY, coords.x, coords.y);
      }

      this.lastX = coords.x;
      this.lastY = coords.y;
    });

    window.addEventListener("mouseup", () => {
      if (Canvas.isPanning) {
        Canvas.isPanning = false;
      }
      if (this.isDrawing) {
        this.isDrawing = false;
        Layers.renderLayersPanel();
        History.pushState(`${this.currentTool === "eraser" ? "Eraser" : "Brush"} Stroke`);
      }
    });
  },

  paintDot(ctx, x, y, color) {
    ctx.save();
    ctx.globalAlpha = this.brushOpacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  paintLine(ctx, x0, y0, x1, y1, color) {
    ctx.save();
    ctx.globalAlpha = this.brushOpacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = this.brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  },

  eraseDot(ctx, x, y) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = this.brushOpacity;
    ctx.beginPath();
    ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  eraseLine(ctx, x0, y0, x1, y1) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = this.brushOpacity;
    ctx.lineWidth = this.brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.restore();
  },

  sampleColor(x, y) {
    const active = Layers.getActiveLayer();
    if (!active) return;
    const pixel = active.ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
    const hex = ColorPicker.rgbToHex(pixel[0], pixel[1], pixel[2]);
    ColorPicker.setFgColor(hex);
  },

  floodFill(ctx, startX, startY, fillHex) {
    // Canvas flood fill implementation
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const idx = (startY * w + startX) * 4;
    const targetR = data[idx];
    const targetG = data[idx + 1];
    const targetB = data[idx + 2];
    const targetA = data[idx + 3];

    // Convert fill hex to rgb
    const fillR = parseInt(fillHex.slice(1, 3), 16);
    const fillG = parseInt(fillHex.slice(3, 5), 16);
    const fillB = parseInt(fillHex.slice(5, 7), 16);
    const fillA = 255;

    if (targetR === fillR && targetG === fillG && targetB === fillB && targetA === fillA) return;

    const queue = [[startX, startY]];
    const seen = new Uint8Array(w * h);

    while (queue.length > 0) {
      const [cx, cy] = queue.pop();
      const pIdx = cy * w + cx;
      if (seen[pIdx]) continue;
      seen[pIdx] = 1;

      const dIdx = pIdx * 4;
      if (
        Math.abs(data[dIdx] - targetR) < 32 &&
        Math.abs(data[dIdx + 1] - targetG) < 32 &&
        Math.abs(data[dIdx + 2] - targetB) < 32 &&
        Math.abs(data[dIdx + 3] - targetA) < 32
      ) {
        data[dIdx] = fillR;
        data[dIdx + 1] = fillG;
        data[dIdx + 2] = fillB;
        data[dIdx + 3] = fillA;

        if (cx > 0) queue.push([cx - 1, cy]);
        if (cx < w - 1) queue.push([cx + 1, cy]);
        if (cy > 0) queue.push([cx, cy - 1]);
        if (cy < h - 1) queue.push([cx, cy + 1]);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  },

  // Edit actions
  clear() {
    const active = Layers.getActiveLayer();
    if (active) {
      active.clear();
      Layers.renderLayersPanel();
      History.pushState("Clear");
    }
  },

  fill() {
    const active = Layers.getActiveLayer();
    if (active) {
      active.ctx.fillStyle = ColorPicker.getFgColor();
      active.ctx.fillRect(0, 0, active.width, active.height);
      Layers.renderLayersPanel();
      History.pushState("Fill Foreground Color");
    }
  },

  freeTransform() {
    const box = document.getElementById("transform-box");
    if (!box) return;
    box.classList.toggle("hidden");
    const active = Layers.getActiveLayer();
    if (active && !box.classList.contains("hidden")) {
      box.style.width = `${active.width}px`;
      box.style.height = `${active.height}px`;
      box.style.top = `0px`;
      box.style.left = `0px`;
    }
  }
};

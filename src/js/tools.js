/**
 * Piktura Studio — Tool Engine & Professional Pipeline
 */
const Tools = {
  currentTool: "brush",
  isDrawing: false,
  startX: 0,
  startY: 0,
  lastX: 0,
  lastY: 0,

  // Tool Settings
  brushSize: 30,
  brushHardness: 80,
  brushOpacity: 1.0,
  brushFlow: 1.0,
  brushSmoothing: 20,

  // Marquee Selection State
  isSelecting: false,
  selectionBox: null, // { x, y, w, h }
  marchingAntsOffset: 0,
  marchingAntsTimer: null,

  // Gradient Tool State
  gradientType: "linear", // "linear" | "radial"
  gradientFill: "fg-bg",  // "fg-bg" | "fg-trans"

  // Shape Tool State
  shapeType: "rect", // "rect" | "ellipse" | "line" | "roundrect"
  shapeFilled: true,

  // Dodge / Burn State
  dodgeMode: "dodge", // "dodge" | "burn"
  dodgeExposure: 0.3,

  // Type Tool State
  fontFamily: "Helvetica Neue",
  fontSize: 48,
  fontStyle: "normal", // "normal" | "bold" | "italic"

  init() {
    this.select("brush");
    this.setupDrawingCanvas();
    this.startMarchingAntsLoop();
  },

  select(toolName) {
    this.currentTool = toolName;

    // Highlight in Left Toolbar
    document.querySelectorAll(".tool-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tool") === toolName);
    });

    // Update Top Options Bar
    this.updateOptionsBar(toolName);

    // Update cursor style
    this.updateCursorVisibility();
  },

  updateOptionsBar(tool) {
    const badgeIcon = document.getElementById("opt-tool-icon");
    const badgeName = document.getElementById("opt-tool-name");
    const container = document.getElementById("options-dynamic-container");
    if (!container) return;

    const t = (k) => (window.I18n ? I18n.t(k) : k);
    const svgWrap = (path) => `<svg viewBox="0 0 20 20" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;display:inline-block;vertical-align:middle;">${path}</svg>`;

    const toolMeta = {
      move: { name: t("tool_move"), icon: svgWrap('<path d="M10 2v16M2 10h16M10 2l-2.5 2.5M10 2l2.5 2.5M10 18l-2.5-2.5M10 18l2.5-2.5M2 10l2.5-2.5M2 10l2.5 2.5M18 10l-2.5-2.5M18 10l2.5 2.5"/>') },
      marquee: { name: t("tool_marquee"), icon: svgWrap('<rect x="3" y="4" width="14" height="12" rx="1" stroke-dasharray="2.5 2"/>') },
      lasso: { name: t("tool_lasso"), icon: svgWrap('<path d="M14 6c0-2.2-2.7-3.5-5.5-3.5S3 4.5 3 8s2.5 6 6 6c2.5 0 4.5-1 5.5-3l2.5 6"/>') },
      wand: { name: t("tool_wand"), icon: svgWrap('<path d="M4 16l8.5-8.5M12.5 7.5l2-2a1.4 1.4 0 0 1 2 2l-2 2M15 2v2M14 3h2M7 3v1M6.5 3.5h1M3 8v1M2.5 8.5h1"/>') },
      crop: { name: t("tool_crop"), icon: svgWrap('<path d="M6 2v12h12M2 6h12v12M14 2v4M18 6h-4"/>') },
      eyedropper: { name: t("tool_eyedropper"), icon: svgWrap('<path d="M12 4l4 4M10.5 5.5l-6 6a2 2 0 0 0-.5 1l-.5 3 3-.5a2 2 0 0 0 1-.5l6-6M13.5 2.5a2.1 2.1 0 0 1 3 3l-1 1-3-3 1-1z"/>') },
      healing: { name: t("tool_healing"), icon: svgWrap('<rect x="3.5" y="7.5" width="13" height="5" rx="2.5" transform="rotate(-45 10 10)"/><circle cx="10" cy="10" r="0.8" fill="currentColor"/><circle cx="8" cy="8" r="0.8" fill="currentColor"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/>') },
      brush: { name: t("tool_brush"), icon: svgWrap('<path d="M16.5 3.5a2.12 2.12 0 0 0-3 0L7 10l-1 4 4-1 6.5-6.5a2.12 2.12 0 0 0 0-3zM7 10l3 3M3 17c1.5 0 2.5-.5 3-1.5L5 14.5 3.5 13C2.5 13.5 2 14.5 2 16a1 1 0 0 0 1 1z"/>') },
      stamp: { name: t("tool_stamp"), icon: svgWrap('<path d="M7 3h6v3H7zM10 6v5M5 11h10v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM4 17h12"/>') },
      "history-brush": { name: t("tool_history_brush"), icon: svgWrap('<path d="M4 8a6 6 0 1 1 1.5 4M4 4v4h4M12 8l4.5-4.5a1.5 1.5 0 0 1 2.1 2.1L14 10"/>') },
      eraser: { name: t("tool_eraser"), icon: svgWrap('<path d="M14.5 3.5l3 3-9 9H4l-1.5-1.5 8-8 4-2.5zM7.5 10.5l3 3M2 18h16"/>') },
      gradient: { name: t("tool_gradient"), icon: svgWrap('<rect x="3" y="3" width="14" height="14" rx="2"/><path d="M3 17L17 3M3 11L11 3M9 17L17 9"/>') },
      bucket: { name: t("tool_bucket"), icon: svgWrap('<path d="M5 9l5-5 5.5 5.5-5 5zM3 11l6.5-6.5M10.5 14.5l-2.5 2.5a2 2 0 0 1-3-3l2.5-2.5M16 14a1.5 1.5 0 1 1-3 0c0-1.5 1.5-3 1.5-3s1.5 1.5 1.5 3z"/>') },
      dodge: { name: t("tool_dodge"), icon: svgWrap('<circle cx="9" cy="9" r="5"/><path d="M13 13l4.5 4.5"/>') },
      pen: { name: t("tool_pen"), icon: svgWrap('<path d="M10 2l5 7-3 8-4-2-4 2-3-8 6-7zM10 2v7"/><circle cx="10" cy="11" r="1" fill="currentColor"/>') },
      text: { name: t("tool_text"), icon: svgWrap('<path d="M4 5h12M10 5v12M7 17h6M4 5v2M16 5v2"/>') },
      shape: { name: t("tool_shape"), icon: svgWrap('<rect x="3" y="4" width="14" height="12" rx="2"/>') },
      hand: { name: t("tool_hand"), icon: svgWrap('<path d="M6 10V5a1 1 0 0 1 2 0v4M8 8V4a1 1 0 0 1 2 0v5M10 8V4.5a1 1 0 0 1 2 0V9M12 9V6a1 1 0 0 1 2 0v6c0 3-2 5-5 5s-5-2-5-5v-3a1 1 0 0 1 2 0v2"/>') },
      zoom: { name: t("tool_zoom"), icon: svgWrap('<circle cx="8.5" cy="8.5" r="5.5"/><path d="M13 13l4.5 4.5"/>') }
    };

    const meta = toolMeta[tool] || { name: tool, icon: svgWrap('<circle cx="10" cy="10" r="5"/>') };
    if (badgeIcon) badgeIcon.innerHTML = meta.icon;
    if (badgeName) badgeName.innerText = meta.name;

    // Render Dynamic Options based on active tool
    if (tool === "brush" || tool === "eraser" || tool === "stamp" || tool === "healing") {
      container.innerHTML = `
        <div class="opt-group">
          <label>${t("opt_size")}</label>
          <input type="range" min="1" max="500" value="${this.brushSize}" oninput="Tools.setBrushSize(this.value)">
          <span class="opt-val">${this.brushSize} px</span>

          <label>${t("opt_hardness")}</label>
          <input type="range" min="0" max="100" value="${this.brushHardness}" oninput="Tools.setBrushHardness(this.value)">
          <span class="opt-val">${this.brushHardness}%</span>

          <label>${t("opt_opacity")}</label>
          <input type="range" min="1" max="100" value="${Math.round(this.brushOpacity * 100)}" oninput="Tools.setBrushOpacity(this.value)">
          <span class="opt-val">${Math.round(this.brushOpacity * 100)}%</span>
        </div>
      `;
    } else if (tool === "marquee") {
      container.innerHTML = `
        <div class="opt-group">
          <label>${t("opt_style")}</label>
          <select class="ps-select" onchange="Tools.marqueeStyle = this.value">
            <option value="normal">Normal (Freeform)</option>
            <option value="fixed-ratio">Fixed Ratio (1:1)</option>
          </select>
          <label style="margin-left:12px">${t("opt_feather")}</label>
          <input type="number" class="ps-num-input" style="width:50px" value="0" min="0" max="100"> px
          <button class="ps-btn secondary" style="margin-left:12px; height:22px; padding:0 8px; font-size:11px;" onclick="Selection.deselect()">${t("menu_deselect")}</button>
        </div>
      `;
    } else if (tool === "gradient") {
      container.innerHTML = `
        <div class="opt-group">
          <label>${t("opt_type")}</label>
          <select class="ps-select" onchange="Tools.gradientType = this.value">
            <option value="linear" ${this.gradientType === 'linear' ? 'selected' : ''}>Linear Gradient</option>
            <option value="radial" ${this.gradientType === 'radial' ? 'selected' : ''}>Radial Gradient</option>
          </select>
          <label style="margin-left:12px">${t("opt_colors")}</label>
          <select class="ps-select" onchange="Tools.gradientFill = this.value">
            <option value="fg-bg" ${this.gradientFill === 'fg-bg' ? 'selected' : ''}>Foreground to Background</option>
            <option value="fg-trans" ${this.gradientFill === 'fg-trans' ? 'selected' : ''}>Foreground to Transparent</option>
          </select>
        </div>
      `;
    } else if (tool === "shape") {
      container.innerHTML = `
        <div class="opt-group">
          <label>${t("opt_shape")}</label>
          <select class="ps-select" onchange="Tools.shapeType = this.value">
            <option value="rect" ${this.shapeType === 'rect' ? 'selected' : ''}>Rectangle</option>
            <option value="roundrect" ${this.shapeType === 'roundrect' ? 'selected' : ''}>Rounded Rectangle</option>
            <option value="ellipse" ${this.shapeType === 'ellipse' ? 'selected' : ''}>Ellipse / Circle</option>
            <option value="line" ${this.shapeType === 'line' ? 'selected' : ''}>Line</option>
          </select>
          <label style="margin-left:12px"><input type="checkbox" ${this.shapeFilled ? 'checked' : ''} onchange="Tools.shapeFilled = this.checked"> ${t("opt_fill")}</label>
        </div>
      `;
    } else if (tool === "dodge") {
      container.innerHTML = `
        <div class="opt-group">
          <label>${t("opt_mode")}</label>
          <select class="ps-select" onchange="Tools.dodgeMode = this.value">
            <option value="dodge" ${this.dodgeMode === 'dodge' ? 'selected' : ''}>Dodge (Lighten)</option>
            <option value="burn" ${this.dodgeMode === 'burn' ? 'selected' : ''}>Burn (Darken)</option>
          </select>
          <label style="margin-left:12px">${t("opt_exposure")}</label>
          <input type="range" min="5" max="100" value="${Math.round(this.dodgeExposure * 100)}" oninput="Tools.dodgeExposure = this.value / 100; this.nextElementSibling.innerText = this.value + '%'">
          <span class="opt-val">${Math.round(this.dodgeExposure * 100)}%</span>
        </div>
      `;
    } else if (tool === "text") {
      container.innerHTML = `
        <div class="opt-group">
          <label>${t("opt_font")}</label>
          <select class="ps-select" onchange="Tools.fontFamily = this.value">
            <option value="Helvetica Neue">Helvetica Neue</option>
            <option value="-apple-system, BlinkMacSystemFont, sans-serif">Apple SF Pro</option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
          </select>
          <label style="margin-left:12px">${t("opt_size")}</label>
          <input type="number" class="ps-num-input" style="width:55px" value="${this.fontSize}" min="8" max="250" onchange="Tools.fontSize = parseInt(this.value, 10)"> pt
          <label style="margin-left:12px">${t("opt_style")}</label>
          <select class="ps-select" onchange="Tools.fontStyle = this.value">
            <option value="normal">Regular</option>
            <option value="bold">Bold</option>
            <option value="italic">Italic</option>
          </select>
        </div>
      `;
    } else {
      container.innerHTML = `<span style="color:var(--ps-text-dim)">No extra options for this tool.</span>`;
    }
  },

  setBrushSize(val) {
    this.brushSize = Math.max(1, Math.min(500, parseInt(val, 10)));
    this.updateOptionsBar(this.currentTool);
    this.updateBrushCursorSize();
  },

  setBrushHardness(val) {
    this.brushHardness = Math.max(0, Math.min(100, parseInt(val, 10)));
    this.updateOptionsBar(this.currentTool);
  },

  setBrushOpacity(val) {
    this.brushOpacity = Math.max(0.01, Math.min(1.0, parseInt(val, 10) / 100));
    this.updateOptionsBar(this.currentTool);
  },

  setBrushFlow(val) {
    this.brushFlow = parseInt(val, 10) / 100;
  },

  setBrushSmoothing(val) {
    this.brushSmoothing = parseInt(val, 10);
  },

  // Dynamic Brush Cursor Tracker
  updateCursorVisibility() {
    const stage = document.getElementById("canvas-stage");
    const cursor = document.getElementById("brush-cursor");
    if (!stage || !cursor) return;

    const brushLike = ["brush", "eraser", "stamp", "healing", "dodge"].includes(this.currentTool);
    if (!brushLike) {
      cursor.style.display = "none";
      stage.style.cursor = this.currentTool === "hand" ? "grab" : (this.currentTool === "zoom" ? "zoom-in" : "crosshair");
    } else {
      stage.style.cursor = "none";
    }
  },

  updateBrushCursorPos(e) {
    const cursor = document.getElementById("brush-cursor");
    if (!cursor) return;
    const brushLike = ["brush", "eraser", "stamp", "healing", "dodge"].includes(this.currentTool);
    if (!brushLike) {
      cursor.style.display = "none";
      return;
    }

    cursor.style.display = "block";
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
    this.updateBrushCursorSize();
  },

  updateBrushCursorSize() {
    const cursor = document.getElementById("brush-cursor");
    if (!cursor) return;
    const diameter = Math.max(4, this.brushSize * Canvas.zoom);
    cursor.style.width = `${diameter}px`;
    cursor.style.height = `${diameter}px`;
  },

  // Setup Drawing & Tool Event Handlers
  setupDrawingCanvas() {
    const stage = document.getElementById("canvas-stage");
    const artboard = document.getElementById("artboard");
    if (!stage || !artboard) return;

    // Track dynamic cursor over stage
    stage.addEventListener("mousemove", (e) => {
      this.updateBrushCursorPos(e);
    });

    stage.addEventListener("mouseleave", () => {
      const cursor = document.getElementById("brush-cursor");
      if (cursor) cursor.style.display = "none";
    });

    // MOUSE DOWN
    artboard.addEventListener("mousedown", (e) => {
      // Spacebar or Middle Click pan override
      if (e.code === "Space" || e.button === 1 || this.currentTool === "hand") {
        Canvas.isPanning = true;
        Canvas.startPanX = e.clientX - Canvas.panX;
        Canvas.startPanY = e.clientY - Canvas.panY;
        return;
      }

      const coords = Canvas.getCanvasCoords(e);
      this.startX = coords.x;
      this.startY = coords.y;
      this.lastX = coords.x;
      this.lastY = coords.y;

      // Handle Marquee Selection Tool
      if (this.currentTool === "marquee") {
        this.isSelecting = true;
        this.selectionBox = { x: coords.x, y: coords.y, w: 0, h: 0 };
        return;
      }

      // Handle Gradient Tool Start
      if (this.currentTool === "gradient") {
        this.isDrawing = true;
        return;
      }

      // Handle Shape Tool Start
      if (this.currentTool === "shape") {
        this.isDrawing = true;
        return;
      }

      // Handle Text Tool
      if (this.currentTool === "text") {
        this.promptTextInsertion(coords.x, coords.y);
        return;
      }

      // Handle Eyedropper
      if (this.currentTool === "eyedropper") {
        this.sampleColor(coords.x, coords.y);
        return;
      }

      // Handle Layer-drawing tools
      const activeLayer = Layers.getActiveLayer();
      if (!activeLayer || !activeLayer.visible || activeLayer.locked) return;

      this.isDrawing = true;

      if (this.currentTool === "brush") {
        this.paintDot(activeLayer.ctx, coords.x, coords.y, ColorPicker.getFgColor());
      } else if (this.currentTool === "eraser") {
        this.eraseDot(activeLayer.ctx, coords.x, coords.y);
      } else if (this.currentTool === "bucket") {
        this.floodFill(activeLayer.ctx, Math.round(coords.x), Math.round(coords.y), ColorPicker.getFgColor());
        Layers.renderLayersPanel();
        History.pushState("Paint Bucket");
      } else if (this.currentTool === "dodge") {
        this.applyDodgeBurn(activeLayer.ctx, coords.x, coords.y);
      }
    });

    // MOUSE MOVE
    window.addEventListener("mousemove", (e) => {
      if (Canvas.isPanning) {
        Canvas.panX = e.clientX - Canvas.startPanX;
        Canvas.panY = e.clientY - Canvas.startPanY;
        Canvas.updateViewportTransform();
        Canvas.drawRulers();
        return;
      }

      const coords = Canvas.getCanvasCoords(e);

      // Interactive Marquee Drag Preview
      if (this.isSelecting) {
        const x = Math.min(this.startX, coords.x);
        const y = Math.min(this.startY, coords.y);
        const w = Math.abs(coords.x - this.startX);
        const h = Math.abs(coords.y - this.startY);
        this.selectionBox = { x, y, w, h };
        this.renderSelectionOverlay();
        return;
      }

      // Interactive Gradient Drag Line Preview
      if (this.isDrawing && this.currentTool === "gradient") {
        this.renderOverlayLine(this.startX, this.startY, coords.x, coords.y);
        return;
      }

      // Interactive Shape Drag Preview
      if (this.isDrawing && this.currentTool === "shape") {
        this.renderShapePreview(this.startX, this.startY, coords.x, coords.y);
        return;
      }

      if (!this.isDrawing) return;
      const activeLayer = Layers.getActiveLayer();
      if (!activeLayer || activeLayer.locked) return;

      if (this.currentTool === "brush") {
        this.paintLine(activeLayer.ctx, this.lastX, this.lastY, coords.x, coords.y, ColorPicker.getFgColor());
      } else if (this.currentTool === "eraser") {
        this.eraseLine(activeLayer.ctx, this.lastX, this.lastY, coords.x, coords.y);
      } else if (this.currentTool === "dodge") {
        this.applyDodgeBurn(activeLayer.ctx, coords.x, coords.y);
      }

      this.lastX = coords.x;
      this.lastY = coords.y;
    });

    // MOUSE UP
    window.addEventListener("mouseup", (e) => {
      if (Canvas.isPanning) {
        Canvas.isPanning = false;
        return;
      }

      const coords = Canvas.getCanvasCoords(e);

      // Finish Selection
      if (this.isSelecting) {
        this.isSelecting = false;
        if (this.selectionBox && (this.selectionBox.w < 3 || this.selectionBox.h < 3)) {
          this.selectionBox = null;
          this.clearOverlay();
        } else {
          Selection.activeBox = this.selectionBox;
        }
        return;
      }

      // Finish Gradient
      if (this.isDrawing && this.currentTool === "gradient") {
        this.isDrawing = false;
        this.clearOverlay();
        const active = Layers.getActiveLayer();
        if (active && !active.locked) {
          this.applyGradient(active.ctx, this.startX, this.startY, coords.x, coords.y);
          Layers.renderLayersPanel();
          History.pushState("Gradient Tool");
        }
        return;
      }

      // Finish Shape
      if (this.isDrawing && this.currentTool === "shape") {
        this.isDrawing = false;
        this.clearOverlay();
        const active = Layers.getActiveLayer();
        if (active && !active.locked) {
          this.commitShape(active.ctx, this.startX, this.startY, coords.x, coords.y);
          Layers.renderLayersPanel();
          History.pushState(`Draw Shape (${this.shapeType})`);
        }
        return;
      }

      if (this.isDrawing) {
        this.isDrawing = false;
        Layers.renderLayersPanel();
        History.pushState(`${this.currentTool === "eraser" ? "Eraser" : "Brush"} Stroke`);
      }
    });
  },

  // Soft & Hard Brush Engine
  paintDot(ctx, x, y, color) {
    ctx.save();
    if (Selection.activeBox) {
      ctx.beginPath();
      ctx.rect(Selection.activeBox.x, Selection.activeBox.y, Selection.activeBox.w, Selection.activeBox.h);
      ctx.clip();
    }

    const radius = Math.max(0.5, this.brushSize / 2);

    if (this.brushHardness >= 98) {
      ctx.globalAlpha = this.brushOpacity;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const grad = ctx.createRadialGradient(x, y, radius * (this.brushHardness / 100), x, y, radius);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "transparent");
      ctx.globalAlpha = this.brushOpacity;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  paintLine(ctx, x0, y0, x1, y1, color) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const step = Math.max(1, this.brushSize * 0.18);
    const steps = Math.max(1, Math.ceil(dist / step));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      this.paintDot(ctx, x, y, color);
    }
  },

  eraseDot(ctx, x, y) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    if (Selection.activeBox) {
      ctx.beginPath();
      ctx.rect(Selection.activeBox.x, Selection.activeBox.y, Selection.activeBox.w, Selection.activeBox.h);
      ctx.clip();
    }

    const radius = Math.max(0.5, this.brushSize / 2);

    if (this.brushHardness >= 98) {
      ctx.globalAlpha = this.brushOpacity;
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const grad = ctx.createRadialGradient(x, y, radius * (this.brushHardness / 100), x, y, radius);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = this.brushOpacity;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  eraseLine(ctx, x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const step = Math.max(1, this.brushSize * 0.18);
    const steps = Math.max(1, Math.ceil(dist / step));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      this.eraseDot(ctx, x, y);
    }
  },

  // Gradient Engine
  applyGradient(ctx, x0, y0, x1, y1) {
    ctx.save();
    if (Selection.activeBox) {
      ctx.beginPath();
      ctx.rect(Selection.activeBox.x, Selection.activeBox.y, Selection.activeBox.w, Selection.activeBox.h);
      ctx.clip();
    }

    let grad;
    if (this.gradientType === "radial") {
      const radius = Math.hypot(x1 - x0, y1 - y0);
      grad = ctx.createRadialGradient(x0, y0, 0, x0, y0, radius);
    } else {
      grad = ctx.createLinearGradient(x0, y0, x1, y1);
    }

    const fg = ColorPicker.getFgColor();
    const bg = ColorPicker.getBgColor();

    grad.addColorStop(0, fg);
    if (this.gradientFill === "fg-trans") {
      grad.addColorStop(1, "transparent");
    } else {
      grad.addColorStop(1, bg);
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  },

  // Shape Engine
  commitShape(ctx, x0, y0, x1, y1) {
    ctx.save();
    if (Selection.activeBox) {
      ctx.beginPath();
      ctx.rect(Selection.activeBox.x, Selection.activeBox.y, Selection.activeBox.w, Selection.activeBox.h);
      ctx.clip();
    }

    ctx.fillStyle = ColorPicker.getFgColor();
    ctx.strokeStyle = ColorPicker.getFgColor();
    ctx.lineWidth = Math.max(1, this.brushSize / 4);

    const left = Math.min(x0, x1);
    const top = Math.min(y0, y1);
    const width = Math.abs(x1 - x0);
    const height = Math.abs(y1 - y0);

    ctx.beginPath();
    if (this.shapeType === "rect") {
      if (this.shapeFilled) {
        ctx.fillRect(left, top, width, height);
      } else {
        ctx.strokeRect(left, top, width, height);
      }
    } else if (this.shapeType === "roundrect") {
      const radius = Math.min(20, width / 4, height / 4);
      ctx.roundRect(left, top, width, height, radius);
      if (this.shapeFilled) ctx.fill(); else ctx.stroke();
    } else if (this.shapeType === "ellipse") {
      ctx.ellipse(left + width / 2, top + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      if (this.shapeFilled) ctx.fill(); else ctx.stroke();
    } else if (this.shapeType === "line") {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();
  },

  // Dodge & Burn Filter Engine
  applyDodgeBurn(ctx, x, y) {
    const radius = Math.round(this.brushSize / 2);
    const left = Math.max(0, Math.round(x - radius));
    const top = Math.max(0, Math.round(y - radius));
    const size = radius * 2;
    const width = Math.min(size, ctx.canvas.width - left);
    const height = Math.min(size, ctx.canvas.height - top);

    if (width <= 0 || height <= 0) return;

    const imgData = ctx.getImageData(left, top, width, height);
    const data = imgData.data;
    const factor = this.dodgeMode === "dodge" ? (1 + this.dodgeExposure * 0.15) : (1 - this.dodgeExposure * 0.15);

    for (let py = 0; py < height; py++) {
      for (let px = 0; px < width; px++) {
        const d = Math.hypot(px - radius, py - radius);
        if (d > radius) continue;
        const weight = (1 - d / radius);
        const idx = (py * width + px) * 4;

        if (this.dodgeMode === "dodge") {
          data[idx] = Math.min(255, data[idx] + weight * 20 * this.dodgeExposure);
          data[idx + 1] = Math.min(255, data[idx + 1] + weight * 20 * this.dodgeExposure);
          data[idx + 2] = Math.min(255, data[idx + 2] + weight * 20 * this.dodgeExposure);
        } else {
          data[idx] = Math.max(0, data[idx] - weight * 20 * this.dodgeExposure);
          data[idx + 1] = Math.max(0, data[idx + 1] - weight * 20 * this.dodgeExposure);
          data[idx + 2] = Math.max(0, data[idx + 2] - weight * 20 * this.dodgeExposure);
        }
      }
    }
    ctx.putImageData(imgData, left, top);
  },

  // Horizontal Type Tool Placement
  promptTextInsertion(x, y) {
    const text = prompt("Enter text to insert at cursor:", "Piktura Studio");
    if (!text) return;

    const active = Layers.getActiveLayer();
    if (!active || active.locked) return;

    active.ctx.save();
    active.ctx.fillStyle = ColorPicker.getFgColor();
    const stylePrefix = this.fontStyle === "italic" ? "italic " : (this.fontStyle === "bold" ? "bold " : "");
    active.ctx.font = `${stylePrefix}${this.fontSize}px ${this.fontFamily}`;
    active.ctx.fillText(text, x, y);
    active.ctx.restore();

    Layers.renderLayersPanel();
    History.pushState(`Type: "${text.substring(0, 15)}"`);
  },

  // Eyedropper Sampling
  sampleColor(x, y) {
    const temp = document.createElement("canvas");
    temp.width = 1;
    temp.height = 1;
    const tCtx = temp.getContext("2d");

    // Draw all visible layers composite at (x, y)
    Layers.layers.forEach(l => {
      if (l.visible) {
        tCtx.globalAlpha = l.opacity;
        tCtx.drawImage(l.canvas, -Math.round(x), -Math.round(y));
      }
    });

    const pixel = tCtx.getImageData(0, 0, 1, 1).data;
    if (pixel[3] > 0) {
      const hex = ColorPicker.rgbToHex(pixel[0], pixel[1], pixel[2]);
      ColorPicker.setFgColor(hex);
    }
  },

  // Flood Fill (Bucket)
  floodFill(ctx, startX, startY, fillHex) {
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

  // Overlays: Marching Ants, Gradient Line, Shape Drag Previews
  startMarchingAntsLoop() {
    const loop = () => {
      this.marchingAntsOffset = (this.marchingAntsOffset + 0.5) % 8;
      if (Selection.activeBox || this.isSelecting) {
        this.renderSelectionOverlay();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  renderSelectionOverlay() {
    const box = this.selectionBox || Selection.activeBox;
    const overlay = document.getElementById("selection-overlay");
    if (!overlay || !box) return;

    overlay.width = Layers.docWidth;
    overlay.height = Layers.docHeight;
    const ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    ctx.save();
    // Black base outline
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(box.x, box.y, box.w, box.h);

    // Animated White dashed marching ants
    ctx.strokeStyle = "#ffffff";
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -this.marchingAntsOffset;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.restore();
  },

  renderOverlayLine(x0, y0, x1, y1) {
    const overlay = document.getElementById("selection-overlay");
    if (!overlay) return;
    overlay.width = Layers.docWidth;
    overlay.height = Layers.docHeight;
    const ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    ctx.save();
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // End points
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x0, y0, 4, 0, Math.PI * 2);
    ctx.arc(x1, y1, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  renderShapePreview(x0, y0, x1, y1) {
    const overlay = document.getElementById("selection-overlay");
    if (!overlay) return;
    overlay.width = Layers.docWidth;
    overlay.height = Layers.docHeight;
    const ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const left = Math.min(x0, x1);
    const top = Math.min(y0, y1);
    const width = Math.abs(x1 - x0);
    const height = Math.abs(y1 - y0);

    ctx.save();
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    if (this.shapeType === "ellipse") {
      ctx.beginPath();
      ctx.ellipse(left + width / 2, top + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (this.shapeType === "line") {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    } else {
      ctx.strokeRect(left, top, width, height);
    }
    ctx.restore();
  },

  clearOverlay() {
    const overlay = document.getElementById("selection-overlay");
    if (overlay) {
      const ctx = overlay.getContext("2d");
      ctx.clearRect(0, 0, overlay.width, overlay.height);
    }
  },

  // Edit Operations
  clear() {
    const active = Layers.getActiveLayer();
    if (!active || active.locked) return;

    if (Selection.activeBox) {
      active.ctx.clearRect(Selection.activeBox.x, Selection.activeBox.y, Selection.activeBox.w, Selection.activeBox.h);
      Layers.renderLayersPanel();
      History.pushState("Clear Selection");
    } else {
      active.clear();
      Layers.renderLayersPanel();
      History.pushState("Clear Layer");
    }
  },

  fill() {
    const active = Layers.getActiveLayer();
    if (!active || active.locked) return;

    active.ctx.save();
    active.ctx.fillStyle = ColorPicker.getFgColor();
    if (Selection.activeBox) {
      active.ctx.fillRect(Selection.activeBox.x, Selection.activeBox.y, Selection.activeBox.w, Selection.activeBox.h);
      History.pushState("Fill Selection");
    } else {
      active.ctx.fillRect(0, 0, active.width, active.height);
      History.pushState("Fill Layer");
    }
    active.ctx.restore();
    Layers.renderLayersPanel();
  },

  cut() {
    this.copy();
    this.clear();
  },

  copy() {
    const active = Layers.getActiveLayer();
    if (!active) return;
    const box = Selection.activeBox || { x: 0, y: 0, w: active.width, h: active.height };
    const temp = document.createElement("canvas");
    temp.width = box.w;
    temp.height = box.h;
    temp.getContext("2d").drawImage(active.canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
    this.clipboardCanvas = temp;
  },

  copyMerged() {
    const box = Selection.activeBox || { x: 0, y: 0, w: Layers.docWidth, h: Layers.docHeight };
    const temp = document.createElement("canvas");
    temp.width = box.w;
    temp.height = box.h;
    const tCtx = temp.getContext("2d");

    Layers.layers.forEach(l => {
      if (l.visible) {
        tCtx.globalAlpha = l.opacity;
        tCtx.drawImage(l.canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
      }
    });
    this.clipboardCanvas = temp;
  },

  paste() {
    if (!this.clipboardCanvas) return;
    const newL = Layers.createLayer("Pasted Layer");
    newL.ctx.drawImage(this.clipboardCanvas, 0, 0);
    Layers.renderLayersPanel();
    History.pushState("Paste");
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

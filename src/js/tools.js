/**
 * Piktura Studio — Tool Engine & Professional Pipeline (v1.1.2)
 * Complete Photoshop-Grade Tool Mechanics, Visual Canvas Indicators & Localized History
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

  // Selection Tools State
  isSelecting: false,
  selectionBox: null, // { x, y, w, h }
  lassoPoints: [],    // [{ x, y }]
  marchingAntsOffset: 0,

  // Wand Settings
  wandTolerance: 32,
  wandContiguous: true,

  // Crop Tool State
  isCropping: false,
  cropBox: null,      // { x, y, w, h }
  cropPreset: "free", // "free" | "1:1" | "4:3" | "16:9"

  // Clone Stamp State
  cloneSource: null,  // { x, y }

  // Blur / Sharpen State
  blurMode: "blur",   // "blur" | "sharpen"
  blurStrength: 0.5,

  // Move Tool State
  isMovingLayer: false,
  moveStartX: 0,
  moveStartY: 0,

  // Gradient Tool State
  gradientType: "linear", // "linear" | "radial"
  gradientFill: "fg-bg",  // "fg-bg" | "fg-trans"

  // Shape Tool State
  shapeType: "rect",      // "rect" | "ellipse" | "line" | "roundrect"
  shapeFilled: true,

  // Dodge / Burn State
  dodgeMode: "dodge",     // "dodge" | "burn"
  dodgeExposure: 0.3,

  // Pen Tool State
  penPoints: [],          // [{ x, y }]
  penStrokeWidth: 2,

  // Type Tool State
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
  fontSize: 48,
  fontWeight: "normal",   // "normal" | "bold"
  fontStyle: "normal",    // "normal" | "italic"
  textAlign: "left",      // "left" | "center" | "right"
  fontColor: null,        // hex string or null (defaults to fgColor)
  textEditing: false,
  textX: 0,
  textY: 0,

  // Eyedropper State
  eyedropperSampleSize: 1,

  init() {
    this.select("brush");
    this.setupDrawingCanvas();
    this.setupTextEditorEvents();
    this.startMarchingAntsLoop();
  },

  select(toolName) {
    // If we were cropping and switched away, cancel crop
    if (this.isCropping && toolName !== "crop") {
      this.cancelCrop();
    }

    // If we were editing text and switched away, commit text
    if (this.textEditing && toolName !== "text") {
      this.commitTextEdit();
    }

    this.currentTool = toolName;

    // Highlight in Left Toolbar
    document.querySelectorAll(".tool-btn").forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-tool") === toolName);
    });

    // Update Top Options Bar
    this.updateOptionsBar(toolName);

    // Update cursor style and indicators
    this.updateCursorVisibility();

    // If crop selected, activate full crop box if none exists
    if (toolName === "crop" && !this.cropBox) {
      this.isCropping = true;
      this.cropBox = {
        x: Math.round(Layers.docWidth * 0.05),
        y: Math.round(Layers.docHeight * 0.05),
        w: Math.round(Layers.docWidth * 0.9),
        h: Math.round(Layers.docHeight * 0.9)
      };
      this.renderSelectionOverlay();
    }
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
      healing: { name: t("tool_healing"), icon: svgWrap('<rect x="3.5" y="7.5" width="13" height="5" rx="2.5" transform="rotate(-45 10 10)"/><circle cx="10" cy="10" r="0.8" fill="currentColor"/>') },
      brush: { name: t("tool_brush"), icon: svgWrap('<path d="M16.5 3.5a2.12 2.12 0 0 0-3 0L7 10l-1 4 4-1 6.5-6.5a2.12 2.12 0 0 0 0-3zM7 10l3 3M3 17c1.5 0 2.5-.5 3-1.5L5 14.5 3.5 13C2.5 13.5 2 14.5 2 16a1 1 0 0 0 1 1z"/>') },
      stamp: { name: t("tool_stamp"), icon: svgWrap('<path d="M7 3h6v3H7zM10 6v5M5 11h10v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM4 17h12"/>') },
      "history-brush": { name: t("tool_history_brush"), icon: svgWrap('<path d="M4 8a6 6 0 1 1 1.5 4M4 4v4h4M12 8l4.5-4.5a1.5 1.5 0 0 1 2.1 2.1L14 10"/>') },
      eraser: { name: t("tool_eraser"), icon: svgWrap('<path d="M14.5 3.5l3 3-9 9H4l-1.5-1.5 8-8 4-2.5zM7.5 10.5l3 3M2 18h16"/>') },
      gradient: { name: t("tool_gradient"), icon: svgWrap('<rect x="3" y="3" width="14" height="14" rx="2"/><path d="M3 17L17 3M3 11L11 3M9 17L17 9"/>') },
      bucket: { name: t("tool_bucket"), icon: svgWrap('<path d="M5 9l5-5 5.5 5.5-5 5zM3 11l6.5-6.5M10.5 14.5l-2.5 2.5a2 2 0 0 1-3-3l2.5-2.5M16 14a1.5 1.5 0 1 1-3 0c0-1.5 1.5-3 1.5-3s1.5 1.5 1.5 3z"/>') },
      dodge: { name: t("tool_dodge"), icon: svgWrap('<circle cx="9" cy="9" r="5"/><path d="M13 13l4.5 4.5"/>') },
      "blur-sharpen": { name: t("tool_blur_sharpen") || "Blur / Sharpen (R)", icon: svgWrap('<circle cx="10" cy="10" r="5"/><path d="M10 2v3M10 15v3M2 10h3M15 10h3"/>') },
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
    if (tool === "brush" || tool === "eraser" || tool === "stamp" || tool === "healing" || tool === "history-brush") {
      const isStamp = tool === "stamp";
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

          ${isStamp ? `<span class="opt-stamp-hint" style="color:var(--ps-accent-bright); font-size:11px; margin-left:12px;">${this.cloneSource ? `🎯 Source: (${Math.round(this.cloneSource.x)}, ${Math.round(this.cloneSource.y)})` : `⌥ Alt+Click to set clone source`}</span>` : ""}
        </div>
      `;
    } else if (tool === "blur-sharpen") {
      container.innerHTML = `
        <div class="opt-group">
          <label>${t("opt_mode")}</label>
          <select class="ps-select" onchange="Tools.blurMode = this.value">
            <option value="blur" ${this.blurMode === 'blur' ? 'selected' : ''}>Blur</option>
            <option value="sharpen" ${this.blurMode === 'sharpen' ? 'selected' : ''}>Sharpen</option>
          </select>
          <label style="margin-left:12px">${t("opt_size")}</label>
          <input type="range" min="5" max="300" value="${this.brushSize}" oninput="Tools.setBrushSize(this.value)">
          <span class="opt-val">${this.brushSize} px</span>
          <label style="margin-left:12px">Strength:</label>
          <input type="range" min="10" max="100" value="${Math.round(this.blurStrength * 100)}" oninput="Tools.blurStrength = this.value / 100; this.nextElementSibling.innerText = this.value + '%'">
          <span class="opt-val">${Math.round(this.blurStrength * 100)}%</span>
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
          <button class="ps-btn secondary" style="margin-left:12px; height:22px; padding:0 10px; font-size:11px; font-weight:600;" onclick="Selection.deselect(true)">${t("btn_deselect")}</button>
        </div>
      `;
    } else if (tool === "lasso") {
      container.innerHTML = `
        <div class="opt-group">
          <span style="font-size:11.5px; color:var(--ps-text-main);">${t("status_lasso_hint")}</span>
          <button class="ps-btn secondary" style="margin-left:14px; height:22px; padding:0 10px; font-size:11px; font-weight:600;" onclick="Selection.deselect(true)">${t("btn_deselect")}</button>
        </div>
      `;
    } else if (tool === "wand") {
      container.innerHTML = `
        <div class="opt-group">
          <label>${t("opt_tolerance")}</label>
          <input type="range" min="0" max="120" value="${this.wandTolerance}" oninput="Tools.wandTolerance = parseInt(this.value, 10); this.nextElementSibling.innerText = this.value">
          <span class="opt-val">${this.wandTolerance}</span>
          <label style="margin-left:12px"><input type="checkbox" ${this.wandContiguous ? 'checked' : ''} onchange="Tools.wandContiguous = this.checked"> ${t("opt_contiguous")}</label>
          <button class="ps-btn secondary" style="margin-left:14px; height:22px; padding:0 10px; font-size:11px; font-weight:600;" onclick="Selection.deselect(true)">${t("btn_deselect")}</button>
        </div>
      `;
    } else if (tool === "crop") {
      container.innerHTML = `
        <div class="opt-group">
          <label>Preset:</label>
          <select class="ps-select" onchange="Tools.setCropPreset(this.value)">
            <option value="free">Freeform</option>
            <option value="1:1">Square (1:1)</option>
            <option value="4:3">4:3 Standard</option>
            <option value="16:9">16:9 Widescreen</option>
          </select>
          <button class="ps-btn primary" style="margin-left:12px; height:22px; padding:0 12px; font-size:11px; font-weight:600;" onclick="Tools.applyCrop()">${t("btn_apply_crop")}</button>
          <button class="ps-btn secondary" style="margin-left:8px; height:22px; padding:0 10px; font-size:11px;" onclick="Tools.cancelCrop()">${t("btn_cancel_crop")}</button>
        </div>
      `;
    } else if (tool === "move") {
      container.innerHTML = `
        <div class="opt-group">
          <label><input type="checkbox" checked disabled> Auto-Select Layer</label>
          <span style="margin-left:14px; font-size:11px; color:var(--ps-text-dim);">Click & drag on canvas to move active layer content.</span>
        </div>
      `;
    } else if (tool === "eyedropper") {
      const fg = window.ColorPicker ? ColorPicker.getFgColor() : "#ffffff";
      container.innerHTML = `
        <div class="opt-group">
          <label>${t("opt_sample_size")}</label>
          <select class="ps-select" onchange="Tools.eyedropperSampleSize = parseInt(this.value, 10)">
            <option value="1">Point Sample (1×1)</option>
            <option value="3">3×3 Average</option>
            <option value="5">5×5 Average</option>
          </select>
          <div style="display:inline-flex; align-items:center; gap:6px; margin-left:16px;">
            <span>Current:</span>
            <div id="opt-color-chip" style="width:16px; height:16px; border-radius:3px; background:${fg}; border:1px solid rgba(255,255,255,0.4);"></div>
            <strong id="opt-color-hex" style="font-family:monospace; font-size:11px;">${fg.toUpperCase()}</strong>
          </div>
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
      const fg = window.ColorPicker ? ColorPicker.getFgColor() : "#ffffff";
      const isBold = this.fontWeight === "bold";
      const isItalic = this.fontStyle === "italic";
      const align = this.textAlign || "left";
      const activeColor = this.fontColor || fg;

      const fonts = [
        // Sans-Serif
        { name: "SF Pro / System", val: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" },
        { name: "Helvetica Neue", val: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
        { name: "Arial", val: "Arial, sans-serif" },
        { name: "Inter", val: "Inter, -apple-system, sans-serif" },
        { name: "Trebuchet MS", val: "'Trebuchet MS', sans-serif" },
        { name: "Verdana", val: "Verdana, sans-serif" },
        { name: "Futura", val: "Futura, 'Trebuchet MS', sans-serif" },
        { name: "Avenir Next", val: "'Avenir Next', Avenir, sans-serif" },
        { name: "Impact", val: "Impact, Charcoal, sans-serif" },
        { name: "Gill Sans", val: "'Gill Sans', 'Gill Sans MT', sans-serif" },
        { name: "Optima", val: "Optima, sans-serif" },
        // Serif
        { name: "Georgia", val: "Georgia, serif" },
        { name: "Times New Roman", val: "'Times New Roman', Times, serif" },
        { name: "Palatino", val: "Palatino, 'Palatino Linotype', serif" },
        { name: "Garamond", val: "Garamond, 'Baskerville Old Face', serif" },
        { name: "Baskerville", val: "Baskerville, serif" },
        { name: "Didot", val: "Didot, 'Bodoni MT', serif" },
        { name: "Playfair Display", val: "'Playfair Display', Georgia, serif" },
        { name: "Charter", val: "Charter, serif" },
        // Monospace
        { name: "Menlo", val: "Menlo, Monaco, monospace" },
        { name: "Monaco", val: "Monaco, Consolas, monospace" },
        { name: "Courier New", val: "'Courier New', Courier, monospace" },
        // Script & Decorative
        { name: "Comic Sans MS", val: "'Comic Sans MS', cursive" },
        { name: "Copperplate", val: "Copperplate, 'Copperplate Gothic Bold', fantasy" },
        { name: "Papyrus", val: "Papyrus, fantasy" },
        { name: "Brush Script MT", val: "'Brush Script MT', cursive" },
        { name: "Snell Roundhand", val: "'Snell Roundhand', cursive" }
      ];

      const fontOptions = fonts.map(f => {
        const isSel = this.fontFamily === f.val ? "selected" : "";
        return `<option value="${f.val}" ${isSel} style="font-family:${f.val}">${f.name}</option>`;
      }).join("");

      container.innerHTML = `
        <div class="opt-group" style="display:flex; align-items:center; gap:8px;">
          <label>${t("opt_font")}</label>
          <select class="ps-select" style="min-width:145px; font-weight:500;" onchange="Tools.setTextFont(this.value)">
            ${fontOptions}
          </select>

          <label style="margin-left:4px">${t("opt_size")}</label>
          <input type="number" class="ps-num-input" style="width:58px" value="${this.fontSize}" min="6" max="300" oninput="Tools.setTextSize(this.value)">
          <span class="opt-val">pt</span>

          <!-- Bold Toggle -->
          <button class="ps-btn secondary tool-opt-toggle ${isBold ? 'active-opt' : ''}" style="width:26px; height:24px; padding:0; font-weight:800; font-family:serif;" title="Bold (B)" onclick="Tools.toggleTextBold()">
            B
          </button>

          <!-- Italic Toggle -->
          <button class="ps-btn secondary tool-opt-toggle ${isItalic ? 'active-opt' : ''}" style="width:26px; height:24px; padding:0; font-style:italic; font-family:serif;" title="Italic (I)" onclick="Tools.toggleTextItalic()">
            I
          </button>

          <!-- Alignment Buttons -->
          <div style="display:inline-flex; border:1px solid var(--ps-border-dark); border-radius:4px; overflow:hidden; margin-left:2px;">
            <button class="ps-btn secondary ${align === 'left' ? 'active-opt' : ''}" style="height:24px; width:26px; padding:0; border-radius:0; border:none;" title="Align Left" onclick="Tools.setTextAlign('left')">
              <svg viewBox="0 0 16 16" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="10" y2="8"/><line x1="2" y1="12" x2="13" y2="12"/></svg>
            </button>
            <button class="ps-btn secondary ${align === 'center' ? 'active-opt' : ''}" style="height:24px; width:26px; padding:0; border-radius:0; border:none; border-left:1px solid var(--ps-border-dark); border-right:1px solid var(--ps-border-dark);" title="Align Center" onclick="Tools.setTextAlign('center')">
              <svg viewBox="0 0 16 16" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;"><line x1="2" y1="4" x2="14" y2="4"/><line x1="4" y1="8" x2="12" y2="8"/><line x1="3" y1="12" x2="13" y2="12"/></svg>
            </button>
            <button class="ps-btn secondary ${align === 'right' ? 'active-opt' : ''}" style="height:24px; width:26px; padding:0; border-radius:0; border:none;" title="Align Right" onclick="Tools.setTextAlign('right')">
              <svg viewBox="0 0 16 16" style="width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;"><line x1="2" y1="4" x2="14" y2="4"/><line x1="6" y1="8" x2="14" y2="8"/><line x1="3" y1="12" x2="14" y2="12"/></svg>
            </button>
          </div>

          <!-- Color Chip -->
          <div style="display:inline-flex; align-items:center; gap:5px; margin-left:4px; cursor:pointer;" title="Change Text Color" onclick="document.getElementById('native-color-input')?.click()">
            <div id="opt-text-color-chip" style="width:20px; height:20px; border-radius:4px; background:${activeColor}; border:1px solid rgba(255,255,255,0.4); box-shadow:0 1px 3px rgba(0,0,0,0.5);"></div>
          </div>

          <!-- Live Commit / Cancel Actions -->
          ${this.textEditing ? `
            <div style="display:inline-flex; align-items:center; gap:6px; margin-left:10px;">
              <button class="ps-btn primary" style="height:24px; padding:0 10px; font-size:11px; font-weight:600; background:#10b981; border-color:#059669;" title="Commit Text (Enter / ⌘Enter)" onclick="Tools.commitTextEdit()">
                ✓ Commit
              </button>
              <button class="ps-btn secondary" style="height:24px; padding:0 8px; font-size:11px;" title="Cancel Text (Esc)" onclick="Tools.cancelTextEdit()">
                ✕ Cancel
              </button>
            </div>
          ` : `
            <span style="font-size:11px; color:var(--ps-text-dim); margin-left:8px;">
              Click canvas to write
            </span>
          `}
        </div>
      `;
    } else if (tool === "pen") {
      container.innerHTML = `
        <div class="opt-group">
          <label>Stroke Width:</label>
          <input type="number" class="ps-num-input" style="width:50px" value="${this.penStrokeWidth}" min="1" max="50" onchange="Tools.penStrokeWidth = parseInt(this.value, 10)"> px
          <button class="ps-btn secondary" style="margin-left:12px; height:22px; padding:0 10px; font-size:11px;" onclick="Tools.convertPenToSelection()">Convert to Selection</button>
          <button class="ps-btn secondary" style="margin-left:8px; height:22px; padding:0 8px; font-size:11px;" onclick="Tools.cancelPen()">Clear Path (Esc)</button>
        </div>
      `;
    } else if (tool === "zoom") {
      container.innerHTML = `
        <div class="opt-group">
          <button class="ps-btn secondary" style="height:22px; padding:0 8px; font-size:11px;" onclick="Canvas.zoomIn()">Zoom In (+)</button>
          <button class="ps-btn secondary" style="margin-left:6px; height:22px; padding:0 8px; font-size:11px;" onclick="Canvas.zoomOut()">Zoom Out (-)</button>
          <button class="ps-btn secondary" style="margin-left:6px; height:22px; padding:0 8px; font-size:11px;" onclick="Canvas.fitToScreen()">Fit Screen (⌘0)</button>
          <button class="ps-btn secondary" style="margin-left:6px; height:22px; padding:0 8px; font-size:11px;" onclick="Canvas.actualPixels()">100% (⌘1)</button>
        </div>
      `;
    } else if (tool === "hand") {
      container.innerHTML = `<span style="color:var(--ps-text-main); font-size:11.5px;">Click & drag to pan the canvas, or hold Spacebar in any tool.</span>`;
    } else if (tool === "bucket") {
      container.innerHTML = `
        <div class="opt-group">
          <label>Tolerance:</label>
          <input type="range" min="0" max="100" value="${this.wandTolerance}" oninput="Tools.wandTolerance = parseInt(this.value, 10); this.nextElementSibling.innerText = this.value">
          <span class="opt-val">${this.wandTolerance}</span>
          <span style="margin-left:14px; font-size:11px; color:var(--ps-text-dim);">Click anywhere to flood fill contiguous pixels with foreground color.</span>
        </div>
      `;
    }
  },

  setBrushSize(val) {
    this.brushSize = Math.max(1, Math.min(1000, parseInt(val, 10)));
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

  // Dynamic Brush Cursor Tracker
  updateCursorVisibility() {
    const stage = document.getElementById("canvas-stage");
    const cursor = document.getElementById("brush-cursor");
    const loupe = document.getElementById("eyedropper-loupe");
    if (!stage) return;

    const brushLike = ["brush", "eraser", "stamp", "healing", "dodge", "history-brush", "blur-sharpen"].includes(this.currentTool);

    if (cursor) {
      cursor.style.display = brushLike ? "block" : "none";
    }
    if (loupe && this.currentTool !== "eyedropper") {
      loupe.style.display = "none";
    }

    if (brushLike) {
      stage.style.cursor = "none";
    } else if (this.currentTool === "hand") {
      stage.style.cursor = "grab";
    } else if (this.currentTool === "zoom") {
      stage.style.cursor = "zoom-in";
    } else if (this.currentTool === "move") {
      stage.style.cursor = "move";
    } else if (this.currentTool === "text") {
      stage.style.cursor = "text";
    } else if (this.currentTool === "eyedropper") {
      stage.style.cursor = "crosshair";
    } else {
      stage.style.cursor = "crosshair";
    }
  },

  updateBrushCursorPos(e) {
    const cursor = document.getElementById("brush-cursor");
    const loupe = document.getElementById("eyedropper-loupe");

    const brushLike = ["brush", "eraser", "stamp", "healing", "dodge", "history-brush", "blur-sharpen"].includes(this.currentTool);

    if (cursor) {
      if (brushLike) {
        cursor.style.display = "block";
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
        this.updateBrushCursorSize();
      } else {
        cursor.style.display = "none";
      }
    }

    if (this.currentTool === "eyedropper" && loupe) {
      loupe.style.display = "flex";
      loupe.style.left = `${e.clientX}px`;
      loupe.style.top = `${e.clientY}px`;
      const coords = Canvas.getCanvasCoords(e);
      this.updateLoupeColor(coords.x, coords.y);
    } else if (loupe) {
      loupe.style.display = "none";
    }
  },

  updateBrushCursorSize() {
    const cursor = document.getElementById("brush-cursor");
    if (!cursor) return;
    const diameter = Math.max(4, this.brushSize * Canvas.zoom);
    cursor.style.width = `${diameter}px`;
    cursor.style.height = `${diameter}px`;
  },

  updateLoupeColor(x, y) {
    const hex = this.getPixelColorAt(x, y);
    const colorEl = document.getElementById("loupe-color-preview");
    const hexEl = document.getElementById("loupe-hex-text");
    if (colorEl) colorEl.style.backgroundColor = hex;
    if (hexEl) hexEl.innerText = hex.toUpperCase();
  },

  getPixelColorAt(x, y) {
    const temp = document.createElement("canvas");
    temp.width = 1;
    temp.height = 1;
    const tCtx = temp.getContext("2d");
    const rx = Math.round(x);
    const ry = Math.round(y);

    Layers.layers.forEach(l => {
      if (l.visible) {
        tCtx.globalAlpha = l.opacity;
        tCtx.drawImage(l.canvas, -rx, -ry);
      }
    });

    const p = tCtx.getImageData(0, 0, 1, 1).data;
    if (p[3] === 0) return "#ffffff";
    return ColorPicker.rgbToHex(p[0], p[1], p[2]);
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
      const loupe = document.getElementById("eyedropper-loupe");
      if (loupe) loupe.style.display = "none";
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

      // Handle Lasso Tool
      if (this.currentTool === "lasso") {
        this.isSelecting = true;
        this.lassoPoints = [{ x: coords.x, y: coords.y }];
        return;
      }

      // Handle Magic Wand Tool
      if (this.currentTool === "wand") {
        this.applyMagicWand(coords.x, coords.y);
        return;
      }

      // Handle Crop Tool
      if (this.currentTool === "crop") {
        this.isCropping = true;
        this.cropBox = { x: coords.x, y: coords.y, w: 0, h: 0 };
        return;
      }

      // Handle Move Tool
      if (this.currentTool === "move") {
        const activeLayer = Layers.getActiveLayer();
        if (activeLayer && !activeLayer.locked) {
          this.isMovingLayer = true;
          this.moveStartX = coords.x;
          this.moveStartY = coords.y;
        }
        return;
      }

      // Handle Eyedropper
      if (this.currentTool === "eyedropper") {
        this.sampleColor(coords.x, coords.y);
        return;
      }

      // Handle Text Tool (Photoshop-Grade On-Canvas Insertion)
      if (this.currentTool === "text") {
        if (e.target.id === "canvas-text-editor" || e.target.closest("#canvas-text-editor")) {
          return;
        }
        if (this.textEditing) {
          this.commitTextEdit();
        }
        this.startInlineTextEdit(coords.x, coords.y);
        return;
      }

      // Handle Pen Tool
      if (this.currentTool === "pen") {
        this.penPoints.push({ x: coords.x, y: coords.y });
        this.renderSelectionOverlay();
        return;
      }

      // Handle Clone Stamp Option/Alt Click to set source point
      if (this.currentTool === "stamp" && e.altKey) {
        this.cloneSource = { x: coords.x, y: coords.y };
        this.updateOptionsBar("stamp");
        this.renderSelectionOverlay();
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

      // Handle Layer-drawing tools
      const activeLayer = Layers.getActiveLayer();
      if (!activeLayer || !activeLayer.visible || activeLayer.locked) return;

      this.isDrawing = true;

      if (this.currentTool === "brush") {
        this.paintDot(activeLayer.ctx, coords.x, coords.y, ColorPicker.getFgColor());
      } else if (this.currentTool === "eraser") {
        this.eraseDot(activeLayer.ctx, coords.x, coords.y);
      } else if (this.currentTool === "stamp") {
        if (!this.cloneSource) {
          this.cloneSource = { x: coords.x, y: coords.y };
        }
        this.stampDot(activeLayer.ctx, coords.x, coords.y);
      } else if (this.currentTool === "healing") {
        this.healingDot(activeLayer.ctx, coords.x, coords.y);
      } else if (this.currentTool === "blur-sharpen") {
        this.blurSharpenDot(activeLayer.ctx, coords.x, coords.y);
      } else if (this.currentTool === "bucket") {
        this.floodFill(activeLayer.ctx, Math.round(coords.x), Math.round(coords.y), ColorPicker.getFgColor());
        Layers.renderLayersPanel();
        History.pushState("action_paint_bucket", null, "bucket");
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
      if (this.isSelecting && this.currentTool === "marquee") {
        let w = Math.abs(coords.x - this.startX);
        let h = Math.abs(coords.y - this.startY);
        if (this.marqueeStyle === "fixed-ratio") {
          const side = Math.max(w, h);
          w = side;
          h = side;
        }
        const x = coords.x >= this.startX ? this.startX : this.startX - w;
        const y = coords.y >= this.startY ? this.startY : this.startY - h;
        this.selectionBox = { x, y, w, h };
        this.renderSelectionOverlay();
        return;
      }

      // Interactive Lasso Drag Line
      if (this.isSelecting && this.currentTool === "lasso") {
        this.lassoPoints.push({ x: coords.x, y: coords.y });
        this.renderSelectionOverlay();
        return;
      }

      // Interactive Crop Drag
      if (this.isCropping && this.currentTool === "crop") {
        const x = Math.min(this.startX, coords.x);
        const y = Math.min(this.startY, coords.y);
        const w = Math.abs(coords.x - this.startX);
        const h = Math.abs(coords.y - this.startY);
        this.cropBox = { x, y, w, h };
        this.renderSelectionOverlay();
        return;
      }

      // Interactive Move Tool Drag
      if (this.isMovingLayer && this.currentTool === "move") {
        const active = Layers.getActiveLayer();
        if (active && !active.locked) {
          const dx = coords.x - this.lastX;
          const dy = coords.y - this.lastY;
          this.shiftLayerCanvas(active, dx, dy);
          this.renderSelectionOverlay();
        }
        this.lastX = coords.x;
        this.lastY = coords.y;
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
      } else if (this.currentTool === "stamp") {
        this.stampLine(activeLayer.ctx, this.lastX, this.lastY, coords.x, coords.y);
      } else if (this.currentTool === "healing") {
        this.healingLine(activeLayer.ctx, this.lastX, this.lastY, coords.x, coords.y);
      } else if (this.currentTool === "blur-sharpen") {
        this.blurSharpenLine(activeLayer.ctx, this.lastX, this.lastY, coords.x, coords.y);
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

      // Finish Selection (Marquee)
      if (this.isSelecting && this.currentTool === "marquee") {
        this.isSelecting = false;
        // Clicking without dragging (<4px) deselects cleanly!
        if (this.selectionBox && (this.selectionBox.w < 4 || this.selectionBox.h < 4)) {
          Selection.deselect(true);
        } else {
          Selection.activeBox = this.selectionBox;
          History.pushState("action_marquee_select", null, "marquee");
        }
        return;
      }

      // Finish Selection (Lasso)
      if (this.isSelecting && this.currentTool === "lasso") {
        this.isSelecting = false;
        if (this.lassoPoints.length < 5) {
          Selection.deselect(true);
        } else {
          let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
          this.lassoPoints.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          });
          const w = maxX - minX;
          const h = maxY - minY;
          if (w > 4 && h > 4) {
            Selection.activeBox = { x: minX, y: minY, w, h };
            History.pushState("action_lasso_select", null, "lasso");
          } else {
            Selection.deselect(true);
          }
        }
        return;
      }

      // Finish Crop Tool drag
      if (this.isCropping && this.currentTool === "crop") {
        if (this.cropBox && (this.cropBox.w < 10 || this.cropBox.h < 10)) {
          this.cropBox = {
            x: Math.round(Layers.docWidth * 0.05),
            y: Math.round(Layers.docHeight * 0.05),
            w: Math.round(Layers.docWidth * 0.9),
            h: Math.round(Layers.docHeight * 0.9)
          };
        }
        this.renderSelectionOverlay();
        return;
      }

      // Finish Move Tool
      if (this.isMovingLayer && this.currentTool === "move") {
        this.isMovingLayer = false;
        Layers.renderLayersPanel();
        History.pushState("action_move_layer", null, "move");
        this.renderSelectionOverlay();
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
          History.pushState("action_gradient", null, "gradient");
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
          History.pushState("action_shape", null, "shape");
        }
        return;
      }

      if (this.isDrawing) {
        this.isDrawing = false;
        Layers.renderLayersPanel();

        // Specific History entry for every tool!
        const toolActionMap = {
          brush: "action_brush_stroke",
          eraser: "action_eraser_stroke",
          stamp: "action_clone_stamp",
          healing: "action_spot_healing",
          "blur-sharpen": this.blurMode === "sharpen" ? "action_sharpen" : "action_blur",
          dodge: this.dodgeMode === "burn" ? "action_burn" : "action_dodge",
          "history-brush": "action_history_brush"
        };

        const actionKey = toolActionMap[this.currentTool] || "action_brush_stroke";
        History.pushState(actionKey, null, this.currentTool);
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

  // Clone Stamp Engine
  stampDot(ctx, x, y) {
    if (!this.cloneSource) return;
    const offsetX = x - this.startX;
    const offsetY = y - this.startY;
    const srcX = this.cloneSource.x + offsetX;
    const srcY = this.cloneSource.y + offsetY;
    const radius = Math.max(2, this.brushSize / 2);

    ctx.save();
    if (Selection.activeBox) {
      ctx.beginPath();
      ctx.rect(Selection.activeBox.x, Selection.activeBox.y, Selection.activeBox.w, Selection.activeBox.h);
      ctx.clip();
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.globalAlpha = this.brushOpacity;
    ctx.drawImage(ctx.canvas, srcX - radius, srcY - radius, radius * 2, radius * 2, x - radius, y - radius, radius * 2, radius * 2);
    ctx.restore();
  },

  stampLine(ctx, x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const step = Math.max(1, this.brushSize * 0.18);
    const steps = Math.max(1, Math.ceil(dist / step));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      this.stampDot(ctx, x, y);
    }
  },

  // Spot Healing Brush Engine
  healingDot(ctx, x, y) {
    const radius = Math.max(3, Math.round(this.brushSize / 2));
    const left = Math.max(0, Math.round(x - radius));
    const top = Math.max(0, Math.round(y - radius));
    const size = radius * 2;
    const width = Math.min(size, ctx.canvas.width - left);
    const height = Math.min(size, ctx.canvas.height - top);
    if (width <= 0 || height <= 0) return;

    // Blend pixels with neighborhood average (blur / median filter)
    const imgData = ctx.getImageData(left, top, width, height);
    const data = imgData.data;

    // Simple 3x3 box blur convolution on target area
    const copy = new Uint8ClampedArray(data);
    for (let py = 1; py < height - 1; py++) {
      for (let px = 1; px < width - 1; px++) {
        const d = Math.hypot(px - radius, py - radius);
        if (d > radius) continue;

        let r = 0, g = 0, b = 0, a = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((py + dy) * width + (px + dx)) * 4;
            r += copy[idx];
            g += copy[idx + 1];
            b += copy[idx + 2];
            a += copy[idx + 3];
          }
        }
        const pIdx = (py * width + px) * 4;
        data[pIdx] = Math.round(r / 9);
        data[pIdx + 1] = Math.round(g / 9);
        data[pIdx + 2] = Math.round(b / 9);
        data[pIdx + 3] = Math.round(a / 9);
      }
    }
    ctx.putImageData(imgData, left, top);
  },

  healingLine(ctx, x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const step = Math.max(2, this.brushSize * 0.25);
    const steps = Math.max(1, Math.ceil(dist / step));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      this.healingDot(ctx, x, y);
    }
  },

  // Blur / Sharpen Engine
  blurSharpenDot(ctx, x, y) {
    const radius = Math.max(3, Math.round(this.brushSize / 2));
    const left = Math.max(0, Math.round(x - radius));
    const top = Math.max(0, Math.round(y - radius));
    const size = radius * 2;
    const width = Math.min(size, ctx.canvas.width - left);
    const height = Math.min(size, ctx.canvas.height - top);
    if (width <= 2 || height <= 2) return;

    const imgData = ctx.getImageData(left, top, width, height);
    const data = imgData.data;
    const copy = new Uint8ClampedArray(data);
    const isSharpen = this.blurMode === "sharpen";

    for (let py = 1; py < height - 1; py++) {
      for (let px = 1; px < width - 1; px++) {
        const d = Math.hypot(px - radius, py - radius);
        if (d > radius) continue;

        const pIdx = (py * width + px) * 4;
        if (isSharpen) {
          // 3x3 Laplacian Sharpen
          const topIdx = ((py - 1) * width + px) * 4;
          const botIdx = ((py + 1) * width + px) * 4;
          const leftIdx = (py * width + (px - 1)) * 4;
          const rightIdx = (py * width + (px + 1)) * 4;

          for (let c = 0; c < 3; c++) {
            const centerVal = copy[pIdx + c];
            const laplacian = 5 * centerVal - copy[topIdx + c] - copy[botIdx + c] - copy[leftIdx + c] - copy[rightIdx + c];
            data[pIdx + c] = Math.max(0, Math.min(255, centerVal + (laplacian - centerVal) * this.blurStrength));
          }
        } else {
          // 3x3 Box Blur
          let r = 0, g = 0, b = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const idx = ((py + dy) * width + (px + dx)) * 4;
              r += copy[idx];
              g += copy[idx + 1];
              b += copy[idx + 2];
            }
          }
          data[pIdx] = Math.round(r / 9);
          data[pIdx + 1] = Math.round(g / 9);
          data[pIdx + 2] = Math.round(b / 9);
        }
      }
    }
    ctx.putImageData(imgData, left, top);
  },

  blurSharpenLine(ctx, x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const step = Math.max(2, this.brushSize * 0.25);
    const steps = Math.max(1, Math.ceil(dist / step));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      this.blurSharpenDot(ctx, x, y);
    }
  },

  // Shift Layer Canvas for Move Tool
  shiftLayerCanvas(layer, dx, dy) {
    const temp = document.createElement("canvas");
    temp.width = layer.width;
    temp.height = layer.height;
    temp.getContext("2d").drawImage(layer.canvas, 0, 0);

    layer.ctx.clearRect(0, 0, layer.width, layer.height);
    layer.ctx.drawImage(temp, dx, dy);
  },

  // Magic Wand Tool Detection
  applyMagicWand(startX, startY) {
    const active = Layers.getActiveLayer();
    if (!active) return;

    const sx = Math.round(startX);
    const sy = Math.round(startY);
    const w = active.width;
    const h = active.height;
    if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;

    const imgData = active.ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const idx = (sy * w + sx) * 4;
    const targetR = data[idx];
    const targetG = data[idx + 1];
    const targetB = data[idx + 2];
    const targetA = data[idx + 3];

    let minX = sx, maxX = sx, minY = sy, maxY = sy;
    const tol = this.wandTolerance;

    if (this.wandContiguous) {
      // Flood Fill region detection
      const queue = [[sx, sy]];
      const visited = new Uint8Array(w * h);

      while (queue.length > 0) {
        const [cx, cy] = queue.pop();
        const pIdx = cy * w + cx;
        if (visited[pIdx]) continue;
        visited[pIdx] = 1;

        const dIdx = pIdx * 4;
        const diff = Math.max(
          Math.abs(data[dIdx] - targetR),
          Math.abs(data[dIdx + 1] - targetG),
          Math.abs(data[dIdx + 2] - targetB),
          Math.abs(data[dIdx + 3] - targetA)
        );

        if (diff <= tol) {
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          if (cx > 0) queue.push([cx - 1, cy]);
          if (cx < w - 1) queue.push([cx + 1, cy]);
          if (cy > 0) queue.push([cx, cy - 1]);
          if (cy < h - 1) queue.push([cx, cy + 1]);
        }
      }
    } else {
      // Global color threshold
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const dIdx = (y * w + x) * 4;
          const diff = Math.max(
            Math.abs(data[dIdx] - targetR),
            Math.abs(data[dIdx + 1] - targetG),
            Math.abs(data[dIdx + 2] - targetB),
            Math.abs(data[dIdx + 3] - targetA)
          );
          if (diff <= tol) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
    }

    Selection.activeBox = {
      x: minX,
      y: minY,
      w: Math.max(1, maxX - minX + 1),
      h: Math.max(1, maxY - minY + 1)
    };

    this.renderSelectionOverlay();
    History.pushState("action_wand_select", null, "wand");
  },

  // Crop Controls
  setCropPreset(preset) {
    this.cropPreset = preset;
    if (!this.cropBox) return;

    if (preset === "1:1") {
      const side = Math.min(this.cropBox.w, this.cropBox.h);
      this.cropBox.w = side;
      this.cropBox.h = side;
    } else if (preset === "4:3") {
      this.cropBox.h = Math.round(this.cropBox.w * 0.75);
    } else if (preset === "16:9") {
      this.cropBox.h = Math.round(this.cropBox.w * (9 / 16));
    }
    this.renderSelectionOverlay();
  },

  applyCrop() {
    if (this.cropBox && window.Canvas && Canvas.cropTo) {
      Canvas.cropTo(this.cropBox);
    }
    this.cancelCrop();
  },

  cancelCrop() {
    this.isCropping = false;
    this.cropBox = null;
    this.clearOverlay();
  },

  // Pen Tool Helpers
  convertPenToSelection() {
    if (this.penPoints.length < 3) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    this.penPoints.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
    Selection.activeBox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
    this.cancelPen();
    History.pushState("action_pen", null, "pen");
  },

  cancelPen() {
    this.penPoints = [];
    this.clearOverlay();
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

  // Dodge & Burn Engine
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

  // ==================== PHOTOSHOP-GRADE INLINE CANVAS TEXT ENGINE ====================
  setupTextEditorEvents() {
    const editor = document.getElementById("canvas-text-editor");
    if (!editor) return;

    editor.addEventListener("keydown", (e) => {
      // Escape cancels edit
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this.cancelTextEdit();
        return;
      }
      // Cmd+Enter or Ctrl+Enter commits edit
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        this.commitTextEdit();
        return;
      }
    });

    // Prevent artboard canvas mousedown handlers from interfering while selecting/typing
    editor.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
  },

  startInlineTextEdit(x, y) {
    const editor = document.getElementById("canvas-text-editor");
    if (!editor) return;

    // Commit any currently active text edit first
    if (this.textEditing) {
      this.commitTextEdit();
    }

    this.textX = Math.round(x);
    this.textY = Math.round(y);
    this.textEditing = true;

    if (!this.fontColor) {
      this.fontColor = window.ColorPicker ? ColorPicker.getFgColor() : "#ffffff";
    }

    editor.style.left = `${this.textX}px`;
    editor.style.top = `${this.textY}px`;
    this.applyTextStylesToEditor();

    editor.innerText = "Piktura";
    editor.classList.remove("hidden");

    // Focus and select all content for immediate typing
    editor.focus();
    setTimeout(() => {
      try {
        const range = document.createRange();
        range.selectNodeContents(editor);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (err) {}
    }, 15);

    this.updateOptionsBar("text");
  },

  applyTextStylesToEditor() {
    const editor = document.getElementById("canvas-text-editor");
    if (!editor) return;
    editor.style.fontFamily = this.fontFamily;
    editor.style.fontSize = `${this.fontSize}px`;
    editor.style.fontWeight = this.fontWeight;
    editor.style.fontStyle = this.fontStyle;
    editor.style.textAlign = this.textAlign;
    editor.style.color = this.fontColor || (window.ColorPicker ? ColorPicker.getFgColor() : "#ffffff");
  },

  setTextFont(family) {
    this.fontFamily = family;
    this.applyTextStylesToEditor();
  },

  setTextSize(size) {
    this.fontSize = Math.max(6, Math.min(500, parseInt(size, 10) || 12));
    this.applyTextStylesToEditor();
  },

  toggleTextBold() {
    this.fontWeight = this.fontWeight === "bold" ? "normal" : "bold";
    this.applyTextStylesToEditor();
    this.updateOptionsBar("text");
  },

  toggleTextItalic() {
    this.fontStyle = this.fontStyle === "italic" ? "normal" : "italic";
    this.applyTextStylesToEditor();
    this.updateOptionsBar("text");
  },

  setTextAlign(align) {
    this.textAlign = align;
    this.applyTextStylesToEditor();
    this.updateOptionsBar("text");
  },

  setTextColor(hex) {
    this.fontColor = hex.startsWith("#") ? hex : "#" + hex;
    if (window.ColorPicker) {
      ColorPicker.setFgColor(this.fontColor);
    }
    this.applyTextStylesToEditor();
    const chip = document.getElementById("opt-text-color-chip");
    if (chip) chip.style.background = this.fontColor;
  },

  commitTextEdit() {
    const editor = document.getElementById("canvas-text-editor");
    if (!editor || !this.textEditing) return;

    const rawText = editor.innerText.trim();
    if (!rawText) {
      this.cancelTextEdit();
      return;
    }

    const active = Layers.getActiveLayer();
    if (!active || active.locked) {
      this.cancelTextEdit();
      return;
    }

    const lines = editor.innerText.split("\n");
    const ctx = active.ctx;
    ctx.save();
    ctx.fillStyle = this.fontColor || (window.ColorPicker ? ColorPicker.getFgColor() : "#ffffff");

    const stylePrefix = this.fontStyle === "italic" ? "italic " : "";
    const weightPrefix = this.fontWeight === "bold" ? "bold " : "";
    ctx.font = `${stylePrefix}${weightPrefix}${this.fontSize}px ${this.fontFamily}`;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = "top";

    const lineHeight = this.fontSize * 1.25;
    const editorW = editor.offsetWidth;

    let baseLineX = this.textX;
    if (this.textAlign === "center") {
      baseLineX = this.textX + (editorW / 2);
    } else if (this.textAlign === "right") {
      baseLineX = this.textX + editorW;
    }

    lines.forEach((line, idx) => {
      ctx.fillText(line, baseLineX, this.textY + (idx * lineHeight));
    });

    ctx.restore();

    // Reset and hide
    editor.innerText = "";
    editor.classList.add("hidden");
    this.textEditing = false;

    Layers.renderLayersPanel();
    History.pushState("action_type", null, "text", `"${rawText.substring(0, 15)}"`);
    this.updateOptionsBar("text");
  },

  cancelTextEdit() {
    const editor = document.getElementById("canvas-text-editor");
    if (editor) {
      editor.innerText = "";
      editor.classList.add("hidden");
    }
    this.textEditing = false;
    this.updateOptionsBar("text");
  },

  // Eyedropper Sampling
  sampleColor(x, y) {
    const hex = this.getPixelColorAt(x, y);
    ColorPicker.setFgColor(hex);
    this.updateOptionsBar("eyedropper");
    History.pushState("action_eyedropper", null, "eyedropper", hex.toUpperCase());
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
    const tol = this.wandTolerance;

    while (queue.length > 0) {
      const [cx, cy] = queue.pop();
      const pIdx = cy * w + cx;
      if (seen[pIdx]) continue;
      seen[pIdx] = 1;

      const dIdx = pIdx * 4;
      if (
        Math.abs(data[dIdx] - targetR) <= tol &&
        Math.abs(data[dIdx + 1] - targetG) <= tol &&
        Math.abs(data[dIdx + 2] - targetB) <= tol &&
        Math.abs(data[dIdx + 3] - targetA) <= tol
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

  // Overlays: Marching Ants, Crop, Lasso, Guides, Pen, Stamp Source
  startMarchingAntsLoop() {
    const loop = () => {
      this.marchingAntsOffset = (this.marchingAntsOffset + 0.5) % 8;
      if (Selection.activeBox || this.isSelecting || this.isCropping || (this.penPoints && this.penPoints.length > 0) || this.cloneSource) {
        this.renderSelectionOverlay();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  renderSelectionOverlay() {
    const overlay = document.getElementById("selection-overlay");
    if (!overlay) return;

    overlay.width = Layers.docWidth;
    overlay.height = Layers.docHeight;
    const ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    ctx.save();

    // 1. Render Crop Tool Overlay
    if (this.isCropping && this.cropBox) {
      const box = this.cropBox;
      // Darkened Backdrop outside crop box
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(0, 0, overlay.width, box.y);
      ctx.fillRect(0, box.y + box.h, overlay.width, overlay.height - (box.y + box.h));
      ctx.fillRect(0, box.y, box.x, box.h);
      ctx.fillRect(box.x + box.w, box.y, overlay.width - (box.x + box.w), box.h);

      // Crop Bounding Box Outline
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(box.x, box.y, box.w, box.h);

      // Rule-of-Thirds Grid inside crop
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(box.x + box.w / 3, box.y);
      ctx.lineTo(box.x + box.w / 3, box.y + box.h);
      ctx.moveTo(box.x + (box.w * 2) / 3, box.y);
      ctx.lineTo(box.x + (box.w * 2) / 3, box.y + box.h);
      ctx.moveTo(box.x, box.y + box.h / 3);
      ctx.lineTo(box.x + box.w, box.y + box.h / 3);
      ctx.moveTo(box.x, box.y + (box.h * 2) / 3);
      ctx.lineTo(box.x + box.w, box.y + (box.h * 2) / 3);
      ctx.stroke();
      ctx.setLineDash([]);

      // 8 Handles
      const handles = [
        [box.x, box.y], [box.x + box.w / 2, box.y], [box.x + box.w, box.y],
        [box.x, box.y + box.h / 2], [box.x + box.w, box.y + box.h / 2],
        [box.x, box.y + box.h], [box.x + box.w / 2, box.y + box.h], [box.x + box.w, box.y + box.h]
      ];
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      handles.forEach(([hx, hy]) => {
        ctx.fillRect(hx - 4, hy - 4, 8, 8);
        ctx.strokeRect(hx - 4, hy - 4, 8, 8);
      });
    }

    // 2. Render Selection Marching Ants (Marquee or Wand)
    const box = this.selectionBox || Selection.activeBox;
    if (box && (!this.isCropping || this.currentTool !== "crop")) {
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(box.x, box.y, box.w, box.h);

      ctx.strokeStyle = "#ffffff";
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -this.marchingAntsOffset;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.setLineDash([]);

      // Floating Dimensions Tag when dragging
      if (this.isSelecting) {
        const tagText = `${Math.round(box.w)} × ${Math.round(box.h)} px`;
        ctx.font = "bold 11px system-ui, sans-serif";
        const tagW = ctx.measureText(tagText).width + 12;
        const tagX = Math.min(overlay.width - tagW - 4, box.x + box.w + 6);
        const tagY = Math.min(overlay.height - 24, box.y + box.h + 6);

        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(tagX, tagY, tagW, 20);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(tagText, tagX + 6, tagY + 14);
      }
    }

    // 3. Render Freehand Lasso Path
    if (this.isSelecting && this.currentTool === "lasso" && this.lassoPoints.length > 1) {
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.lassoPoints[0].x, this.lassoPoints[0].y);
      for (let i = 1; i < this.lassoPoints.length; i++) {
        ctx.lineTo(this.lassoPoints[i].x, this.lassoPoints[i].y);
      }
      ctx.stroke();

      ctx.strokeStyle = "#ffffff";
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -this.marchingAntsOffset;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Render Pen Points & Line
    if (this.penPoints && this.penPoints.length > 0) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(this.penPoints[0].x, this.penPoints[0].y);
      for (let i = 1; i < this.penPoints.length; i++) {
        ctx.lineTo(this.penPoints[i].x, this.penPoints[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#1d4ed8";
      ctx.lineWidth = 1.5;
      this.penPoints.forEach(p => {
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
        ctx.strokeRect(p.x - 3, p.y - 3, 6, 6);
      });
    }

    // 5. Render Clone Stamp Source Marker
    if (this.cloneSource && this.currentTool === "stamp") {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.cloneSource.x, this.cloneSource.y, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.cloneSource.x - 12, this.cloneSource.y);
      ctx.lineTo(this.cloneSource.x + 12, this.cloneSource.y);
      ctx.moveTo(this.cloneSource.x, this.cloneSource.y - 12);
      ctx.lineTo(this.cloneSource.x, this.cloneSource.y + 12);
      ctx.stroke();
    }

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
      History.pushState("action_deselect", null, "select");
    } else {
      active.clear();
      Layers.renderLayersPanel();
      History.pushState("action_delete_layer", null, "layer");
    }
  },

  fill() {
    const active = Layers.getActiveLayer();
    if (!active || active.locked) return;

    active.ctx.save();
    active.ctx.fillStyle = ColorPicker.getFgColor();
    if (Selection.activeBox) {
      active.ctx.fillRect(Selection.activeBox.x, Selection.activeBox.y, Selection.activeBox.w, Selection.activeBox.h);
      History.pushState("action_paint_bucket", null, "bucket");
    } else {
      active.ctx.fillRect(0, 0, active.width, active.height);
      History.pushState("action_paint_bucket", null, "bucket");
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
    History.pushState("action_new_layer", null, "layer");
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

/**
 * Piktura Studio — Layer Effects (fx) Engine
 * Implements Photoshop-style non-destructive layer effects:
 * - Drop Shadow (Тень)
 * - Outer Glow (Внешнее свечение)
 * - Stroke (Обводка)
 * - Color Overlay (Наложение цвета)
 */

const Effects = {
  currentLayer: null,
  initialState: null,

  defaultEffects() {
    return {
      shadow: { enabled: false, color: "#000000", opacity: 0.75, angle: 120, distance: 10, blur: 14 },
      glow: { enabled: false, color: "#38bdf8", opacity: 0.85, blur: 20 },
      stroke: { enabled: false, color: "#ffffff", size: 3, opacity: 1.0 },
      colorOverlay: { enabled: false, color: "#3b82f6", opacity: 0.5, blendMode: "source-atop" }
    };
  },

  hexToRgba(hex, opacity = 1.0) {
    let c = hex.replace("#", "");
    if (c.length === 3) c = c.split("").map(x => x + x).join("");
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, opacity))})`;
  },

  getFilterString(layer) {
    if (!layer || !layer.effects) return "none";
    const fx = layer.effects;
    const filters = [];

    // 1. Drop Shadow
    if (fx.shadow && fx.shadow.enabled) {
      const rad = (fx.shadow.angle || 120) * (Math.PI / 180);
      const dist = fx.shadow.distance || 10;
      const dx = Math.round(dist * Math.cos(rad));
      const dy = Math.round(dist * Math.sin(rad));
      const blur = fx.shadow.blur || 14;
      const col = this.hexToRgba(fx.shadow.color || "#000000", fx.shadow.opacity || 0.75);
      filters.push(`drop-shadow(${dx}px ${dy}px ${blur}px ${col})`);
    }

    // 2. Outer Glow
    if (fx.glow && fx.glow.enabled) {
      const blur = fx.glow.blur || 20;
      const col = this.hexToRgba(fx.glow.color || "#38bdf8", fx.glow.opacity || 0.85);
      filters.push(`drop-shadow(0px 0px ${blur}px ${col})`);
      filters.push(`drop-shadow(0px 0px ${Math.round(blur * 0.5)}px ${col})`);
    }

    // 3. Stroke (8-direction tight drop-shadows)
    if (fx.stroke && fx.stroke.enabled && fx.stroke.size > 0) {
      const s = fx.stroke.size;
      const col = this.hexToRgba(fx.stroke.color || "#ffffff", fx.stroke.opacity || 1.0);
      const diag = Math.round(s * 0.707);
      filters.push(`drop-shadow(${s}px 0px 0px ${col})`);
      filters.push(`drop-shadow(-${s}px 0px 0px ${col})`);
      filters.push(`drop-shadow(0px ${s}px 0px ${col})`);
      filters.push(`drop-shadow(0px -${s}px 0px ${col})`);
      if (diag > 0) {
        filters.push(`drop-shadow(${diag}px ${diag}px 0px ${col})`);
        filters.push(`drop-shadow(-${diag}px ${diag}px 0px ${col})`);
        filters.push(`drop-shadow(${diag}px -${diag}px 0px ${col})`);
        filters.push(`drop-shadow(-${diag}px -${diag}px 0px ${col})`);
      }
    }

    return filters.length > 0 ? filters.join(" ") : "none";
  },

  applyToLayer(layer) {
    if (!layer || !layer.canvas) return;
    layer.canvas.style.filter = this.getFilterString(layer);
  },

  hasActiveEffects(layer) {
    if (!layer || !layer.effects) return false;
    const fx = layer.effects;
    return !!(
      (fx.shadow && fx.shadow.enabled) ||
      (fx.glow && fx.glow.enabled) ||
      (fx.stroke && fx.stroke.enabled) ||
      (fx.colorOverlay && fx.colorOverlay.enabled)
    );
  },

  showDialog(layer = null) {
    const target = layer || (window.Layers && Layers.getActiveLayer());
    if (!target) return;

    this.currentLayer = target;
    if (!target.effects) {
      target.effects = this.defaultEffects();
    }
    this.initialState = JSON.parse(JSON.stringify(target.effects));

    // Populate modal form values
    this.populateDialogValues();

    // Select first active tab or drop shadow by default
    this.selectTab("shadow");

    const modal = document.getElementById("modal-layer-effects");
    if (modal) modal.classList.remove("hidden");
  },

  populateDialogValues() {
    const fx = this.currentLayer.effects;

    // Drop Shadow
    this.setCheck("fx-shadow-enable", fx.shadow.enabled);
    this.setValue("fx-shadow-color", fx.shadow.color);
    this.setValue("fx-shadow-color-text", fx.shadow.color);
    this.setRange("fx-shadow-opacity", Math.round(fx.shadow.opacity * 100), "fx-shadow-opacity-val", "%");
    this.setRange("fx-shadow-angle", fx.shadow.angle, "fx-shadow-angle-val", "°");
    this.setRange("fx-shadow-dist", fx.shadow.distance, "fx-shadow-dist-val", " px");
    this.setRange("fx-shadow-blur", fx.shadow.blur, "fx-shadow-blur-val", " px");

    // Outer Glow
    this.setCheck("fx-glow-enable", fx.glow.enabled);
    this.setValue("fx-glow-color", fx.glow.color);
    this.setValue("fx-glow-color-text", fx.glow.color);
    this.setRange("fx-glow-opacity", Math.round(fx.glow.opacity * 100), "fx-glow-opacity-val", "%");
    this.setRange("fx-glow-blur", fx.glow.blur, "fx-glow-blur-val", " px");

    // Stroke
    this.setCheck("fx-stroke-enable", fx.stroke.enabled);
    this.setValue("fx-stroke-color", fx.stroke.color);
    this.setValue("fx-stroke-color-text", fx.stroke.color);
    this.setRange("fx-stroke-size", fx.stroke.size, "fx-stroke-size-val", " px");
    this.setRange("fx-stroke-opacity", Math.round(fx.stroke.opacity * 100), "fx-stroke-opacity-val", "%");

    // Color Overlay
    this.setCheck("fx-overlay-enable", fx.colorOverlay.enabled);
    this.setValue("fx-overlay-color", fx.colorOverlay.color);
    this.setValue("fx-overlay-color-text", fx.colorOverlay.color);
    this.setValue("fx-overlay-blend", fx.colorOverlay.blendMode || "source-atop");
    this.setRange("fx-overlay-opacity", Math.round(fx.colorOverlay.opacity * 100), "fx-overlay-opacity-val", "%");
  },

  selectTab(tabName) {
    document.querySelectorAll(".fx-nav-item").forEach(item => {
      item.classList.toggle("active", item.getAttribute("data-tab") === tabName);
    });
    document.querySelectorAll(".fx-tab-pane").forEach(pane => {
      pane.classList.toggle("active", pane.id === `fx-pane-${tabName}`);
    });
  },

  updateFromInputs() {
    if (!this.currentLayer) return;
    const fx = this.currentLayer.effects;

    // Drop Shadow
    fx.shadow.enabled = this.getCheck("fx-shadow-enable");
    fx.shadow.color = this.getValue("fx-shadow-color") || "#000000";
    fx.shadow.opacity = (parseInt(this.getValue("fx-shadow-opacity"), 10) || 75) / 100;
    fx.shadow.angle = parseInt(this.getValue("fx-shadow-angle"), 10) || 120;
    fx.shadow.distance = parseInt(this.getValue("fx-shadow-dist"), 10) || 10;
    fx.shadow.blur = parseInt(this.getValue("fx-shadow-blur"), 10) || 14;

    // Outer Glow
    fx.glow.enabled = this.getCheck("fx-glow-enable");
    fx.glow.color = this.getValue("fx-glow-color") || "#38bdf8";
    fx.glow.opacity = (parseInt(this.getValue("fx-glow-opacity"), 10) || 85) / 100;
    fx.glow.blur = parseInt(this.getValue("fx-glow-blur"), 10) || 20;

    // Stroke
    fx.stroke.enabled = this.getCheck("fx-stroke-enable");
    fx.stroke.color = this.getValue("fx-stroke-color") || "#ffffff";
    fx.stroke.size = parseInt(this.getValue("fx-stroke-size"), 10) || 3;
    fx.stroke.opacity = (parseInt(this.getValue("fx-stroke-opacity"), 10) || 100) / 100;

    // Color Overlay
    fx.colorOverlay.enabled = this.getCheck("fx-overlay-enable");
    fx.colorOverlay.color = this.getValue("fx-overlay-color") || "#3b82f6";
    fx.colorOverlay.blendMode = this.getValue("fx-overlay-blend") || "source-atop";
    fx.colorOverlay.opacity = (parseInt(this.getValue("fx-overlay-opacity"), 10) || 50) / 100;

    // Apply live preview to canvas
    this.applyToLayer(this.currentLayer);
    if (window.Layers) Layers.renderLayersPanel();
  },

  commit() {
    if (!this.currentLayer) return;
    this.applyToLayer(this.currentLayer);
    this.closeDialog();

    if (window.History) {
      History.pushState("action_layer_effects" || "Layer Style", null, "layer");
    }
    if (window.Layers) {
      Layers.renderLayersPanel();
    }
  },

  cancel() {
    if (!this.currentLayer) return;
    if (this.initialState) {
      this.currentLayer.effects = JSON.parse(JSON.stringify(this.initialState));
      this.applyToLayer(this.currentLayer);
    }
    this.closeDialog();
    if (window.Layers) {
      Layers.renderLayersPanel();
    }
  },

  closeDialog() {
    this.currentLayer = null;
    this.initialState = null;
    const modal = document.getElementById("modal-layer-effects");
    if (modal) modal.classList.add("hidden");
  },

  // Helper setters/getters
  setCheck(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
  },
  getCheck(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
  },
  setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  },
  getValue(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
  },
  setRange(id, val, labelId, suffix = "") {
    const el = document.getElementById(id);
    if (el) el.value = val;
    const lbl = document.getElementById(labelId);
    if (lbl) lbl.innerText = val + suffix;
  },

  // Drawing effects on export canvas
  drawLayerWithEffects(destCtx, layer, x, y) {
    if (!this.hasActiveEffects(layer)) {
      destCtx.drawImage(layer.canvas, x, y);
      return;
    }

    const fx = layer.effects;
    destCtx.save();

    // 1. Draw Drop Shadow if enabled
    if (fx.shadow && fx.shadow.enabled) {
      const rad = (fx.shadow.angle || 120) * (Math.PI / 180);
      const dist = fx.shadow.distance || 10;
      destCtx.shadowOffsetX = Math.round(dist * Math.cos(rad));
      destCtx.shadowOffsetY = Math.round(dist * Math.sin(rad));
      destCtx.shadowBlur = fx.shadow.blur || 14;
      destCtx.shadowColor = this.hexToRgba(fx.shadow.color || "#000000", fx.shadow.opacity || 0.75);
    }

    // 2. Draw Outer Glow if enabled (and no shadow override)
    if (fx.glow && fx.glow.enabled && (!fx.shadow || !fx.shadow.enabled)) {
      destCtx.shadowOffsetX = 0;
      destCtx.shadowOffsetY = 0;
      destCtx.shadowBlur = fx.glow.blur || 20;
      destCtx.shadowColor = this.hexToRgba(fx.glow.color || "#38bdf8", fx.glow.opacity || 0.85);
    }

    // Draw base layer
    destCtx.drawImage(layer.canvas, x, y);
    destCtx.restore();

    // 3. Draw Stroke if enabled
    if (fx.stroke && fx.stroke.enabled && fx.stroke.size > 0) {
      destCtx.save();
      const s = fx.stroke.size;
      const col = this.hexToRgba(fx.stroke.color || "#ffffff", fx.stroke.opacity || 1.0);
      destCtx.shadowColor = col;
      destCtx.shadowBlur = 0;

      const offsets = [
        [s, 0], [-s, 0], [0, s], [0, -s],
        [Math.round(s*0.7), Math.round(s*0.7)],
        [-Math.round(s*0.7), Math.round(s*0.7)],
        [Math.round(s*0.7), -Math.round(s*0.7)],
        [-Math.round(s*0.7), -Math.round(s*0.7)]
      ];
      for (const [ox, oy] of offsets) {
        destCtx.shadowOffsetX = ox;
        destCtx.shadowOffsetY = oy;
        destCtx.drawImage(layer.canvas, x, y);
      }
      destCtx.restore();
    }

    // 4. Color Overlay if enabled
    if (fx.colorOverlay && fx.colorOverlay.enabled) {
      destCtx.save();
      destCtx.globalCompositeOperation = fx.colorOverlay.blendMode || "source-atop";
      destCtx.globalAlpha = fx.colorOverlay.opacity || 0.5;
      destCtx.fillStyle = fx.colorOverlay.color || "#3b82f6";
      destCtx.fillRect(x, y, layer.width, layer.height);
      destCtx.restore();
    }
  }
};

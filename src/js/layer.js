/**
 * Piktura Studio — Layer & Compositing Engine
 */
class Layer {
  constructor(name, width, height, isBackground = false) {
    this.id = "layer_" + Math.random().toString(36).substr(2, 9);
    this.name = name || "Layer";
    this.width = width;
    this.height = height;
    this.opacity = 1.0;
    this.blendMode = "normal";
    this.visible = true;
    this.locked = false;
    this.isBackground = isBackground;
    this.isTextLayer = false;
    this.textData = null;
    this.mask = null; // Optional grayscale mask canvas

    // Non-destructive positional offset
    this.x = 0;
    this.y = 0;

    // The offscreen render canvas for this layer's pixel content
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.className = "layer-canvas";
    this.canvas.id = this.id;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

    if (isBackground) {
      this.ctx.fillStyle = "#ffffff";
      this.ctx.fillRect(0, 0, width, height);
    }
  }

  setOpacity(val) {
    this.opacity = Math.max(0, Math.min(1, val));
    this.canvas.style.opacity = this.opacity;
  }

  setBlendMode(mode) {
    this.blendMode = mode;
    this.canvas.style.mixBlendMode = mode;
  }

  toggleVisibility() {
    this.visible = !this.visible;
    this.canvas.style.display = this.visible ? "block" : "none";
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  clone() {
    const copy = new Layer(this.name + " copy", this.width, this.height);
    copy.opacity = this.opacity;
    copy.blendMode = this.blendMode;
    copy.visible = this.visible;
    copy.isTextLayer = this.isTextLayer;
    copy.textData = this.textData ? JSON.parse(JSON.stringify(this.textData)) : null;
    copy.x = this.x;
    copy.y = this.y;
    copy.ctx.drawImage(this.canvas, 0, 0);
    return copy;
  }
}

const Layers = {
  layers: [],
  activeLayerIndex: 0,
  docWidth: 1920,
  docHeight: 1080,

  init(width = 1920, height = 1080, bg = "white") {
    this.docWidth = width;
    this.docHeight = height;
    this.layers = [];

    // Create Background Layer
    const bgLayer = new Layer("Background", width, height, bg === "white");
    if (bg === "black") {
      bgLayer.ctx.fillStyle = "#000000";
      bgLayer.ctx.fillRect(0, 0, width, height);
    } else if (bg === "transparent") {
      bgLayer.clear();
    }
    this.layers.push(bgLayer);

    // Create Layer 1 (Transparent top layer)
    const layer1 = new Layer("Layer 1", width, height);
    this.layers.push(layer1);

    this.activeLayerIndex = 1;
    this.mountToDOM();
    this.renderLayersPanel();
  },

  mountToDOM() {
    const container = document.getElementById("layers-container");
    if (!container) return;
    container.innerHTML = "";

    // DOM order: index 0 is at bottom, highest index is at top
    this.layers.forEach((layer) => {
      layer.canvas.style.opacity = layer.opacity;
      layer.canvas.style.mixBlendMode = layer.blendMode;
      layer.canvas.style.display = layer.visible ? "block" : "none";
      layer.canvas.style.transform = `translate(${Math.round(layer.x || 0)}px, ${Math.round(layer.y || 0)}px)`;
      container.appendChild(layer.canvas);
    });
  },

  getActiveLayer() {
    if (this.activeLayerIndex >= 0 && this.activeLayerIndex < this.layers.length) {
      return this.layers[this.activeLayerIndex];
    }
    return null;
  },

  setActiveLayer(index) {
    if (index >= 0 && index < this.layers.length) {
      this.activeLayerIndex = index;
      this.updateLayerControls();
      this.renderLayersPanel();
    }
  },

  createLayer(name = null, pushHistory = true) {
    const layerNum = this.layers.length;
    const layer = new Layer(name || `Layer ${layerNum}`, this.docWidth, this.docHeight);
    
    // Insert directly above active layer
    const insertIdx = this.activeLayerIndex + 1;
    this.layers.splice(insertIdx, 0, layer);
    this.activeLayerIndex = insertIdx;

    this.mountToDOM();
    this.renderLayersPanel();
    if (pushHistory) {
      History.pushState("action_new_layer", null, "layer");
    }
    return layer;
  },

  duplicateActiveLayer() {
    const active = this.getActiveLayer();
    if (!active) return;
    const copy = active.clone();
    this.layers.splice(this.activeLayerIndex + 1, 0, copy);
    this.activeLayerIndex++;
    this.mountToDOM();
    this.renderLayersPanel();
    History.pushState("action_duplicate_layer", null, "layer", active.name);
  },

  deleteActiveLayer() {
    if (this.layers.length <= 1) {
      alert("Document must contain at least one layer.");
      return;
    }
    const deletedName = this.getActiveLayer().name;
    this.layers.splice(this.activeLayerIndex, 1);
    this.activeLayerIndex = Math.max(0, this.activeLayerIndex - 1);
    this.mountToDOM();
    this.renderLayersPanel();
    History.pushState("action_delete_layer", null, "layer", deletedName);
  },

  setActiveOpacity(percent) {
    const active = this.getActiveLayer();
    if (active) {
      active.setOpacity(percent / 100);
      History.pushState("Opacity Change", null, "layer", `${percent}%`);
    }
  },

  setActiveBlendMode(mode) {
    const active = this.getActiveLayer();
    if (active) {
      active.setBlendMode(mode);
      History.pushState("Blend Mode Change", null, "layer", mode);
    }
  },

  mergeDown() {
    if (this.activeLayerIndex <= 0) return;
    const topLayer = this.layers[this.activeLayerIndex];
    const bottomLayer = this.layers[this.activeLayerIndex - 1];

    bottomLayer.ctx.save();
    bottomLayer.ctx.globalAlpha = topLayer.opacity;
    bottomLayer.ctx.globalCompositeOperation = topLayer.blendMode === "normal" ? "source-over" : topLayer.blendMode;
    bottomLayer.ctx.drawImage(topLayer.canvas, Math.round(topLayer.x || 0), Math.round(topLayer.y || 0));
    bottomLayer.ctx.restore();

    this.layers.splice(this.activeLayerIndex, 1);
    this.activeLayerIndex--;
    this.mountToDOM();
    this.renderLayersPanel();
    History.pushState("action_merge_down", null, "layer");
  },

  mergeVisible() {
    if (this.layers.length <= 1) return;
    const merged = new Layer("Merged Visible", this.docWidth, this.docHeight);

    this.layers.forEach((layer) => {
      if (layer.visible) {
        merged.ctx.save();
        merged.ctx.globalAlpha = layer.opacity;
        merged.ctx.globalCompositeOperation = layer.blendMode === "normal" ? "source-over" : layer.blendMode;
        merged.ctx.drawImage(layer.canvas, Math.round(layer.x || 0), Math.round(layer.y || 0));
        merged.ctx.restore();
      }
    });

    this.layers = [merged];
    this.activeLayerIndex = 0;
    this.mountToDOM();
    this.renderLayersPanel();
    History.pushState("action_flatten_image", null, "layer");
  },

  flattenImage() {
    const flattened = new Layer("Background", this.docWidth, this.docHeight, true);
    this.layers.forEach((layer) => {
      if (layer.visible) {
        flattened.ctx.save();
        flattened.ctx.globalAlpha = layer.opacity;
        flattened.ctx.globalCompositeOperation = layer.blendMode === "normal" ? "source-over" : layer.blendMode;
        flattened.ctx.drawImage(layer.canvas, Math.round(layer.x || 0), Math.round(layer.y || 0));
        flattened.ctx.restore();
      }
    });
    this.layers = [flattened];
    this.activeLayerIndex = 0;
    this.mountToDOM();
    this.renderLayersPanel();
    History.pushState("action_flatten_image", null, "layer");
  },

  updateLayerControls() {
    const active = this.getActiveLayer();
    if (!active) return;

    const blendSelect = document.getElementById("layer-blend-mode");
    const opacityInput = document.getElementById("layer-opacity-input");

    if (blendSelect) blendSelect.value = active.blendMode;
    if (opacityInput) opacityInput.value = Math.round(active.opacity * 100);
  },

  findTextLayerAt(x, y) {
    // Check active layer first if it is a visible text layer
    const active = this.getActiveLayer();
    if (active && active.visible && active.isTextLayer && active.textData && active.textData.bbox) {
      const b = active.textData.bbox;
      const pad = 12;
      if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad) {
        return active;
      }
    }

    // Search all other visible text layers in top-to-bottom visual order (highest index to lowest)
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const l = this.layers[i];
      if (l.visible && l.isTextLayer && l.textData && l.textData.bbox) {
        const b = l.textData.bbox;
        const pad = 12;
        if (x >= b.x - pad && x <= b.x + b.w + pad && y >= b.y - pad && y <= b.y + b.h + pad) {
          return l;
        }
      }
    }
    return null;
  },

  editLayerText(index) {
    if (index >= 0 && index < this.layers.length) {
      const layer = this.layers[index];
      if (layer && layer.isTextLayer && layer.textData) {
        this.setActiveLayer(index);
        if (window.Tools) {
          Tools.select("text");
          Tools.startEditingTextLayer(layer);
        }
      }
    }
  },

  renderLayersPanel() {
    const stackEl = document.getElementById("layers-stack-list");
    if (!stackEl) return;

    // In Photoshop, layers list displays highest index at the top, index 0 at bottom
    const reversed = [...this.layers].map((layer, index) => ({ layer, index })).reverse();

    stackEl.innerHTML = reversed.map(({ layer, index }) => {
      const isActive = index === this.activeLayerIndex ? "active" : "";
      const eyeIcon = layer.visible ? "👁" : "—";
      const eyeClass = layer.visible ? "" : "hidden";
      const lockIcon = layer.isBackground ? "🔒" : "";
      const isText = layer.isTextLayer && layer.textData;

      const thumbContent = isText
        ? `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#1b2234; border-radius:2px;"><span style="font-weight:900; font-family:serif; font-size:16px; color:#60a5fa;">T</span></div>`
        : `<canvas id="thumb-cvs-${layer.id}" width="40" height="28"></canvas>`;

      return `
        <div class="layer-row ${isActive} ${isText ? 'text-layer-row' : ''}" 
             onclick="Layers.setActiveLayer(${index})" 
             ondblclick="Layers.editLayerText(${index})" 
             data-layer-idx="${index}"
             title="${isText ? 'Double-click to edit text' : ''}">
          <button class="layer-visibility-btn ${eyeClass}" onclick="event.stopPropagation(); Layers.toggleVisibility(${index})" title="Toggle Visibility">
            ${eyeIcon}
          </button>
          <div class="layer-thumb-box" id="thumb-box-${layer.id}">
            ${thumbContent}
          </div>
          <div class="layer-info">
            <span class="layer-name">${layer.name}</span>
            <div class="layer-badges">
              <span>${layer.blendMode}</span>
              <span>•</span>
              <span>${Math.round(layer.opacity * 100)}%</span>
            </div>
          </div>
          ${lockIcon ? `<span class="layer-lock-icon">${lockIcon}</span>` : ""}
        </div>
      `;
    }).join("");

    // Update thumbnails
    reversed.forEach(({ layer }) => {
      if (!layer.isTextLayer) {
        const thumbCvs = document.getElementById(`thumb-cvs-${layer.id}`);
        if (thumbCvs) {
          const tCtx = thumbCvs.getContext("2d");
          tCtx.clearRect(0, 0, 40, 28);
          tCtx.drawImage(layer.canvas, 0, 0, 40, 28);
        }
      }
    });

    this.updateLayerControls();
  },

  toggleVisibility(index) {
    if (index >= 0 && index < this.layers.length) {
      this.layers[index].toggleVisibility();
      this.renderLayersPanel();
    }
  },

  serialize() {
    return this.layers.map(layer => ({
      name: layer.name,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      visible: layer.visible,
      x: layer.x || 0,
      y: layer.y || 0,
      isTextLayer: !!layer.isTextLayer,
      textData: layer.textData ? JSON.parse(JSON.stringify(layer.textData)) : null,
      dataUrl: layer.canvas.toDataURL("image/png")
    }));
  },

  deserialize(data) {
    if (!data || !Array.isArray(data)) return;
    this.layers = [];
    const container = document.getElementById("layers-container");
    if (container) container.innerHTML = "";

    data.forEach((item, idx) => {
      const layer = new Layer(item.name, this.docWidth, this.docHeight, idx === 0 && item.name === "Background");
      layer.opacity = item.opacity;
      layer.blendMode = item.blendMode;
      layer.visible = item.visible;
      layer.x = item.x || 0;
      layer.y = item.y || 0;
      layer.isTextLayer = !!item.isTextLayer;
      layer.textData = item.textData || null;

      const img = new Image();
      img.onload = () => {
        layer.ctx.drawImage(img, 0, 0);
        layer.canvas.style.opacity = layer.opacity;
        layer.canvas.style.mixBlendMode = layer.blendMode;
        layer.canvas.style.display = layer.visible ? "block" : "none";
        layer.canvas.style.transform = `translate(${Math.round(layer.x)}px, ${Math.round(layer.y)}px)`;
        this.renderLayersPanel();
      };
      img.src = item.dataUrl;
      this.layers.push(layer);
    });

    this.mountToDOM();
    this.renderLayersPanel();
  }
};

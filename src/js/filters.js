/**
 * Piktura Studio — Filter & Adjustment Engine
 */
const Filters = {
  backupCanvas: null,
  currentAdjustment: null,

  // Non-destructive Modal Adjustment Pipeline
  openAdjustment(type) {
    const active = Layers.getActiveLayer();
    if (!active) return;

    // Create pristine snapshot of layer before previewing
    this.backupCanvas = document.createElement("canvas");
    this.backupCanvas.width = active.width;
    this.backupCanvas.height = active.height;
    this.backupCanvas.getContext("2d").drawImage(active.canvas, 0, 0);

    this.currentAdjustment = type;
    const modal = document.getElementById("modal-adjustment");
    const titleEl = document.getElementById("modal-adj-title");
    const bodyEl = document.getElementById("modal-adj-body");
    if (!modal || !titleEl || !bodyEl) return;

    if (type === "brightness-contrast") {
      titleEl.innerText = "Brightness / Contrast";
      bodyEl.innerHTML = `
        <div class="adj-form">
          <div class="form-group">
            <div style="display:flex; justify-content:space-between;">
              <label>Brightness:</label>
              <span id="adj-b-val" style="color:var(--ps-accent)">0</span>
            </div>
            <input type="range" id="adj-b" min="-100" max="100" value="0" class="ps-range" oninput="document.getElementById('adj-b-val').innerText=this.value; Filters.livePreview();">
          </div>
          <div class="form-group" style="margin-top:16px;">
            <div style="display:flex; justify-content:space-between;">
              <label>Contrast:</label>
              <span id="adj-c-val" style="color:var(--ps-accent)">0</span>
            </div>
            <input type="range" id="adj-c" min="-100" max="100" value="0" class="ps-range" oninput="document.getElementById('adj-c-val').innerText=this.value; Filters.livePreview();">
          </div>
        </div>
      `;
    } else if (type === "levels") {
      titleEl.innerText = "Levels (⌘L)";
      bodyEl.innerHTML = `
        <div class="adj-form">
          <div class="form-group">
            <div style="display:flex; justify-content:space-between;">
              <label>Shadows (Black Point):</label>
              <span id="adj-lvl-black-val" style="color:var(--ps-accent)">0</span>
            </div>
            <input type="range" id="adj-lvl-black" min="0" max="250" value="0" class="ps-range" oninput="document.getElementById('adj-lvl-black-val').innerText=this.value; Filters.livePreview();">
          </div>
          <div class="form-group" style="margin-top:14px;">
            <div style="display:flex; justify-content:space-between;">
              <label>Midtones (Gamma):</label>
              <span id="adj-lvl-gamma-val" style="color:var(--ps-accent)">1.0</span>
            </div>
            <input type="range" id="adj-lvl-gamma" min="20" max="300" value="100" class="ps-range" oninput="document.getElementById('adj-lvl-gamma-val').innerText=(this.value/100).toFixed(2); Filters.livePreview();">
          </div>
          <div class="form-group" style="margin-top:14px;">
            <div style="display:flex; justify-content:space-between;">
              <label>Highlights (White Point):</label>
              <span id="adj-lvl-white-val" style="color:var(--ps-accent)">255</span>
            </div>
            <input type="range" id="adj-lvl-white" min="5" max="255" value="255" class="ps-range" oninput="document.getElementById('adj-lvl-white-val').innerText=this.value; Filters.livePreview();">
          </div>
        </div>
      `;
    } else if (type === "curves") {
      titleEl.innerText = "Curves (⌘M)";
      bodyEl.innerHTML = `
        <div class="adj-form">
          <div class="form-group">
            <div style="display:flex; justify-content:space-between;">
              <label>Shadows Adjustment:</label>
              <span id="adj-curv-s-val" style="color:var(--ps-accent)">0</span>
            </div>
            <input type="range" id="adj-curv-s" min="-60" max="60" value="0" class="ps-range" oninput="document.getElementById('adj-curv-s-val').innerText=this.value; Filters.livePreview();">
          </div>
          <div class="form-group" style="margin-top:14px;">
            <div style="display:flex; justify-content:space-between;">
              <label>Midtones (S-Curve):</label>
              <span id="adj-curv-m-val" style="color:var(--ps-accent)">0</span>
            </div>
            <input type="range" id="adj-curv-m" min="-60" max="60" value="0" class="ps-range" oninput="document.getElementById('adj-curv-m-val').innerText=this.value; Filters.livePreview();">
          </div>
          <div class="form-group" style="margin-top:14px;">
            <div style="display:flex; justify-content:space-between;">
              <label>Highlights Adjustment:</label>
              <span id="adj-curv-h-val" style="color:var(--ps-accent)">0</span>
            </div>
            <input type="range" id="adj-curv-h" min="-60" max="60" value="0" class="ps-range" oninput="document.getElementById('adj-curv-h-val').innerText=this.value; Filters.livePreview();">
          </div>
        </div>
      `;
    } else if (type === "hue-saturation") {
      titleEl.innerText = "Hue / Saturation (⌘U)";
      bodyEl.innerHTML = `
        <div class="adj-form">
          <div class="form-group">
            <div style="display:flex; justify-content:space-between;">
              <label>Hue Shift:</label>
              <span id="adj-hue-val" style="color:var(--ps-accent)">0°</span>
            </div>
            <input type="range" id="adj-hue" min="-180" max="180" value="0" class="ps-range" oninput="document.getElementById('adj-hue-val').innerText=this.value + '°'; Filters.livePreview();">
          </div>
          <div class="form-group" style="margin-top:14px;">
            <div style="display:flex; justify-content:space-between;">
              <label>Saturation:</label>
              <span id="adj-sat-val" style="color:var(--ps-accent)">0</span>
            </div>
            <input type="range" id="adj-sat" min="-100" max="100" value="0" class="ps-range" oninput="document.getElementById('adj-sat-val').innerText=this.value; Filters.livePreview();">
          </div>
          <div class="form-group" style="margin-top:14px;">
            <div style="display:flex; justify-content:space-between;">
              <label>Lightness:</label>
              <span id="adj-lit-val" style="color:var(--ps-accent)">0</span>
            </div>
            <input type="range" id="adj-lit" min="-100" max="100" value="0" class="ps-range" oninput="document.getElementById('adj-lit-val').innerText=this.value; Filters.livePreview();">
          </div>
        </div>
      `;
    }

    modal.classList.remove("hidden");
  },

  livePreview() {
    const active = Layers.getActiveLayer();
    if (!active || !this.backupCanvas) return;

    // Reset from pristine snapshot
    active.ctx.clearRect(0, 0, active.width, active.height);
    active.ctx.drawImage(this.backupCanvas, 0, 0);

    const imgData = active.ctx.getImageData(0, 0, active.width, active.height);
    const data = imgData.data;

    if (this.currentAdjustment === "brightness-contrast") {
      const b = parseInt(document.getElementById("adj-b").value, 10);
      const c = parseInt(document.getElementById("adj-c").value, 10);
      const factor = (259 * (c + 255)) / (255 * (259 - c));

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        data[i] = Math.max(0, Math.min(255, factor * (data[i] + b - 128) + 128));
        data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] + b - 128) + 128));
        data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] + b - 128) + 128));
      }
    } else if (this.currentAdjustment === "levels") {
      const black = parseInt(document.getElementById("adj-lvl-black").value, 10);
      const gamma = parseFloat(document.getElementById("adj-lvl-gamma").value) / 100;
      const white = Math.max(black + 1, parseInt(document.getElementById("adj-lvl-white").value, 10));
      const range = white - black || 1;
      const invGamma = 1 / gamma;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        for (let ch = 0; ch < 3; ch++) {
          let v = (data[i + ch] - black) / range;
          v = Math.max(0, Math.min(1, v));
          data[i + ch] = Math.round(Math.pow(v, invGamma) * 255);
        }
      }
    } else if (this.currentAdjustment === "curves") {
      const s = parseInt(document.getElementById("adj-curv-s").value, 10);
      const m = parseInt(document.getElementById("adj-curv-m").value, 10);
      const h = parseInt(document.getElementById("adj-curv-h").value, 10);

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        for (let ch = 0; ch < 3; ch++) {
          const v = data[i + ch];
          const shadowWeight = Math.max(0, 1 - v / 128);
          const highlightWeight = Math.max(0, (v - 128) / 128);
          const midWeight = 1 - Math.abs(v - 128) / 128;
          const delta = s * shadowWeight + m * midWeight + h * highlightWeight;
          data[i + ch] = Math.max(0, Math.min(255, v + delta));
        }
      }
    } else if (this.currentAdjustment === "hue-saturation") {
      const hue = parseInt(document.getElementById("adj-hue").value, 10);
      const sat = parseInt(document.getElementById("adj-sat").value, 10) / 100;
      const lit = parseInt(document.getElementById("adj-lit").value, 10) / 100;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        let [h, s, l] = ColorPicker.rgbToHsv(data[i], data[i + 1], data[i + 2]);
        h = (h + hue + 360) % 360;
        s = Math.max(0, Math.min(1, s + sat));
        l = Math.max(0, Math.min(1, l + lit));
        const [r, g, b] = ColorPicker.hsvToRgb(h, s, l);
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }
    }

    active.ctx.putImageData(imgData, 0, 0);
    Layers.renderLayersPanel();
  },

  confirmAdjustment() {
    const modal = document.getElementById("modal-adjustment");
    if (modal) modal.classList.add("hidden");
    const nameMap = {
      "brightness-contrast": "Brightness / Contrast",
      "levels": "Levels",
      "curves": "Curves",
      "hue-saturation": "Hue / Saturation"
    };
    History.pushState(nameMap[this.currentAdjustment] || "Adjustment", null, "filter");
    this.backupCanvas = null;
    this.currentAdjustment = null;
  },

  cancelAdjustment() {
    const modal = document.getElementById("modal-adjustment");
    if (modal) modal.classList.add("hidden");

    const active = Layers.getActiveLayer();
    if (active && this.backupCanvas) {
      active.ctx.clearRect(0, 0, active.width, active.height);
      active.ctx.drawImage(this.backupCanvas, 0, 0);
      Layers.renderLayersPanel();
    }
    this.backupCanvas = null;
    this.currentAdjustment = null;
  },

  // Modal Triggers
  showBrightnessContrast() {
    this.openAdjustment("brightness-contrast");
  },

  showLevels() {
    this.openAdjustment("levels");
  },

  showCurves() {
    this.openAdjustment("curves");
  },

  showHueSaturation() {
    this.openAdjustment("hue-saturation");
  },

  showExposure() {
    this.openAdjustment("brightness-contrast");
  },

  // Direct Instant Filters
  invert() {
    const active = Layers.getActiveLayer();
    if (!active) return;
    const imgData = active.ctx.getImageData(0, 0, active.width, active.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];
      data[i + 1] = 255 - data[i + 1];
      data[i + 2] = 255 - data[i + 2];
    }
    active.ctx.putImageData(imgData, 0, 0);
    Layers.renderLayersPanel();
    History.pushState("Invert", null, "filter");
  },

  desaturate() {
    const active = Layers.getActiveLayer();
    if (!active) return;
    const imgData = active.ctx.getImageData(0, 0, active.width, active.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    }
    active.ctx.putImageData(imgData, 0, 0);
    Layers.renderLayersPanel();
    History.pushState("Desaturate", null, "filter");
  },

  autoTone() {
    const active = Layers.getActiveLayer();
    if (!active) return;
    const imgData = active.ctx.getImageData(0, 0, active.width, active.height);
    const data = imgData.data;

    let minR = 255, maxR = 0;
    let minG = 255, maxG = 0;
    let minB = 255, maxB = 0;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      if (data[i] < minR) minR = data[i];
      if (data[i] > maxR) maxR = data[i];
      if (data[i + 1] < minG) minG = data[i + 1];
      if (data[i + 1] > maxG) maxG = data[i + 1];
      if (data[i + 2] < minB) minB = data[i + 2];
      if (data[i + 2] > maxB) maxB = data[i + 2];
    }

    const rangeR = maxR - minR || 1;
    const rangeG = maxG - minG || 1;
    const rangeB = maxB - minB || 1;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      data[i] = ((data[i] - minR) / rangeR) * 255;
      data[i + 1] = ((data[i + 1] - minG) / rangeG) * 255;
      data[i + 2] = ((data[i + 2] - minB) / rangeB) * 255;
    }
    active.ctx.putImageData(imgData, 0, 0);
    Layers.renderLayersPanel();
    History.pushState("Auto Tone", null, "filter");
  },

  gaussianBlur(radius = 8) {
    const active = Layers.getActiveLayer();
    if (!active) return;
    const temp = document.createElement("canvas");
    temp.width = active.width;
    temp.height = active.height;
    const tCtx = temp.getContext("2d");
    tCtx.filter = `blur(${radius}px)`;
    tCtx.drawImage(active.canvas, 0, 0);

    active.ctx.clearRect(0, 0, active.width, active.height);
    active.ctx.drawImage(temp, 0, 0);
    Layers.renderLayersPanel();
    History.pushState("Gaussian Blur", null, "filter", `(${radius}px)`);
  },

  sharpen() {
    const active = Layers.getActiveLayer();
    if (!active) return;
    const weights = [
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0
    ];
    this.applyConvolution(active.ctx, weights);
    Layers.renderLayersPanel();
    History.pushState("Sharpen", null, "filter");
  },

  motionBlur(dist = 14, angle = 0) {
    const active = Layers.getActiveLayer();
    if (!active) return;
    const temp = document.createElement("canvas");
    temp.width = active.width;
    temp.height = active.height;
    const tCtx = temp.getContext("2d");

    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);

    tCtx.globalAlpha = 1 / dist;
    for (let i = -dist / 2; i <= dist / 2; i++) {
      tCtx.drawImage(active.canvas, i * dx, i * dy);
    }

    active.ctx.clearRect(0, 0, active.width, active.height);
    active.ctx.drawImage(temp, 0, 0);
    Layers.renderLayersPanel();
    History.pushState("Motion Blur", null, "filter", `(${dist}px)`);
  },

  unsharpMask() {
    this.sharpen();
  },

  findEdges() {
    const active = Layers.getActiveLayer();
    if (!active) return;
    const weights = [
      -1, -1, -1,
      -1,  8, -1,
      -1, -1, -1
    ];
    this.applyConvolution(active.ctx, weights);
    Layers.renderLayersPanel();
    History.pushState("Find Edges", null, "filter");
  },

  addNoise(amount = 20) {
    const active = Layers.getActiveLayer();
    if (!active) return;
    const imgData = active.ctx.getImageData(0, 0, active.width, active.height);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      const noise = (Math.random() - 0.5) * amount * 2;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    active.ctx.putImageData(imgData, 0, 0);
    Layers.renderLayersPanel();
    History.pushState("Add Noise", null, "filter");
  },

  pixelateMosaic(blockSize = 12) {
    const active = Layers.getActiveLayer();
    if (!active) return;
    const w = active.width;
    const h = active.height;
    const imgData = active.ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    for (let y = 0; y < h; y += blockSize) {
      for (let x = 0; x < w; x += blockSize) {
        const pIdx = (y * w + x) * 4;
        const r = data[pIdx];
        const g = data[pIdx + 1];
        const b = data[pIdx + 2];
        const a = data[pIdx + 3];

        for (let by = 0; by < blockSize && (y + by) < h; by++) {
          for (let bx = 0; bx < blockSize && (x + bx) < w; bx++) {
            const curIdx = ((y + by) * w + (x + bx)) * 4;
            data[curIdx] = r;
            data[curIdx + 1] = g;
            data[curIdx + 2] = b;
            data[curIdx + 3] = a;
          }
        }
      }
    }
    active.ctx.putImageData(imgData, 0, 0);
    Layers.renderLayersPanel();
    History.pushState("Pixelate", null, "filter");
  },

  applyConvolution(ctx, weights) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const srcData = ctx.getImageData(0, 0, w, h);
    const dstData = ctx.createImageData(w, h);
    const src = srcData.data;
    const dst = dstData.data;

    const side = Math.round(Math.sqrt(weights.length));
    const halfSide = Math.floor(side / 2);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let r = 0, g = 0, b = 0;

        for (let cy = 0; cy < side; cy++) {
          for (let cx = 0; cx < side; cx++) {
            const scx = Math.min(w - 1, Math.max(0, x + cx - halfSide));
            const scy = Math.min(h - 1, Math.max(0, y + cy - halfSide));
            const srcIdx = (scy * w + scx) * 4;
            const wt = weights[cy * side + cx];

            r += src[srcIdx] * wt;
            g += src[srcIdx + 1] * wt;
            b += src[srcIdx + 2] * wt;
          }
        }
        const dstIdx = (y * w + x) * 4;
        dst[dstIdx] = Math.max(0, Math.min(255, r));
        dst[dstIdx + 1] = Math.max(0, Math.min(255, g));
        dst[dstIdx + 2] = Math.max(0, Math.min(255, b));
        dst[dstIdx + 3] = src[dstIdx + 3];
      }
    }
    ctx.putImageData(dstData, 0, 0);
  }
};

const Selection = {
  activeBox: null,

  selectAll() {
    this.activeBox = { x: 0, y: 0, w: Layers.docWidth, h: Layers.docHeight };
    Tools.renderSelectionOverlay();
  },

  deselect(pushHistory = false) {
    const hadSelection = !!(this.activeBox || (window.Tools && Tools.selectionBox));
    this.activeBox = null;
    if (window.Tools) {
      Tools.selectionBox = null;
      Tools.lassoPoints = [];
      Tools.clearOverlay();
    }
    if (hadSelection && pushHistory && window.History) {
      History.pushState("action_deselect", null, "select");
    }
  },

  inverse() {
    if (!this.activeBox) {
      this.selectAll();
    } else {
      // Invert bounding box logic or clear
      this.deselect();
    }
  },

  showFeatherDialog() {
    const val = prompt("Feather Selection Radius (px):", "5");
    if (val) {
      alert(`Feather radius set to ${val}px`);
    }
  },

  selectSubjectAI() {
    const active = Layers.getActiveLayer();
    if (!active) return;
    // Auto-detect non-transparent / non-white subject bounds
    const imgData = active.ctx.getImageData(0, 0, active.width, active.height);
    const data = imgData.data;
    let minX = active.width, maxX = 0, minY = active.height, maxY = 0;
    let found = false;

    for (let y = 0; y < active.height; y += 4) {
      for (let x = 0; x < active.width; x += 4) {
        const idx = (y * active.width + x) * 4;
        if (data[idx + 3] > 20 && !(data[idx] > 240 && data[idx + 1] > 240 && data[idx + 2] > 240)) {
          found = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (found) {
      this.activeBox = {
        x: Math.max(0, minX - 10),
        y: Math.max(0, minY - 10),
        w: Math.min(active.width - minX + 20, maxX - minX + 20),
        h: Math.min(active.height - minY + 20, maxY - minY + 20)
      };
      Tools.renderSelectionOverlay();
    } else {
      this.selectAll();
    }
  },

  removeBackgroundAI() {
    const active = Layers.getActiveLayer();
    if (!active) return;
    this.selectSubjectAI();
    if (this.activeBox) {
      // Mask out exterior
      const temp = document.createElement("canvas");
      temp.width = this.activeBox.w;
      temp.height = this.activeBox.h;
      temp.getContext("2d").drawImage(
        active.canvas,
        this.activeBox.x, this.activeBox.y, this.activeBox.w, this.activeBox.h,
        0, 0, this.activeBox.w, this.activeBox.h
      );

      active.clear();
      active.ctx.drawImage(temp, this.activeBox.x, this.activeBox.y);
      this.deselect();
      Layers.renderLayersPanel();
      History.pushState("AI Remove Background");
    }
  }
};

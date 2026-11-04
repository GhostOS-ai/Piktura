/**
 * Piktura Studio — Color Engine & Swatches
 */
const ColorPicker = {
  fgColor: "#000000",
  bgColor: "#ffffff",
  activeTarget: "fg", // 'fg' or 'bg'
  hue: 210,
  sat: 1.0,
  val: 1.0,

  init() {
    this.updateChips();
    this.setupSpectrumListeners();
  },

  updateChips() {
    const fgEl = document.getElementById("chip-fg");
    const bgEl = document.getElementById("chip-bg");
    const prevEl = document.getElementById("active-color-preview");
    const hexInput = document.getElementById("hex-input");

    if (fgEl) fgEl.style.backgroundColor = this.fgColor;
    if (bgEl) bgEl.style.backgroundColor = this.bgColor;

    const activeCol = this.activeTarget === "fg" ? this.fgColor : this.bgColor;
    if (prevEl) prevEl.style.backgroundColor = activeCol;
    if (hexInput) hexInput.value = activeCol.replace("#", "").toUpperCase();
  },

  getFgColor() {
    return this.fgColor;
  },

  getBgColor() {
    return this.bgColor;
  },

  setFgColor(hex) {
    this.fgColor = hex.startsWith("#") ? hex : "#" + hex;
    this.updateChips();
    if (window.Tools && Tools.currentTool === "text") {
      Tools.setTextColor(this.fgColor);
    }
  },

  setBgColor(hex) {
    this.bgColor = hex.startsWith("#") ? hex : "#" + hex;
    this.updateChips();
  },

  swapColors() {
    const temp = this.fgColor;
    this.fgColor = this.bgColor;
    this.bgColor = temp;
    this.updateChips();
  },

  resetDefaultColors() {
    this.fgColor = "#000000";
    this.bgColor = "#ffffff";
    this.updateChips();
  },

  setHex(hex) {
    const clean = hex.replace("#", "").trim();
    if (/^[0-9A-Fa-f]{6}$/.test(clean)) {
      const fullHex = "#" + clean;
      if (this.activeTarget === "fg") {
        this.fgColor = fullHex;
      } else {
        this.bgColor = fullHex;
      }
      this.updateChips();
    }
  },

  setHue(h) {
    this.hue = parseInt(h, 10);
    const spectrumBox = document.getElementById("color-spectrum-box");
    if (spectrumBox) {
      spectrumBox.style.background = `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #fff, hsl(${this.hue}, 100%, 50%))`;
    }
    this.calculateColorFromHsv();
  },

  setupSpectrumListeners() {
    const box = document.getElementById("color-spectrum-box");
    if (!box) return;

    let isDragging = false;
    const updateFromMouse = (e) => {
      const rect = box.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      this.sat = x / rect.width;
      this.val = 1 - (y / rect.height);

      const cursor = document.getElementById("spectrum-cursor");
      if (cursor) {
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
      }
      this.calculateColorFromHsv();
    };

    box.addEventListener("mousedown", (e) => {
      isDragging = true;
      updateFromMouse(e);
    });

    window.addEventListener("mousemove", (e) => {
      if (isDragging) updateFromMouse(e);
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });
  },

  calculateColorFromHsv() {
    const rgb = this.hsvToRgb(this.hue / 360, this.sat, this.val);
    const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
    if (this.activeTarget === "fg") {
      this.fgColor = hex;
    } else {
      this.bgColor = hex;
    }
    this.updateChips();
  },

  hsvToRgb(h, s, v) {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  },

  rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  },

  openModal(target) {
    this.activeTarget = target;
    this.updateChips();
  }
};

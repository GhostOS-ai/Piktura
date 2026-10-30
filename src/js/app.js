/**
 * Piktura Studio — Core Application Coordinator & Menus
 */
const App = {
  version: "1.0.0",

  init() {
    ColorPicker.init();
    Layers.init(1920, 1080, "white");
    History.pushState("New Document");
    Canvas.init();
    Tools.init();
    this.setupGlobalKeyboardShortcuts();
    Canvas.fitToScreen();
    console.log(`Piktura Studio v${this.version} initialized successfully.`);
  },

  setupGlobalKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      // Don't intercept if typing in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") {
        return;
      }

      const cmd = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      // Photoshop Keybindings
      if (cmd && !shift && e.code === "KeyZ") {
        e.preventDefault();
        History.undo();
      } else if (cmd && shift && e.code === "KeyZ") {
        e.preventDefault();
        History.redo();
      } else if (cmd && !shift && e.code === "KeyN") {
        e.preventDefault();
        this.newDocumentDialog();
      } else if (cmd && !shift && e.code === "KeyO") {
        e.preventDefault();
        this.openFileDialog();
      } else if (cmd && !shift && e.code === "KeyS") {
        e.preventDefault();
        this.exportImage("png");
      } else if (cmd && !shift && e.code === "KeyJ") {
        e.preventDefault();
        Layers.duplicateActiveLayer();
      } else if (cmd && shift && e.code === "KeyN") {
        e.preventDefault();
        Layers.createLayer();
      } else if (cmd && !shift && e.code === "KeyE") {
        e.preventDefault();
        Layers.mergeDown();
      } else if (cmd && !shift && e.code === "KeyT") {
        e.preventDefault();
        Tools.freeTransform();
      } else if (cmd && !shift && e.code === "KeyA") {
        e.preventDefault();
        Selection.selectAll();
      } else if (cmd && !shift && e.code === "KeyD") {
        e.preventDefault();
        Selection.deselect();
      } else if (cmd && !shift && (e.code === "Equal" || e.key === "+")) {
        e.preventDefault();
        Canvas.zoomIn();
      } else if (cmd && !shift && (e.code === "Minus" || e.key === "-")) {
        e.preventDefault();
        Canvas.zoomOut();
      } else if (cmd && !shift && e.code === "Digit0") {
        e.preventDefault();
        Canvas.fitToScreen();
      } else if (cmd && !shift && e.code === "Digit1") {
        e.preventDefault();
        Canvas.actualPixels();
      } else if (cmd && !shift && e.code === "KeyR") {
        e.preventDefault();
        Canvas.toggleRulers();
      }

      // Single-Key Tool Selection
      if (!cmd && !alt && !shift) {
        switch (e.code) {
          case "KeyV": Tools.select("move"); break;
          case "KeyM": Tools.select("marquee"); break;
          case "KeyL": Tools.select("lasso"); break;
          case "KeyW": Tools.select("wand"); break;
          case "KeyC": Tools.select("crop"); break;
          case "KeyI": Tools.select("eyedropper"); break;
          case "KeyJ": Tools.select("healing"); break;
          case "KeyB": Tools.select("brush"); break;
          case "KeyS": Tools.select("stamp"); break;
          case "KeyE": Tools.select("eraser"); break;
          case "KeyG": Tools.select("bucket"); break;
          case "KeyO": Tools.select("dodge"); break;
          case "KeyP": Tools.select("pen"); break;
          case "KeyT": Tools.select("text"); break;
          case "KeyU": Tools.select("shape"); break;
          case "KeyH": Tools.select("hand"); break;
          case "KeyZ": Tools.select("zoom"); break;
          case "KeyX": ColorPicker.swapColors(); break;
          case "KeyD": ColorPicker.resetDefaultColors(); break;
          case "BracketLeft":
            Tools.setBrushSize(Math.max(1, Tools.brushSize - 5));
            break;
          case "BracketRight":
            Tools.setBrushSize(Tools.brushSize + 5);
            break;
          case "Backspace":
          case "Delete":
            Tools.clear();
            break;
        }
      }
    });
  },

  // Document Management
  newDocumentDialog() {
    const modal = document.getElementById("modal-new-doc");
    if (modal) modal.classList.remove("hidden");
  },

  closeNewDocumentDialog() {
    const modal = document.getElementById("modal-new-doc");
    if (modal) modal.classList.add("hidden");
  },

  applyDocPreset(w, h) {
    document.getElementById("new-doc-w").value = w;
    document.getElementById("new-doc-h").value = h;
    document.querySelectorAll(".preset-chip").forEach(c => c.classList.remove("active"));
    event.target.classList.add("active");
  },

  confirmNewDocument() {
    const w = parseInt(document.getElementById("new-doc-w").value, 10) || 1920;
    const h = parseInt(document.getElementById("new-doc-h").value, 10) || 1080;
    const bg = document.getElementById("new-doc-bg").value;

    this.closeNewDocumentDialog();
    Layers.init(w, h, bg);
    History.stack = [];
    History.currentIndex = -1;
    History.pushState("New Document");
    Canvas.fitToScreen();

    const sizeEl = document.getElementById("status-doc-size");
    if (sizeEl) sizeEl.innerText = `${w} × ${h} px (72 ppi)`;
  },

  openFileDialog() {
    const input = document.getElementById("native-file-input");
    if (input) input.click();
  },

  handleFileInput(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Init document to image dimensions
        Layers.init(img.width, img.height, "transparent");
        const active = Layers.getActiveLayer();
        active.name = file.name;
        active.ctx.drawImage(img, 0, 0);

        History.stack = [];
        History.currentIndex = -1;
        History.pushState(`Open ${file.name}`);
        Canvas.fitToScreen();
        Layers.renderLayersPanel();

        const sizeEl = document.getElementById("status-doc-size");
        if (sizeEl) sizeEl.innerText = `${img.width} × ${img.height} px`;
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  },

  exportImage(format = "png") {
    // Composite all visible layers onto an export canvas
    const expCanvas = document.createElement("canvas");
    expCanvas.width = Layers.docWidth;
    expCanvas.height = Layers.docHeight;
    const ctx = expCanvas.getContext("2d");

    Layers.layers.forEach(l => {
      if (l.visible) {
        ctx.save();
        ctx.globalAlpha = l.opacity;
        ctx.globalCompositeOperation = l.blendMode === "normal" ? "source-over" : l.blendMode;
        ctx.drawImage(l.canvas, 0, 0);
        ctx.restore();
      }
    });

    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    const dataUrl = expCanvas.toDataURL(mime, 0.95);

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `piktura-export.${format === "jpeg" ? "jpg" : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  },

  saveProject() {
    this.exportImage("png");
  },

  saveProjectAs() {
    this.exportImage("png");
  },

  closeDocument() {
    if (confirm("Close active document?")) {
      this.confirmNewDocument();
    }
  },

  showAboutModal() {
    alert("🎨 Piktura Studio v1.0.0\nProfessional GPU-Accelerated Creative Suite for macOS & Creators.\n\nDesigned by KIB.best • 100% Offline & Private");
  },

  showShortcutsModal() {
    alert("Photoshop Hotkeys in Piktura:\nV - Move\nM - Marquee\nL - Lasso\nW - Magic Wand\nB - Brush\nE - Eraser\nG - Bucket\nP - Pen\nT - Text\nZ - Zoom\nH / Space - Hand Pan\nCmd+J - Duplicate Layer\nCmd+Z - Undo\nCmd+Shift+Z - Redo\n[ / ] - Brush Size");
  },

  minimizeWindow() {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.minimize) {
      window.pywebview.api.minimize();
    }
  },

  toggleMaximize() {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_maximize) {
      window.pywebview.api.toggle_maximize();
    }
  },

  closeApp() {
    if (window.pywebview && window.pywebview.api && window.pywebview.api.close) {
      window.pywebview.api.close();
    } else {
      window.close();
    }
  }
};

const Toolbar = {
  isTwoColumns: false,
  toggleColumns() {
    this.isTwoColumns = !this.isTwoColumns;
    const tb = document.getElementById("ps-toolbar");
    if (tb) tb.classList.toggle("two-columns", this.isTwoColumns);
    const btn = document.querySelector(".toolbar-col-toggle");
    if (btn) btn.innerText = this.isTwoColumns ? "«" : "»";
  }
};

const Panels = {
  toggle(panelId) {
    const el = document.getElementById(`panel-${panelId}`);
    if (el) el.classList.toggle("hidden");
  },
  toggleCollapse(panelId) {
    const el = document.getElementById(panelId);
    if (!el) return;
    const body = el.querySelector(".panel-body");
    const btn = el.querySelector(".panel-collapse-btn");
    if (body) {
      const isHidden = body.style.display === "none";
      body.style.display = isHidden ? "block" : "none";
      if (btn) btn.innerText = isHidden ? "▾" : "▸";
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

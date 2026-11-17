/**
 * Piktura Studio — Core Application Coordinator & Menus
 */
const App = {
  version: "1.2.2",

  init() {
    I18n.init();
    ColorPicker.init();
    Canvas.init();
    Tools.init();
    if (window.Documents) {
      Documents.init();
    } else {
      Layers.init(1920, 1080, "white");
      History.pushState("new_document", null, "document");
    }
    this.setupGlobalKeyboardShortcuts();
    Canvas.fitToScreen();
    console.log(`Piktura Studio v${this.version} initialized successfully.`);
  },

  setupGlobalKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      // Don't intercept if typing in an input or contenteditable element
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT" || e.target.isContentEditable) {
        if (e.target.id === "canvas-text-editor") {
          if (e.code === "Escape" || e.key === "Escape") {
            e.preventDefault();
            Tools.cancelTextEdit();
          } else if ((e.metaKey || e.ctrlKey) && (e.code === "Enter" || e.key === "Enter")) {
            e.preventDefault();
            Tools.commitTextEdit();
          }
        }
        return;
      }

      const cmd = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      // ESCAPE Key: Dismiss modals, cancel text edit, cancel crop, deselect
      if (e.code === "Escape" || e.key === "Escape") {
        e.preventDefault();
        this.closeAllModals();
        if (window.Tools && Tools.textEditing) {
          Tools.cancelTextEdit();
          return;
        }
        if (window.Tools && Tools.isCropping) {
          Tools.cancelCrop();
          return;
        }
        if (window.Tools && Tools.penPoints && Tools.penPoints.length > 0) {
          Tools.cancelPen();
          return;
        }
        if (window.Selection && (Selection.activeBox || (window.Tools && Tools.selectionBox))) {
          Selection.deselect(true);
          return;
        }
        return;
      }

      // ENTER / CMD+ENTER Key: Commit crop or text if active
      if (window.Tools && Tools.textEditing && (cmd && (e.code === "Enter" || e.key === "Enter"))) {
        e.preventDefault();
        Tools.commitTextEdit();
        return;
      }
      if ((e.code === "Enter" || e.key === "Enter") && window.Tools && Tools.isCropping) {
        e.preventDefault();
        Tools.applyCrop();
        return;
      }

      // F12: Revert document to original state (Photoshop classic)
      if (e.code === "F12" || e.key === "F12") {
        e.preventDefault();
        if (window.History) {
          History.revertToOriginal();
        }
        return;
      }

      // Photoshop Keybindings with Cmd / Ctrl
      if (cmd && !shift && !alt && e.code === "KeyZ") {
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
      } else if (cmd && shift && e.code === "KeyS") {
        e.preventDefault();
        this.exportAsDialog();
      } else if (cmd && !shift && !alt && e.code === "KeyW") {
        e.preventDefault();
        this.closeDocument();
      } else if (cmd && alt && shift && e.code === "KeyW") {
        e.preventDefault();
        this.exportAsDialog();
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
      } else if (cmd && shift && e.code === "KeyI") {
        e.preventDefault();
        Selection.inverse();
      } else if (cmd && !shift && e.code === "KeyL") {
        e.preventDefault();
        Filters.showLevels();
      } else if (cmd && !shift && e.code === "KeyM") {
        e.preventDefault();
        Filters.showCurves();
      } else if (cmd && !shift && e.code === "KeyU") {
        e.preventDefault();
        Filters.showHueSaturation();
      } else if (cmd && !shift && e.code === "KeyI") {
        e.preventDefault();
        Filters.invert();
      } else if (cmd && shift && e.code === "KeyU") {
        e.preventDefault();
        Filters.desaturate();
      } else if (cmd && shift && e.code === "KeyL") {
        e.preventDefault();
        Filters.autoTone();
      } else if (cmd && (e.code === "Semicolon" || e.key === ";")) {
        e.preventDefault();
        Canvas.toggleGuides();
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
      } else if (cmd && !shift && (e.code === "Comma" || e.key === ",")) {
        e.preventDefault();
        this.showSettingsModal();
      }

      // Bracket Shortcuts for Brush Size & Hardness
      if (!cmd && !alt) {
        if (!shift && e.code === "BracketLeft") {
          e.preventDefault();
          Tools.setBrushSize(Tools.brushSize <= 10 ? Tools.brushSize - 1 : Tools.brushSize - 5);
        } else if (!shift && e.code === "BracketRight") {
          e.preventDefault();
          Tools.setBrushSize(Tools.brushSize < 10 ? Tools.brushSize + 1 : Tools.brushSize + 5);
        } else if (shift && e.code === "BracketLeft") {
          e.preventDefault();
          Tools.setBrushHardness(Tools.brushHardness - 10);
        } else if (shift && e.code === "BracketRight") {
          e.preventDefault();
          Tools.setBrushHardness(Tools.brushHardness + 10);
        }
      }

      // Single-Key Tool Selection & Numeric Opacity (Photoshop Classics)
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
          case "KeyG":
            Tools.select(Tools.currentTool === "bucket" ? "gradient" : "bucket");
            break;
          case "KeyO": Tools.select("dodge"); break;
          case "KeyP": Tools.select("pen"); break;
          case "KeyT": Tools.select("text"); break;
          case "KeyU": Tools.select("shape"); break;
          case "KeyH": Tools.select("hand"); break;
          case "KeyZ": Tools.select("zoom"); break;
          case "KeyX": ColorPicker.swapColors(); break;
          case "KeyD": ColorPicker.resetDefaultColors(); break;
          case "Backspace":
          case "Delete":
            if (window.History && History.isHistoryFocused) {
              History.deleteCurrentState();
            } else if (window.Selection && Selection.activeBox) {
              Tools.clear();
            } else if (window.Layers && Layers.panelHasFocus && Layers.layers.length > 1) {
              Layers.deleteActiveLayer();
            } else {
              // Safe undo/delete last action from history without destructively wiping layer pixels
              if (window.History) {
                History.deleteCurrentState();
              }
            }
            break;
        }

        // Numbers 1-9, 0 for Quick Opacity Setting (1 = 10%, 5 = 50%, 0 = 100%)
        if (e.code.startsWith("Digit")) {
          const digit = parseInt(e.code.replace("Digit", ""), 10);
          if (!isNaN(digit)) {
            const op = digit === 0 ? 100 : digit * 10;
            Tools.setBrushOpacity(op);
          }
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

  presetCategories: {
    popular: [
      { name: "Full HD (1920×1080)", w: 1920, h: 1080 },
      { name: "Square Post (1080×1080)", w: 1080, h: 1080 },
      { name: "Story / Reels / TikTok (1080×1920)", w: 1080, h: 1920 },
      { name: "4K UHD (3840×2160)", w: 3840, h: 2160 },
      { name: "A4 Print (2480×3508)", w: 2480, h: 3508 }
    ],
    social: [
      { name: "Instagram Square (1080×1080)", w: 1080, h: 1080 },
      { name: "Story / Reels / TikTok (1080×1920)", w: 1080, h: 1920 },
      { name: "YouTube Video Thumbnail (1280×720)", w: 1280, h: 720 },
      { name: "YouTube Channel Banner (2560×1440)", w: 2560, h: 1440 },
      { name: "Telegram / VK Banner (1200×600)", w: 1200, h: 600 },
      { name: "Twitter / X Header (1500×500)", w: 1500, h: 500 }
    ],
    screen: [
      { name: "Full HD 1080p (1920×1080)", w: 1920, h: 1080 },
      { name: "2K QHD (2560×1440)", w: 2560, h: 1440 },
      { name: "4K UHD (3840×2160)", w: 3840, h: 2160 },
      { name: "MacBook Pro Liquid Retina (3024×1964)", w: 3024, h: 1964 },
      { name: "iPhone 16 Pro Wallpaper (1206×2622)", w: 1206, h: 2622 }
    ],
    print: [
      { name: "A4 Document (2480×3508 @ 300 ppi)", w: 2480, h: 3508 },
      { name: "A5 Flyer (1748×2480 @ 300 ppi)", w: 1748, h: 2480 },
      { name: "Business Card (1050×600 @ 300 ppi)", w: 1050, h: 600 }
    ]
  },

  showPresetCategory(catName) {
    document.querySelectorAll(".cat-btn").forEach(b => {
      b.classList.toggle("active", b.getAttribute("data-cat") === catName);
    });
    const container = document.getElementById("preset-chips-container");
    if (!container) return;
    const list = this.presetCategories[catName] || this.presetCategories.popular;
    container.innerHTML = list.map((p, i) => `
      <button class="preset-chip ${i === 0 ? 'active' : ''}" onclick="App.applyDocPreset(${p.w}, ${p.h}, this)">${p.name}</button>
    `).join("");
    if (list[0]) {
      this.applyDocPreset(list[0].w, list[0].h);
    }
  },

  applyDocPreset(w, h, btnEl = null) {
    const inputW = document.getElementById("new-doc-w");
    const inputH = document.getElementById("new-doc-h");
    if (inputW) inputW.value = w;
    if (inputH) inputH.value = h;
    document.querySelectorAll(".preset-chip").forEach(c => c.classList.remove("active"));
    if (btnEl) {
      btnEl.classList.add("active");
    } else if (typeof event !== "undefined" && event && event.target && event.target.classList.contains("preset-chip")) {
      event.target.classList.add("active");
    }
  },

  confirmNewDocument() {
    const w = parseInt(document.getElementById("new-doc-w").value, 10) || 1920;
    const h = parseInt(document.getElementById("new-doc-h").value, 10) || 1080;
    const bg = document.getElementById("new-doc-bg").value;

    this.closeNewDocumentDialog();
    if (window.Documents) {
      Documents.createDocument(null, w, h, bg, true);
    } else {
      Layers.init(w, h, bg);
      History.stack = [];
      History.currentIndex = -1;
      History.pushState("New Document");
    }
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
        if (window.Documents) {
          Documents.openImageDocument(file, img);
        } else {
          Layers.init(img.width, img.height, "transparent");
          const active = Layers.getActiveLayer();
          active.ctx.drawImage(img, 0, 0);

          History.stack = [];
          History.currentIndex = -1;
          History.pushState(`Open ${file.name}`);
          Canvas.fitToScreen();
          Layers.renderLayersPanel();

          const sizeEl = document.getElementById("status-doc-size");
          if (sizeEl) sizeEl.innerText = `${img.width} × ${img.height} px`;
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  },

  // Export As Dialog & Engine
  exportAsDialog() {
    const modal = document.getElementById("modal-export");
    if (modal) modal.classList.remove("hidden");
  },

  closeExportModal() {
    const modal = document.getElementById("modal-export");
    if (modal) modal.classList.add("hidden");
  },

  onExportFormatChange() {
    const fmt = document.getElementById("export-format").value;
    const qGrp = document.getElementById("export-quality-grp");
    if (qGrp) {
      qGrp.style.display = (fmt === "jpeg" || fmt === "webp") ? "block" : "none";
    }
  },

  confirmExport() {
    const fmt = document.getElementById("export-format").value || "png";
    const scale = parseFloat(document.getElementById("export-scale").value) || 1.0;
    const quality = parseInt(document.getElementById("export-quality").value, 10) / 100 || 0.92;

    this.closeExportModal();
    this.exportImage(fmt, quality, scale);
  },

  exportImage(format = "png", quality = 0.95, scale = 1.0) {
    const outW = Math.round(Layers.docWidth * scale);
    const outH = Math.round(Layers.docHeight * scale);

    const expCanvas = document.createElement("canvas");
    expCanvas.width = outW;
    expCanvas.height = outH;
    const ctx = expCanvas.getContext("2d");

    if (scale !== 1.0) {
      ctx.scale(scale, scale);
    }

    // Fill white background for JPEG exports
    if (format === "jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, Layers.docWidth, Layers.docHeight);
    }

    Layers.layers.forEach(l => {
      if (l.visible) {
        ctx.save();
        ctx.globalAlpha = l.opacity;
        ctx.globalCompositeOperation = l.blendMode === "normal" ? "source-over" : l.blendMode;
        if (window.Effects && Effects.hasActiveEffects(l)) {
          Effects.drawLayerWithEffects(ctx, l, Math.round(l.x || 0), Math.round(l.y || 0));
        } else {
          ctx.drawImage(l.canvas, Math.round(l.x || 0), Math.round(l.y || 0));
        }
        ctx.restore();
      }
    });

    const mime = format === "jpeg" ? "image/jpeg" : (format === "webp" ? "image/webp" : "image/png");
    const dataUrl = expCanvas.toDataURL(mime, quality);

    const a = document.createElement("a");
    a.href = dataUrl;
    const activeDoc = (window.Documents && Documents.getActiveDoc());
    const baseName = (activeDoc && activeDoc.title) ? activeDoc.title.replace(/\.[^/.]+$/, "") : "piktura-export";
    a.download = `${baseName}.${format === "jpeg" ? "jpg" : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (window.Documents) {
      Documents.markActiveDocSaved();
    }
  },

  saveProject() {
    this.exportAsDialog();
  },

  saveProjectAs() {
    this.exportAsDialog();
  },

  closeDocument() {
    if (window.Documents) {
      Documents.requestCloseDocument();
    } else {
      this.confirmNewDocument();
    }
  },

  closeAllModals() {
    document.querySelectorAll(".ps-modal, .ps-modal-backdrop").forEach(m => m.classList.add("hidden"));
    if (window.Documents) {
      Documents.pendingCloseDocId = null;
    }
  },

  showAboutModal() {
    const modal = document.getElementById("modal-about");
    if (modal) modal.classList.remove("hidden");
  },

  closeAboutModal() {
    const modal = document.getElementById("modal-about");
    if (modal) modal.classList.add("hidden");
  },

  showSettingsModal() {
    const modal = document.getElementById("modal-settings");
    const sel = document.getElementById("settings-lang-select");
    if (sel && window.I18n) {
      sel.value = I18n.currentLang;
    }
    if (modal) modal.classList.remove("hidden");
  },

  closeSettingsModal() {
    const modal = document.getElementById("modal-settings");
    if (modal) modal.classList.add("hidden");
  },

  showShortcutsModal() {
    alert("Photoshop Hotkeys in Piktura:\nV - Move\nM - Marquee\nL - Lasso\nW - Magic Wand\nB - Brush\nE - Eraser\nG - Bucket / Gradient\nO - Dodge & Burn\nP - Pen\nT - Text\nU - Shapes\nZ - Zoom\nH / Space - Hand Pan\n[ / ] - Brush Size\nShift + [ / ] - Brush Hardness\n1 - 0 - Brush Opacity (10%-100%)\nCmd+J - Duplicate Layer\nCmd+E - Merge Down\nCmd+L - Levels\nCmd+M - Curves\nCmd+U - Hue/Saturation\nCmd+; - Toggle Guides\nCmd+Z - Undo\nCmd+Shift+Z - Redo");
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

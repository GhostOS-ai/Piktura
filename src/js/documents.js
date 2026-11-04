/**
 * Piktura Studio — Multi-Document Tabs Engine
 * Handles Photoshop-style tabbed documents, tabs bar rendering,
 * switching between open documents, dirty state tracking, and save confirmation dialog.
 */

class PikturaDoc {
  constructor(title, width = 1920, height = 1080, bg = "white") {
    this.id = "doc_" + Math.random().toString(36).substr(2, 9);
    this.title = title || "Untitled";
    this.width = width;
    this.height = height;
    this.bg = bg;
    this.layers = [];
    this.activeLayerIndex = 0;
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.historyStack = [];
    this.historyIndex = -1;
    this.savedHistoryIndex = -1;
    this.isDirty = false;
  }
}

const Documents = {
  docs: [],
  activeDocId: null,
  untitledCounter: 1,
  pendingCloseDocId: null,

  init() {
    // Check if initial document is already created
    if (this.docs.length === 0) {
      this.createDocument("Untitled-1", 1920, 1080, "white", true);
    } else {
      this.renderTabs();
    }
  },

  getActiveDoc() {
    return this.docs.find(d => d.id === this.activeDocId) || null;
  },

  saveCurrentToActiveDoc() {
    const doc = this.getActiveDoc();
    if (!doc) return;

    doc.layers = Layers.layers;
    doc.activeLayerIndex = Layers.activeLayerIndex;
    doc.width = Layers.docWidth;
    doc.height = Layers.docHeight;
    doc.zoom = Canvas.zoom || 1.0;
    doc.panX = Canvas.panX || 0;
    doc.panY = Canvas.panY || 0;
    doc.historyStack = History.stack;
    doc.historyIndex = History.currentIndex;
    doc.isDirty = (doc.historyIndex !== doc.savedHistoryIndex);
  },

  createDocument(title = null, width = 1920, height = 1080, bg = "white", activate = true) {
    if (!title) {
      title = `Untitled-${this.untitledCounter++}`;
    }

    // Save current active document before switching
    if (this.activeDocId) {
      this.saveCurrentToActiveDoc();
    }

    const doc = new PikturaDoc(title, width, height, bg);

    // Initialize layers for this document
    const bgLayer = new Layer("Background", width, height, bg === "white");
    if (bg === "black") {
      bgLayer.ctx.fillStyle = "#000000";
      bgLayer.ctx.fillRect(0, 0, width, height);
    } else if (bg === "transparent") {
      bgLayer.clear();
    }
    const layer1 = new Layer("Layer 1", width, height);

    doc.layers = [bgLayer, layer1];
    doc.activeLayerIndex = 1;
    doc.historyStack = [{
      nameOrKey: "action_new_doc" || "New Document",
      name: (window.I18n && I18n.t("menu_new")) || "New Document",
      toolId: "document",
      details: `${width}×${height}`,
      snapshot: null,
      timestamp: Date.now()
    }];
    doc.historyIndex = 0;
    doc.savedHistoryIndex = 0;
    doc.isDirty = false;

    this.docs.push(doc);

    if (activate) {
      this.activateDocument(doc.id, true);
    } else {
      this.renderTabs();
    }

    return doc;
  },

  openImageDocument(file, img) {
    const title = file && file.name ? file.name : `Image-${this.untitledCounter++}`;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;

    // If the only document open is an untouched, clean initial Untitled document, replace it
    const activeDoc = this.getActiveDoc();
    let replaceInitial = false;
    if (
      this.docs.length === 1 &&
      activeDoc &&
      activeDoc.title.startsWith("Untitled") &&
      !activeDoc.isDirty &&
      activeDoc.historyStack.length <= 1
    ) {
      replaceInitial = true;
    }

    if (this.activeDocId && !replaceInitial) {
      this.saveCurrentToActiveDoc();
    }

    const doc = new PikturaDoc(title, w, h, "transparent");
    const bgLayer = new Layer("Background", w, h, false);
    bgLayer.clear();
    bgLayer.ctx.drawImage(img, 0, 0);

    doc.layers = [bgLayer];
    doc.activeLayerIndex = 0;
    doc.historyStack = [{
      nameOrKey: `Open ${title}`,
      name: (window.I18n ? I18n.t("menu_open") : "Open") + ` ${title}`,
      toolId: "document",
      details: `${w}×${h}`,
      snapshot: null,
      timestamp: Date.now()
    }];
    doc.historyIndex = 0;
    doc.savedHistoryIndex = 0;
    doc.isDirty = false;

    if (replaceInitial) {
      this.docs = [doc];
    } else {
      this.docs.push(doc);
    }

    this.activateDocument(doc.id, true);
    Canvas.fitToScreen();
    this.renderTabs();
    return doc;
  },

  activateDocument(docId, isFresh = false) {
    if (!isFresh && this.activeDocId === docId) return;

    if (this.activeDocId && !isFresh) {
      this.saveCurrentToActiveDoc();
    }

    const doc = this.docs.find(d => d.id === docId);
    if (!doc) return;

    this.activeDocId = doc.id;

    // Load Document Layers into Layers engine
    Layers.docWidth = doc.width;
    Layers.docHeight = doc.height;
    Layers.layers = doc.layers;
    Layers.activeLayerIndex = doc.activeLayerIndex;
    Layers.mountToDOM();
    Layers.renderLayersPanel();

    // Load History
    History.stack = doc.historyStack;
    History.currentIndex = doc.historyIndex;
    History.renderHistoryPanel();

    // Load Canvas Viewport Transform
    Canvas.zoom = doc.zoom || 1.0;
    Canvas.panX = doc.panX || 0;
    Canvas.panY = doc.panY || 0;
    Canvas.updateViewportTransform();
    Canvas.drawRulers();

    // Update Status Bar info
    const sizeEl = document.getElementById("status-doc-size");
    if (sizeEl) sizeEl.innerText = `${doc.width} × ${doc.height} px (72 ppi)`;
    const zoomEl = document.getElementById("status-zoom-label");
    if (zoomEl) zoomEl.innerText = `${Math.round((Canvas.zoom || 1.0) * 100)}%`;

    this.renderTabs();
  },

  renderTabs() {
    const listEl = document.getElementById("ps-doc-tabs-list");
    if (!listEl) return;

    listEl.innerHTML = this.docs.map(doc => {
      const isActive = doc.id === this.activeDocId;
      const zoomPct = Math.round((doc.zoom || 1.0) * 100);
      const isDirty = doc.isDirty || (doc.historyIndex !== doc.savedHistoryIndex && doc.historyIndex > 0);

      return `
        <div class="doc-tab-item ${isActive ? 'active' : ''} ${isDirty ? 'is-dirty' : ''}"
             data-doc-id="${doc.id}"
             onclick="Documents.activateDocument('${doc.id}')"
             title="${doc.title} @ ${zoomPct}% (${doc.width}×${doc.height}px)">
          <span class="doc-tab-dirty-dot"></span>
          <span class="doc-tab-title">${this.escapeHtml(doc.title)}</span>
          <span class="doc-tab-zoom-badge">@ ${zoomPct}%</span>
          <button class="doc-tab-close-btn"
                  onclick="event.stopPropagation(); Documents.requestCloseDocument('${doc.id}')"
                  title="Close (⌘W)">×</button>
        </div>
      `;
    }).join("");

    // Scroll active tab into view
    const activeTabEl = listEl.querySelector(".doc-tab-item.active");
    if (activeTabEl) {
      activeTabEl.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  },

  markActiveDocDirty() {
    const doc = this.getActiveDoc();
    if (doc) {
      doc.isDirty = true;
      this.renderTabs();
    }
  },

  markActiveDocSaved() {
    const doc = this.getActiveDoc();
    if (doc) {
      doc.savedHistoryIndex = History.currentIndex;
      doc.isDirty = false;
      this.renderTabs();
    }
  },

  requestCloseDocument(docId = null) {
    const targetId = docId || this.activeDocId;
    if (!targetId) return;

    if (targetId === this.activeDocId) {
      this.saveCurrentToActiveDoc();
    }

    const doc = this.docs.find(d => d.id === targetId);
    if (!doc) return;

    const isDirty = doc.isDirty || (doc.historyIndex !== doc.savedHistoryIndex && doc.historyIndex > 0);

    if (isDirty) {
      this.pendingCloseDocId = doc.id;
      this.showCloseConfirm(doc);
    } else {
      this.closeDocumentImmediately(doc.id);
    }
  },

  showCloseConfirm(doc) {
    const modal = document.getElementById("modal-close-confirm");
    const msgEl = document.getElementById("close-confirm-msg");
    const titleEl = document.getElementById("close-confirm-title");
    const btnSave = document.getElementById("btn-close-save");
    const btnDontSave = document.getElementById("btn-close-dont-save");
    const btnCancel = document.getElementById("btn-close-cancel");

    if (modal) {
      const isRu = (window.I18n && I18n.currentLang === "ru");
      const isKk = (window.I18n && I18n.currentLang === "kk");
      const title = doc.title || "Untitled";

      if (titleEl) {
        titleEl.innerText = isRu ? "Сохранить изменения?" : (isKk ? "Өзгерістерді сақтау керек пе?" : "Save changes?");
      }
      if (msgEl) {
        msgEl.innerText = isRu
          ? `Сохранить изменения в документе «${title}» перед закрытием?`
          : (isKk ? `Жабу алдында «${title}» құжатындағы өзгерістерді сақтағыңыз келе ме?` : `Do you want to save changes to document "${title}" before closing?`);
      }
      if (btnSave) {
        btnSave.innerText = isRu ? "Сохранить" : (isKk ? "Сақтау" : "Save");
      }
      if (btnDontSave) {
        btnDontSave.innerText = isRu ? "Не сохранять" : (isKk ? "Сақтамау" : "Don't Save");
      }
      if (btnCancel) {
        btnCancel.innerText = isRu ? "Отмена" : (isKk ? "Болдырмау" : "Cancel");
      }
      modal.classList.remove("hidden");
    }
  },

  confirmCloseSave() {
    const doc = this.docs.find(d => d.id === this.pendingCloseDocId);
    const targetId = this.pendingCloseDocId;
    this.cancelClose();

    if (targetId) {
      // Activate document first so export captures its layers
      this.activateDocument(targetId);
      if (window.App) {
        App.exportImage("png");
      }
      this.markActiveDocSaved();
      this.closeDocumentImmediately(targetId);
    }
  },

  confirmCloseDontSave() {
    const targetId = this.pendingCloseDocId;
    this.cancelClose();
    if (targetId) {
      this.closeDocumentImmediately(targetId);
    }
  },

  cancelClose() {
    this.pendingCloseDocId = null;
    const modal = document.getElementById("modal-close-confirm");
    if (modal) modal.classList.add("hidden");
  },

  closeDocumentImmediately(docId) {
    const idx = this.docs.findIndex(d => d.id === docId);
    if (idx === -1) return;

    if (this.docs.length <= 1) {
      // If closing the only document, replace with a fresh Untitled-1
      this.docs = [];
      this.activeDocId = null;
      this.createDocument("Untitled-1", 1920, 1080, "white", true);
      Canvas.fitToScreen();
      return;
    }

    const wasActive = this.activeDocId === docId;
    this.docs.splice(idx, 1);

    if (wasActive) {
      // Switch to neighbor tab
      const nextIdx = Math.min(idx, this.docs.length - 1);
      this.activeDocId = null; // force reactivation
      this.activateDocument(this.docs[nextIdx].id);
    } else {
      this.renderTabs();
    }
  },

  escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
};

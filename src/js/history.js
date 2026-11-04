/**
 * Piktura Studio — History & Undo/Redo Engine
 */
const History = {
  stack: [],
  currentIndex: -1,
  maxStates: 50,

  /**
   * Push a state to history stack
   * @param {string} actionNameOrKey - Direct name or i18n translation key (e.g. "action_brush_stroke")
   * @param {object} snapshot - Optional layer serialization snapshot
   * @param {string} toolId - Tool/category ID for icon representation
   * @param {string} details - Optional extra detail suffix (e.g. "5px", "Layer 1")
   */
  pushState(actionNameOrKey, snapshot = null, toolId = null, details = "") {
    // If we performed an action while viewing a past state, truncate future states
    if (this.currentIndex < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.currentIndex + 1);
    }

    // Auto-detect tool ID if not passed
    if (!toolId && window.Tools) {
      toolId = Tools.currentTool;
    }

    // Capture snapshot of layers if not explicitly provided
    if (!snapshot && window.Layers) {
      snapshot = Layers.serialize();
    }

    const state = {
      nameOrKey: actionNameOrKey,
      name: (window.I18n && I18n.t(actionNameOrKey)) || actionNameOrKey,
      toolId: toolId || "document",
      details: details,
      snapshot: snapshot,
      timestamp: Date.now()
    };

    this.stack.push(state);
    if (this.stack.length > this.maxStates) {
      this.stack.shift();
    } else {
      this.currentIndex++;
    }

    if (window.Documents) {
      Documents.markActiveDocDirty();
    }

    this.renderHistoryPanel();
  },

  undo() {
    if (this.currentIndex > 0) {
      this.goToState(this.currentIndex - 1);
    }
  },

  redo() {
    if (this.currentIndex < this.stack.length - 1) {
      this.goToState(this.currentIndex + 1);
    }
  },

  goToState(index) {
    if (index >= 0 && index < this.stack.length) {
      this.currentIndex = index;
      const targetState = this.stack[this.currentIndex];
      if (window.Layers && targetState.snapshot) {
        Layers.deserialize(targetState.snapshot);
      }
      if (window.Documents) {
        Documents.markActiveDocDirty();
      }
      this.renderHistoryPanel();
      if (window.Canvas) {
        Canvas.redraw();
      }
    }
  },

  getToolIconSvg(toolId) {
    const svgs = {
      brush: '<path d="M16.5 3.5a2.12 2.12 0 0 0-3 0L7 10l-1 4 4-1 6.5-6.5a2.12 2.12 0 0 0 0-3zM7 10l3 3M3 17c1.5 0 2.5-.5 3-1.5L5 14.5 3.5 13C2.5 13.5 2 14.5 2 16a1 1 0 0 0 1 1z"/>',
      eraser: '<path d="M14.5 3.5l3 3-9 9H4l-1.5-1.5 8-8 4-2.5zM7.5 10.5l3 3M2 18h16"/>',
      marquee: '<rect x="3" y="4" width="14" height="12" rx="1" stroke-dasharray="2 2"/>',
      lasso: '<path d="M14 6c0-2.2-2.7-3.5-5.5-3.5S3 4.5 3 8s2.5 6 6 6c2.5 0 4.5-1 5.5-3l2.5 6"/>',
      wand: '<path d="M4 16l8.5-8.5M12.5 7.5l2-2a1.4 1.4 0 0 1 2 2l-2 2M15 2v2M14 3h2M7 3v1M6.5 3.5h1M3 8v1M2.5 8.5h1"/>',
      crop: '<path d="M6 2v12h12M2 6h12v12M14 2v4M18 6h-4"/>',
      bucket: '<path d="M5 9l5-5 5.5 5.5-5 5zM3 11l6.5-6.5M10.5 14.5l-2.5 2.5a2 2 0 0 1-3-3l2.5-2.5M16 14a1.5 1.5 0 1 1-3 0c0-1.5 1.5-3 1.5-3s1.5 1.5 1.5 3z"/>',
      gradient: '<rect x="3" y="3" width="14" height="14" rx="2"/><path d="M3 17L17 3M3 11L11 3M9 17L17 9"/>',
      stamp: '<path d="M7 3h6v3H7zM10 6v5M5 11h10v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM4 17h12"/>',
      healing: '<rect x="3.5" y="7.5" width="13" height="5" rx="2.5" transform="rotate(-45 10 10)"/><circle cx="10" cy="10" r="0.8" fill="currentColor"/>',
      blur: '<circle cx="10" cy="10" r="5"/><path d="M10 2v3M10 15v3M2 10h3M15 10h3"/>',
      "blur-sharpen": '<circle cx="10" cy="10" r="5"/><path d="M10 2v3M10 15v3M2 10h3M15 10h3"/>',
      dodge: '<circle cx="9" cy="9" r="5"/><path d="M13 13l4.5 4.5"/>',
      move: '<path d="M10 2v16M2 10h16M10 2l-2.5 2.5M10 2l2.5 2.5M10 18l-2.5-2.5M10 18l2.5-2.5M2 10l2.5-2.5M2 10l2.5 2.5M18 10l-2.5-2.5M18 10l2.5 2.5"/>',
      shape: '<rect x="3" y="4" width="14" height="12" rx="2"/>',
      text: '<path d="M4 5h12M10 5v12M7 17h6M4 5v2M16 5v2"/>',
      pen: '<path d="M10 2l5 7-3 8-4-2-4 2-3-8 6-7zM10 2v7"/><circle cx="10" cy="11" r="1" fill="currentColor"/>',
      eyedropper: '<path d="M12 4l4 4M10.5 5.5l-6 6a2 2 0 0 0-.5 1l-.5 3 3-.5a2 2 0 0 0 1-.5l6-6M13.5 2.5a2.1 2.1 0 0 1 3 3l-1 1-3-3 1-1z"/>',
      "history-brush": '<path d="M4 8a6 6 0 1 1 1.5 4M4 4v4h4M12 8l4.5-4.5a1.5 1.5 0 0 1 2.1 2.1L14 10"/>',
      layer: '<path d="M10 3l8 4-8 4-8-4 8-4zM2 11l8 4 8-4M2 15l8 4 8-4"/>',
      filter: '<circle cx="10" cy="10" r="6"/><path d="M10 4v12M4 10h12"/>',
      select: '<rect x="3" y="3" width="14" height="14" rx="2" stroke-dasharray="3 2"/>',
      document: '<path d="M4 2h8l4 4v12H4V2zM12 2v4h4"/>'
    };

    const path = svgs[toolId] || svgs.document;
    return `<svg viewBox="0 0 20 20" style="width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;display:inline-block;vertical-align:middle;margin-right:6px;opacity:0.85;">${path}</svg>`;
  },

  renderHistoryPanel() {
    const listEl = document.getElementById("history-list");
    if (!listEl) return;

    listEl.innerHTML = this.stack.map((item, idx) => {
      const isActive = idx === this.currentIndex ? "active" : "";
      const label = (window.I18n && I18n.t(item.nameOrKey)) || item.name || item.nameOrKey;
      const fullLabel = item.details ? `${label} ${item.details}` : label;
      const iconSvg = this.getToolIconSvg(item.toolId);

      return `
        <div class="history-item ${isActive}" onclick="History.goToState(${idx})" data-step="${idx}" title="${fullLabel}">
          <span class="step-icon">${iconSvg}</span>
          <span class="step-label">${fullLabel}</span>
        </div>
      `;
    }).join("");

    const activeItem = listEl.querySelector(".history-item.active");
    if (activeItem) {
      activeItem.scrollIntoView({ block: "nearest" });
    }
  }
};

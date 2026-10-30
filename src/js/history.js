/**
 * Piktura Studio — History & Undo/Redo Engine
 */
const History = {
  stack: [],
  currentIndex: -1,
  maxStates: 40,

  pushState(actionName, snapshot = null) {
    // If we performed an action while viewing a past state, truncate future states
    if (this.currentIndex < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.currentIndex + 1);
    }

    // Capture snapshot of layers if not explicitly provided
    if (!snapshot) {
      snapshot = Layers.serialize();
    }

    const state = {
      name: actionName,
      snapshot: snapshot,
      timestamp: Date.now()
    };

    this.stack.push(state);
    if (this.stack.length > this.maxStates) {
      this.stack.shift();
    } else {
      this.currentIndex++;
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
      Layers.deserialize(targetState.snapshot);
      this.renderHistoryPanel();
      Canvas.redraw();
    }
  },

  renderHistoryPanel() {
    const listEl = document.getElementById("history-list");
    if (!listEl) return;

    listEl.innerHTML = this.stack.map((item, idx) => {
      const isActive = idx === this.currentIndex ? "active" : "";
      return `
        <div class="history-item ${isActive}" onclick="History.goToState(${idx})" data-step="${idx}">
          <span class="step-icon">📜</span>
          <span class="step-label">${item.name}</span>
        </div>
      `;
    }).join("");

    const activeItem = listEl.querySelector(".history-item.active");
    if (activeItem) {
      activeItem.scrollIntoView({ block: "nearest" });
    }
  }
};

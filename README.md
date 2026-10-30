# 🎨 Piktura Studio

> **The Next-Gen, Native, Lightweight Photoshop Alternative for macOS & Creative Pros**  
> *100% Offline • Hardware Accelerated • No Subscription • Pure Creative Freedom*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: macOS](https://img.shields.io/badge/Platform-macOS%20Apple%20Silicon-black.svg)]()
[![Photoshop Ergonomics](https://img.shields.io/badge/Ergonomics-Photoshop%20Classics-orange.svg)]()

---

## ✨ Why Piktura?

While apps like Pixelmator are visually modern, they hide professional controls in complex floating popovers, breaking the battle-tested muscle memory photographers and designers developed over decades.

**Piktura Studio** gives you the best of both worlds:
1. **Photoshop-Grade Ergonomics:** The classic, intuitive layout with a real **Top Options Bar**, dockable **Toolbar (1-col / 2-col)**, live **Layer Stack** with blend modes, and interactive **History Stack**.
2. **Instant Launch & Ultra-Lightweight:** Launches in under 0.4 seconds. No 4GB RAM hunger, no bloated cloud background daemons, no monthly subscription paywalls.
3. **Apple Silicon Native:** Crafted specifically for macOS with an Apple Human Interface Guidelines squircle icon, fluid window management, and ProMotion 120Hz canvas rendering.

---

## 🛠 Features at a Glance

* **🎨 Multi-Layer Engine:**
  * Full Photoshop blend modes (*Normal, Multiply, Screen, Overlay, Soft Light, Color Dodge, etc.*).
  * Layer opacity & fill, visibility toggles, duplicate (`⌘J`), merge down (`⌘E`), and layer masks.
* **⚡ Battle-Tested Photoshop Tools:**
  * **Move Tool (`V`)** & Free Transform (`⌘T`) with 8 resize handles.
  * **Selection Tools (`M`, `L`, `W`):** Rectangular & Elliptical Marquee, Lasso, Magic Wand with tolerance & contiguous controls.
  * **Painting & Retouching (`B`, `E`, `J`, `S`, `G`):** Brush, Eraser, Spot Healing, Clone Stamp, Paint Bucket & Gradients.
  * **Vector & Typography (`P`, `T`, `U`):** Pen Tool with Bezier curves, Horizontal Type with custom fonts, and Vector Shape tools.
  * **Color Picker (`I`, `X`, `D`):** Classic foreground/background color chips, HSV spectrum picker, and canvas eyedropper.
* **📜 Deep History & Undo:**
  * Non-destructive Undo/Redo stack (`⌘Z`, `⇧⌘Z`).
  * Interactive history list with state restore.
* **🔮 Core Filters & Adjustments:**
  * Brightness/Contrast, Levels (`⌘L`), Curves (`⌘M`), Invert (`⌘I`), Desaturate (`⇧⌘U`), Auto Tone.
  * Gaussian Blur, Motion Blur, Sharpen, Unsharp Mask, Add Noise, Pixelate.

---

## 🚀 Quick Start

### Running from Source
```bash
git clone https://github.com/GhostOS-ai/Piktura.git
cd Piktura
python3 -m pip install pywebview pyobjc-framework-Cocoa
python3 piktura_app.py
```

### Building Standalone macOS App (`Piktura.app`)
```bash
pyinstaller Piktura.spec --noconfirm
```
The compiled bundle will be available at `dist/Piktura.app`.

---

## 📜 License
Distributed under the **MIT License**. Created with ❤️ by **KIB.best**.

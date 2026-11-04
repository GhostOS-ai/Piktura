"""
Piktura Studio: Standalone Professional Creative Desktop App
"""

import os
import sys
from pathlib import Path
import webview

# Configure webview settings for smooth dragging
webview.settings['DRAG_REGION_SELECTOR'] = '.pywebview-drag-region'
webview.settings['DRAG_REGION_DIRECT_TARGET_ONLY'] = True

class PikturaBridgeAPI:
    def __init__(self, window=None):
        self.window = window
        self.is_maximized = False
        self.prev_bounds = None

    def set_window(self, window):
        self.window = window

    def minimize(self):
        if self.window:
            self.window.minimize()

    def toggle_maximize(self):
        if not self.window:
            return
        if sys.platform == "darwin":
            try:
                from AppKit import NSScreen
                screen = NSScreen.mainScreen()
                vis = screen.visibleFrame()
                full = screen.frame()

                # AppKit coordinate system has (0,0) at bottom-left
                # pywebview coordinate system has (0,0) at top-left
                top_y = int(full.size.height - (vis.origin.y + vis.size.height))
                left_x = int(vis.origin.x)
                vis_w = int(vis.size.width)
                vis_h = int(vis.size.height)

                if not self.is_maximized:
                    self.prev_bounds = (self.window.x, self.window.y, self.window.width, self.window.height)
                    self.window.move(left_x, top_y)
                    self.window.resize(vis_w, vis_h)
                    self.is_maximized = True
                else:
                    if self.prev_bounds:
                        px, py, pw, ph = self.prev_bounds
                        self.window.move(px, py)
                        self.window.resize(pw, ph)
                    else:
                        self.window.resize(1340, 840)
                    self.is_maximized = False
                return
            except Exception:
                pass

        # Fallback for non-macOS
        if not self.is_maximized:
            self.window.maximize()
            self.is_maximized = True
        else:
            self.window.restore()
            self.is_maximized = False

    def close(self):
        if self.window:
            self.window.destroy()

    def choose_file(self):
        if self.window:
            res = self.window.create_file_dialog(webview.OPEN_DIALOG, allow_multiple=False, file_types=('Image Files (*.png;*.jpg;*.jpeg;*.webp;*.psd)', 'All files (*.*)'))
            if res and len(res) > 0:
                return res[0]
        return None

def set_macos_dock_icon():
    if sys.platform == "darwin":
        try:
            from AppKit import NSApplication, NSImage
            app = NSApplication.sharedApplication()
            icon_file = Path(__file__).parent / "assets" / "icon.png"
            if icon_file.exists():
                img = NSImage.alloc().initWithContentsOfFile_(str(icon_file))
                if img:
                    app.setApplicationIconImage_(img)
        except Exception:
            pass

def launch():
    set_macos_dock_icon()
    base_dir = Path(__file__).parent
    index_html = base_dir / "src" / "index.html"

    if not index_html.exists():
        raise FileNotFoundError(f"Missing UI assets at: {index_html}")

    api = PikturaBridgeAPI()

    try:
        screens = webview.screens
        if screens:
            primary = screens[0]
            start_x = max(20, (primary.width - 1340) // 2)
            start_y = max(20, (primary.height - 840) // 2)
        else:
            start_x, start_y = 60, 40
    except Exception:
        start_x, start_y = 60, 40

    window = webview.create_window(
        title="Piktura Studio",
        url=index_html.as_uri(),
        js_api=api,
        width=1340,
        height=840,
        x=start_x,
        y=start_y,
        frameless=True,
        transparent=False,
        on_top=False,
        easy_drag=False,
        shadow=True,
        text_select=True,
    )

    api.set_window(window)
    webview.start(debug=False)

if __name__ == "__main__":
    launch()

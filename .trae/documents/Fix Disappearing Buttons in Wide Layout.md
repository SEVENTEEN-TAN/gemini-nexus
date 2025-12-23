# Troubleshoot Buttons Disappearing on Wide Layout

## 1. Issue Analysis
The user reports that when the window is stretched too wide, the bottom function buttons (tools) disappear.

## 2. Root Cause Found
I checked `css/input.css` and found the following CSS rule:

```css
/* Hide unsupported buttons in wide (full-page) mode */
body.layout-wide .tool-btn.context-aware {
    display: none !important;
}
```

This rule explicitly hides all buttons with the class `.tool-btn.context-aware` when the body has the `layout-wide` class.
The `layout-wide` class is added by `UIController` in `sandbox/ui/ui_controller.js` when `window.innerWidth > 800`.

The intention likely was that "context-aware" tools (like "Quote", "OCR", "Snip") which rely on interacting with *another* tab might not work or be relevant when the extension is running in a full-page tab (Wide Mode). However, in a Side Panel context that is simply resized to be wide, these tools are still perfectly valid and needed.

## 3. Solution Plan
1.  **Modify CSS**: Remove or comment out the `display: none !important;` rule in `css/input.css` for `body.layout-wide .tool-btn.context-aware`.
2.  **Verify**: Ensure that expanding the window width (>800px) no longer hides these buttons.

## 4. Execution Steps
1.  Edit `css/input.css`.
2.  Remove the hiding rule.
3.  Rebuild the extension (`npm run build`).

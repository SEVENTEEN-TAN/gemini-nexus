// content.js v4.0.0 -> content/index.js

// Fix: Inline constants because Content Scripts do not support ES Module imports natively in this configuration.
const DEFAULT_SHORTCUTS = {
    quickAsk: "Ctrl+G",
    openPanel: "Alt+S"
};

console.log("%c Gemini Nexus v4.0.0 Ready ", "background: #333; color: #00ff00; font-size: 16px");

// Initialize Helpers
const selectionOverlay = new window.GeminiNexusOverlay();
const floatingToolbar = new window.GeminiToolbarController(); 

// State to track who requested the capture
let captureSource = null;

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // 来自右键菜单的指令
    if (request.action === "CONTEXT_MENU_ACTION") {
        if (floatingToolbar) {
            floatingToolbar.handleContextAction(request.mode);
        }
        sendResponse({status: "ok"});
        return true;
    }

    // Focus Input
    if (request.action === "FOCUS_INPUT") {
        try {
            const inputBox = document.querySelector('div[contenteditable="true"][role="textbox"]');
            if (inputBox) {
                inputBox.focus();
                const selection = window.getSelection();
                if (selection.rangeCount > 0) selection.removeAllRanges();
                sendResponse({status: "ok"});
            } else {
                sendResponse({status: "error", msg: "DOM_NOT_FOUND"});
            }
        } catch (e) {
            sendResponse({status: "error", msg: e.message});
        }
        return true;
    }

    // Start Selection Mode
    if (request.action === "START_SELECTION") {
        captureSource = request.source; // Track source (e.g. 'sidepanel')

        // 关键：在截图前隐藏所有浮动 UI，防止 UI 被截进去
        if (floatingToolbar) {
            floatingToolbar.hideAll();
            // Update the controller's mode if provided, so it knows what to do with the result (if local)
            if (request.mode) {
                floatingToolbar.currentMode = request.mode;
            }
        }
        // Passing captured image from request to overlay
        selectionOverlay.start(request.image);
        sendResponse({status: "selection_started"});
        return true;
    }

    // 处理截图后的裁剪结果
    if (request.action === "CROP_SCREENSHOT") {
        if (captureSource === 'sidepanel') {
            // Forward back to sidepanel via background
            chrome.runtime.sendMessage({ 
                action: "PROCESS_CROP_IN_SIDEPANEL", 
                payload: request 
            });
            captureSource = null;
        } else {
            // Handle locally with floating toolbar
            if (floatingToolbar) {
                floatingToolbar.handleCropResult(request);
            }
        }
        sendResponse({status: "ok"});
        return true;
    }

    // Handle Generated Image Result
    if (request.action === "GENERATED_IMAGE_RESULT") {
        if (floatingToolbar) {
            floatingToolbar.handleGeneratedImageResult(request);
        }
        sendResponse({status: "ok"});
        return true;
    }

    // Get Active Selection
    if (request.action === "GET_SELECTION") {
        sendResponse({ selection: window.getSelection().toString() });
        return true;
    }

    // Get Full Page Content (Cleaned Text)
    if (request.action === "GET_PAGE_CONTENT") {
        try {
            let text = document.body.innerText || "";
            text = text.replace(/\n{3,}/g, '\n\n');
            sendResponse({ content: text });
        } catch(e) {
            sendResponse({ content: "", error: e.message });
        }
        return true;
    }
});

// --- Shortcut Configuration ---
let appShortcuts = { ...DEFAULT_SHORTCUTS };

// Initial Load of Settings
chrome.storage.local.get(['geminiShortcuts', 'geminiTextSelectionEnabled', 'geminiImageToolsEnabled'], (result) => {
    if (result.geminiShortcuts) {
        appShortcuts = { ...appShortcuts, ...result.geminiShortcuts };
    }
    // Default enabled if undefined
    const selectionEnabled = result.geminiTextSelectionEnabled !== false;
    if (floatingToolbar) {
        floatingToolbar.setSelectionEnabled(selectionEnabled);
    }
    
    // Image Tools
    const imageToolsEnabled = result.geminiImageToolsEnabled !== false;
    if (floatingToolbar) {
        floatingToolbar.setImageToolsEnabled(imageToolsEnabled);
    }
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.geminiShortcuts) {
            appShortcuts = { ...appShortcuts, ...changes.geminiShortcuts.newValue };
        }
        if (changes.geminiTextSelectionEnabled) {
             const enabled = changes.geminiTextSelectionEnabled.newValue !== false;
             if (floatingToolbar) {
                 floatingToolbar.setSelectionEnabled(enabled);
             }
        }
        if (changes.geminiImageToolsEnabled) {
             const enabled = changes.geminiImageToolsEnabled.newValue !== false;
             if (floatingToolbar) {
                 floatingToolbar.setImageToolsEnabled(enabled);
             }
        }
    }
});

function matchShortcut(event, shortcutString) {
    if (!shortcutString) return false;
    
    const parts = shortcutString.split('+').map(p => p.trim().toLowerCase());
    const key = event.key.toLowerCase();
    
    const hasCtrl = parts.includes('ctrl');
    const hasAlt = parts.includes('alt');
    const hasShift = parts.includes('shift');
    const hasMeta = parts.includes('meta') || parts.includes('command');
    
    if (event.ctrlKey !== hasCtrl) return false;
    if (event.altKey !== hasAlt) return false;
    if (event.shiftKey !== hasShift) return false;
    if (event.metaKey !== hasMeta) return false;

    const mainKeys = parts.filter(p => !['ctrl','alt','shift','meta','command'].includes(p));
    if (mainKeys.length !== 1) return false;

    return key === mainKeys[0];
}

document.addEventListener('keydown', (e) => {
    if (matchShortcut(e, appShortcuts.openPanel)) {
        e.preventDefault(); 
        e.stopPropagation();
        chrome.runtime.sendMessage({ action: "OPEN_SIDE_PANEL" });
        return;
    }

    if (matchShortcut(e, appShortcuts.quickAsk)) {
        e.preventDefault();
        e.stopPropagation();
        floatingToolbar.showGlobalInput();
        return;
    }
}, true);
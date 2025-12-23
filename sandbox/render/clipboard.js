
// sandbox/render/clipboard.js

export async function copyToClipboard(text) {
    // Detect if we are in a sandboxed iframe with opaque origin (null).
    // In this case, navigator.clipboard.writeText triggers a Permissions Policy violation 
    // even with allow="clipboard-write", so we skip it to avoid the console error.
    const isSandboxed = window.origin === "null";

    // 1. Try Modern API first (only if not sandboxed)
    if (!isSandboxed && navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return;
        } catch (err) {
            console.warn("Clipboard API failed (likely permissions), attempting fallback...", err);
        }
    }

    // 2. Fallback: execCommand('copy')
    // This usually works in sandboxed iframes or contexts where the Async API is blocked.
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Ensure it's part of the DOM but invisible
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (!successful) throw new Error('execCommand returned false');
    } catch (err) {
        throw new Error("Fallback copy failed: " + err.message);
    } finally {
        document.body.removeChild(textArea);
    }
}


// lib/utils.js

// Extract authentication token from HTML
export function extractFromHTML(variableName, html) {
    const regex = new RegExp(`"${variableName}":"([^"]+)"`);
    const match = regex.exec(html);
    return match?.[1];
}

// Generate a random UUID
export function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }).toUpperCase();
}

// Convert Data URL to Blob (Safe implementation without fetch)
export async function dataUrlToBlob(dataUrl) {
    try {
        const arr = dataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    } catch (e) {
        throw new Error("Failed to convert data URL to Blob: " + e.message);
    }
}

// Upgrade Google Image URL to High Res (Original Quality)
export function getHighResImageUrl(url) {
    if (!url) return null;
    
    // Robustly replace or append size parameter
    const parts = url.split('?');
    let base = parts[0];
    const query = parts.slice(1).join('?');

    // Check for existing parameters in the path (e.g. =s1024, =w500)
    const lastSlash = base.lastIndexOf('/');
    const lastEquals = base.lastIndexOf('=');

    if (lastEquals > lastSlash) {
        // Strip existing parameter
        base = base.substring(0, lastEquals);
    }

    // Append high-res parameter (=s0)
    base += "=s0";

    return base + (query ? '?' + query : '');
}

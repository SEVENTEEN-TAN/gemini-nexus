
// sandbox/render/generated_image.js
import { sendToBackground } from '../../lib/messaging.js';
import { getHighResImageUrl } from '../../lib/utils.js';

export function createGeneratedImage(imgData) {
    const img = document.createElement('img');
    img.className = 'generated-image loading';
    img.alt = imgData.alt || "Generated Image";
    
    // Loading Placeholder (Transparent 1x1 SVG)
    img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjwvc3ZnPg==';
    
    // Generate Unique Request ID for background fetching correlation
    const reqId = "gen_img_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    img.dataset.reqId = reqId;

    // Visual Placeholder Style
    img.style.background = "#f0f4f9";
    img.style.minHeight = "200px"; // Prevent layout shift before CSS loads or image renders
    img.style.display = "block";

    // Upgrade to HD (Original Size) using shared utility
    const targetUrl = getHighResImageUrl(imgData.url);

    // Request Background Fetch (Proxy) to handle CORS/Cookies and get Base64
    sendToBackground({ 
        action: "FETCH_GENERATED_IMAGE", 
        url: targetUrl, 
        reqId: reqId 
    });

    // Click to view full size (works once the src is populated with base64)
    img.addEventListener('click', () => {
        if (img.src && !img.src.startsWith('data:image/svg')) {
            document.dispatchEvent(new CustomEvent('gemini-view-image', { detail: img.src }));
        }
    });
    
    return img;
}

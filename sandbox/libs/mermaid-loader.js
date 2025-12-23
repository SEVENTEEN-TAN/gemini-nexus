
// sandbox/libs/mermaid-loader.js
export function loadMermaid() {
    return new Promise((resolve, reject) => {
        // If already loaded and available globally
        if (window.mermaid) {
            resolve(window.mermaid);
            return;
        }

        // Check if script is currently loading to avoid race conditions
        const existingScript = document.querySelector('script[data-mermaid-loader]');
        if (existingScript) {
            const checkInterval = setInterval(() => {
                if (window.mermaid) {
                    clearInterval(checkInterval);
                    resolve(window.mermaid);
                }
            }, 100);
            // Timeout after 5s
            setTimeout(() => {
                clearInterval(checkInterval);
                if (!window.mermaid) console.warn("Mermaid load timeout, but ignoring.");
            }, 5000);
            return;
        }

        const script = document.createElement('script');
        script.src = 'vendor/mermaid-global.js';
        script.dataset.mermaidLoader = "true";

        script.onload = () => {
            if (window.mermaid) {
                // Initialize explicitly
                window.mermaid.initialize({
                    startOnLoad: false,
                    theme: 'default',
                    securityLevel: 'loose'
                });
                resolve(window.mermaid);
            } else {
                reject(new Error("Mermaid script loaded but window.mermaid undefined. File might be ESM instead of UMD?"));
            }
        };

        script.onerror = (e) => {
            console.error("Mermaid script error:", e);
            reject(new Error("Failed to load mermaid-global.js"));
        };

        document.head.appendChild(script);
    });
}

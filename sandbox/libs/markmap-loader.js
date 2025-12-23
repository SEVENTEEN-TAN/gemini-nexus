
// sandbox/libs/markmap-loader.js

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
    });
}

let loaded = false;

export async function loadMarkmap() {
    if (loaded) return {
        Transformer: window.markmap.Transformer,
        Markmap: window.markmap.Markmap
    };

    if (window.markmap && window.d3) {
        loaded = true;
        return {
            Transformer: window.markmap.Transformer,
            Markmap: window.markmap.Markmap
        };
    }

    try {
        // Load D3 first
        if (!window.d3) await loadScript('vendor/d3.js');
        // Load Markmap Lib (Transformer) logic is usually in markmap-lib.
        // CHECK: markmap-lib UMD exposes window.markmap.Transformer?
        // CHECK: markmap-view UMD exposes window.markmap.Markmap?

        await loadScript('vendor/markmap-view.js');
        await loadScript('vendor/markmap-lib.js');

        loaded = true;
        return {
            Transformer: window.markmap.Transformer,
            Markmap: window.markmap.Markmap
        };
    } catch (e) {
        console.error("Markmap load failed", e);
        throw e;
    }
}

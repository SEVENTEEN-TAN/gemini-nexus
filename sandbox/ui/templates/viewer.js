export const ViewerTemplate = `
    <!-- IMAGE VIEWER -->
    <div id="image-viewer" class="image-viewer">
        <div class="viewer-container" id="viewer-container">
            <img class="viewer-content" id="full-image" draggable="false" referrerpolicy="no-referrer">
        </div>
        
        <div class="viewer-toolbar">
            <button id="viewer-zoom-out" data-i18n-title="zoomOut" title="Zoom Out (Scroll Down)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <span id="viewer-zoom-level">100%</span>
            <button id="viewer-zoom-in" data-i18n-title="zoomIn" title="Zoom In (Scroll Up)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <div class="viewer-divider"></div>
            <button id="viewer-reset" data-i18n-title="resetZoom" title="Fit to Screen (Double Click)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
            </button>
            <button id="viewer-download" data-i18n-title="downloadImage" title="Download Image">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
            <div class="viewer-divider"></div>
            <button id="viewer-close" data-i18n-title="close" title="Close (Esc)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
    </div>
`;
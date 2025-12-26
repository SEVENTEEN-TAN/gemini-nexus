
// background/control/breakpoint_overlay.js
/**
 * Breakpoint Control Overlay UI
 * Shows when browser automation is paused, allowing user intervention
 */

export class BreakpointOverlay {
    constructor(connection) {
        this.connection = connection;
        this.isActive = false;
        this.pauseCallback = null;
        this.resumeCallback = null;
        this.endCallback = null;
    }

    /**
     * Show breakpoint overlay on the page
     * Disables user interaction and shows control panel
     */
    async show(message = 'Automation paused - waiting for user action') {
        if (this.isActive) return;
        this.isActive = true;

        try {
            // Inject overlay HTML and CSS
            await this.connection.sendCommand("Runtime.evaluate", {
                expression: `
                    (function() {
                        // Remove existing overlay if any
                        const existing = document.getElementById('gemini-breakpoint-overlay');
                        if (existing) existing.remove();

                        // Create overlay container
                        const overlay = document.createElement('div');
                        overlay.id = 'gemini-breakpoint-overlay';
                        overlay.style.cssText = \`
                            position: fixed;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: radial-gradient(circle at center, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
                            backdrop-filter: blur(1px);
                            z-index: 999998;
                            pointer-events: auto;
                            display: flex;
                            align-items: flex-end;
                            justify-content: center;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        \`;

                        // Create control panel at bottom
                        const panel = document.createElement('div');
                        panel.id = 'gemini-breakpoint-panel';
                        panel.style.cssText = \`
                            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                            border-top: 2px solid #3b82f6;
                            box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.15);
                            padding: 20px 24px;
                            margin-bottom: 0;
                            border-radius: 12px 12px 0 0;
                            max-width: 600px;
                            width: 100%;
                            display: flex;
                            align-items: center;
                            gap: 16px;
                            animation: slideUp 0.3s ease-out;
                        \`;

                        // Add animation keyframes
                        if (!document.getElementById('gemini-breakpoint-styles')) {
                            const style = document.createElement('style');
                            style.id = 'gemini-breakpoint-styles';
                            style.textContent = \`
                                @keyframes slideUp {
                                    from {
                                        transform: translateY(100%);
                                        opacity: 0;
                                    }
                                    to {
                                        transform: translateY(0);
                                        opacity: 1;
                                    }
                                }
                                
                                .breakpoint-btn {
                                    padding: 10px 20px;
                                    border: none;
                                    border-radius: 6px;
                                    font-weight: 500;
                                    cursor: pointer;
                                    font-size: 14px;
                                    transition: all 0.2s ease;
                                    display: flex;
                                    align-items: center;
                                    gap: 8px;
                                }
                                
                                .breakpoint-btn:hover {
                                    transform: translateY(-2px);
                                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                                }
                                
                                .breakpoint-btn:active {
                                    transform: translateY(0);
                                }
                                
                                .breakpoint-pause {
                                    background: #3b82f6;
                                    color: white;
                                }
                                
                                .breakpoint-pause:hover {
                                    background: #2563eb;
                                }
                                
                                .breakpoint-end {
                                    background: #ef4444;
                                    color: white;
                                }
                                
                                .breakpoint-end:hover {
                                    background: #dc2626;
                                }
                                
                                .breakpoint-message {
                                    flex: 1;
                                    color: #1f2937;
                                    font-size: 14px;
                                    display: flex;
                                    align-items: center;
                                    gap: 10px;
                                }
                                
                                .breakpoint-spinner {
                                    display: inline-block;
                                    width: 16px;
                                    height: 16px;
                                    border: 2px solid #e5e7eb;
                                    border-top-color: #3b82f6;
                                    border-radius: 50%;
                                    animation: spin 0.6s linear infinite;
                                }
                                
                                @keyframes spin {
                                    to { transform: rotate(360deg); }
                                }
                            \`;
                            document.head.appendChild(style);
                        }

                        // Message section with spinner
                        const messageDiv = document.createElement('div');
                        messageDiv.className = 'breakpoint-message';
                        messageDiv.innerHTML = \`
                            <span class="breakpoint-spinner"></span>
                            <span id="breakpoint-message-text">${'${message}'}</span>
                        \`;

                        // Pause button
                        const pauseBtn = document.createElement('button');
                        pauseBtn.className = 'breakpoint-btn breakpoint-pause';
                        pauseBtn.id = 'gemini-breakpoint-pause';
                        pauseBtn.innerHTML = '⏸ Pause (Allow Edit)';
                        pauseBtn.style.marginLeft = 'auto';
                        
                        // Add click handler for Pause button
                        pauseBtn.addEventListener('click', () => {
                            window.__geminiBreakpointAction = 'pause';
                        });

                        // End button
                        const endBtn = document.createElement('button');
                        endBtn.className = 'breakpoint-btn breakpoint-end';
                        endBtn.id = 'gemini-breakpoint-end';
                        endBtn.innerHTML = '⏹ End';
                        
                        // Add click handler for End button
                        endBtn.addEventListener('click', () => {
                            window.__geminiBreakpointAction = 'end';
                        });

                        panel.appendChild(messageDiv);
                        panel.appendChild(pauseBtn);
                        panel.appendChild(endBtn);
                        overlay.appendChild(panel);

                        // Disable all interactive elements outside the panel
                        const style = document.createElement('style');
                        style.textContent = \`
                            body > *:not(#gemini-breakpoint-overlay),
                            body *:not(#gemini-breakpoint-panel):not(#gemini-breakpoint-panel *) {
                                pointer-events: none !important;
                            }
                        \`;
                        document.head.appendChild(style);

                        document.body.appendChild(overlay);
                        
                        window.__geminiBreakpointState = {
                            pauseBtn,
                            endBtn,
                            overlay,
                            messageText: document.getElementById('breakpoint-message-text')
                        };
                    })()
                `
            });

            // Listen for button clicks via content script bridge
            // Will be handled by connection events
        } catch (e) {
            console.error("[Breakpoint] Failed to show overlay:", e);
        }
    }

    /**
     * Hide breakpoint overlay
     */
    async hide() {
        if (!this.isActive) return;
        this.isActive = false;

        try {
            await this.connection.sendCommand("Runtime.evaluate", {
                expression: `
                    (function() {
                        const overlay = document.getElementById('gemini-breakpoint-overlay');
                        if (overlay) {
                            overlay.style.animation = 'slideDown 0.3s ease-out';
                            setTimeout(() => overlay.remove(), 300);
                        }
                        
                        // Re-enable interactive elements
                        const disabledStyle = document.querySelector('style[data-breakpoint]');
                        if (disabledStyle) disabledStyle.remove();
                        
                        delete window.__geminiBreakpointState;
                    })()
                `
            });
        } catch (e) {
            console.error("[Breakpoint] Failed to hide overlay:", e);
        }
    }

    /**
     * Update the message displayed on the overlay
     */
    async updateMessage(message) {
        try {
            await this.connection.sendCommand("Runtime.evaluate", {
                expression: `
                    (function() {
                        const messageText = document.getElementById('breakpoint-message-text');
                        if (messageText) {
                            messageText.textContent = '${message.replace(/'/g, "\\'")}';
                        }
                    })()
                `
            });
        } catch (e) {
            console.warn("[Breakpoint] Failed to update message:", e);
        }
    }

    /**
     * Highlight an element while paused for user context
     */
    async highlightElement(uid, backendNodeId) {
        try {
            await this.connection.sendCommand("Overlay.enable");
            await this.connection.sendCommand("Overlay.highlightNode", {
                backendNodeId,
                highlightConfig: {
                    showInfo: true,
                    showRulers: true,
                    contentColor: { r: 59, g: 130, b: 246, a: 0.4 },
                    borderColor: { r: 59, g: 130, b: 246, a: 1.0 },
                    paddingColor: { r: 59, g: 130, b: 246, a: 0.2 }
                }
            });
        } catch (e) {
            console.warn("[Breakpoint] Failed to highlight element:", e);
        }
    }

    /**
     * Clear all highlights
     */
    async clearHighlights() {
        try {
            await this.connection.sendCommand("Overlay.hideHighlight");
        } catch (e) {
            console.warn("[Breakpoint] Failed to clear highlights:", e);
        }
    }

    /**
     * Register callbacks for breakpoint actions
     */
    setCallbacks(onPause, onResume, onEnd) {
        this.pauseCallback = onPause;
        this.resumeCallback = onResume;
        this.endCallback = onEnd;
    }

    /**
     * Detect button clicks (called from tool executor)
     */
    async detectButtonClicks() {
        try {
            const result = await this.connection.sendCommand("Runtime.evaluate", {
                expression: `
                    (function() {
                        const state = window.__geminiBreakpointState;
                        if (!state) return null;
                        
                        const checkClick = () => {
                            // This is called repeatedly to detect clicks
                            return window.__geminiBreakpointAction;
                        };
                        
                        return {
                            hasPauseBtn: !!state.pauseBtn,
                            hasEndBtn: !!state.endBtn
                        };
                    })()
                `,
                returnByValue: true
            });
            return result.result.value;
        } catch (e) {
            return null;
        }
    }
}

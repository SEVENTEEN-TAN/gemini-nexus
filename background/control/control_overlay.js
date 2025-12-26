
// background/control/control_overlay.js
/**
 * Control Overlay - Blocks page interaction during AI automation
 * Shows breathing glow effect with Pause/Continue controls
 */

export class ControlOverlay {
    constructor(connection) {
        this.connection = connection;
        this.isVisible = false;
        this.isPaused = false;  // Track if automation is paused
    }

    /**
     * Show control overlay - BLOCKS user interaction
     * AI is in control, user cannot interact with page
     */
    async show() {
        if (this.isVisible) return;
        this.isVisible = true;
        this.isPaused = false;

        try {
            await this.connection.sendCommand("Runtime.evaluate", {
                expression: `
                    (function() {
                        // Remove existing overlay if any
                        const existing = document.getElementById('gemini-control-overlay');
                        if (existing) existing.remove();

                        // Create full-screen blocking overlay
                        const overlay = document.createElement('div');
                        overlay.id = 'gemini-control-overlay';
                        overlay.style.cssText = \`
                            position: fixed;
                            top: 0;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background: radial-gradient(circle at center, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%);
                            backdrop-filter: blur(2px);
                            z-index: 999998;
                            pointer-events: auto;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: flex-end;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            animation: breathe 3s ease-in-out infinite;
                        \`;

                        // Add styles
                        if (!document.getElementById('gemini-control-styles')) {
                            const style = document.createElement('style');
                            style.id = 'gemini-control-styles';
                            style.textContent = \`
                                @keyframes breathe {
                                    0%, 100% {
                                        opacity: 1;
                                    }
                                    50% {
                                        opacity: 0.8;
                                    }
                                }
                                
                                #gemini-control-panel {
                                    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                                    border-top: 3px solid #3b82f6;
                                    box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.2);
                                    padding: 20px 32px;
                                    margin-bottom: 0;
                                    width: 100%;
                                    max-width: 600px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    gap: 16px;
                                    animation: slideUp 0.4s ease-out;
                                    pointer-events: auto;
                                }
                                
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
                                
                                .control-btn {
                                    padding: 12px 28px;
                                    border: none;
                                    border-radius: 8px;
                                    font-weight: 600;
                                    cursor: pointer;
                                    font-size: 15px;
                                    transition: all 0.2s ease;
                                    display: flex;
                                    align-items: center;
                                    gap: 8px;
                                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                                }
                                
                                .control-btn:hover {
                                    transform: translateY(-2px);
                                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
                                }
                                
                                .control-btn:active {
                                    transform: translateY(0);
                                }
                                
                                .control-btn.pause {
                                    background: #f59e0b;
                                    color: white;
                                }
                                
                                .control-btn.pause:hover {
                                    background: #d97706;
                                }
                                
                                .control-btn.continue {
                                    background: #3b82f6;
                                    color: white;
                                }
                                
                                .control-btn.continue:hover {
                                    background: #2563eb;
                                }
                                
                                .control-status {
                                    flex: 1;
                                    color: #1f2937;
                                    font-size: 14px;
                                    display: flex;
                                    align-items: center;
                                    gap: 12px;
                                    font-weight: 500;
                                }
                                
                                .status-indicator {
                                    width: 10px;
                                    height: 10px;
                                    background: #3b82f6;
                                    border-radius: 50%;
                                    animation: pulse 2s ease-in-out infinite;
                                }
                                
                                .status-indicator.paused {
                                    background: #f59e0b;
                                    animation: none;
                                }
                                
                                @keyframes pulse {
                                    0%, 100% {
                                        opacity: 1;
                                        transform: scale(1);
                                    }
                                    50% {
                                        opacity: 0.5;
                                        transform: scale(1.3);
                                    }
                                }
                                
                                /* Disable all page interactions */
                                body.gemini-control-active > *:not(#gemini-control-overlay),
                                body.gemini-control-active *:not(#gemini-control-overlay):not(#gemini-control-overlay *) {
                                    pointer-events: none !important;
                                }
                            \`;
                            document.head.appendChild(style);
                        }

                        // Create control panel
                        const panel = document.createElement('div');
                        panel.id = 'gemini-control-panel';

                        // Status indicator
                        const status = document.createElement('div');
                        status.className = 'control-status';
                        status.innerHTML = \`
                            <span class="status-indicator"></span>
                            <span id="control-status-text">AI is controlling the browser...</span>
                        \`;

                        // Pause button
                        const pauseBtn = document.createElement('button');
                        pauseBtn.className = 'control-btn pause';
                        pauseBtn.id = 'gemini-pause-btn';
                        pauseBtn.innerHTML = '⏸ Pause';
                        
                        pauseBtn.addEventListener('click', () => {
                            window.__geminiControlAction = 'pause';
                        });

                        // Continue button
                        const continueBtn = document.createElement('button');
                        continueBtn.className = 'control-btn continue';
                        continueBtn.id = 'gemini-continue-btn';
                        continueBtn.innerHTML = '▶ Continue';
                        continueBtn.style.display = 'none';  // Hidden by default
                        
                        continueBtn.addEventListener('click', () => {
                            window.__geminiControlAction = 'continue';
                        });

                        panel.appendChild(status);
                        panel.appendChild(pauseBtn);
                        panel.appendChild(continueBtn);
                        overlay.appendChild(panel);

                        // Disable page interaction
                        document.body.classList.add('gemini-control-active');
                        document.body.appendChild(overlay);
                        
                        window.__geminiControlState = {
                            overlay,
                            panel,
                            pauseBtn,
                            continueBtn,
                            statusText: document.getElementById('control-status-text'),
                            statusIndicator: status.querySelector('.status-indicator')
                        };
                    })()
                `
            });
        } catch (e) {
            console.error('[ControlOverlay] Failed to show overlay:', e);
            this.isVisible = false;
        }
    }

    /**
     * Pause automation - Allow user to interact with page
     */
    async pause() {
        if (!this.isVisible || this.isPaused) return;
        this.isPaused = true;

        try {
            await this.connection.sendCommand("Runtime.evaluate", {
                expression: `
                    (function() {
                        const state = window.__geminiControlState;
                        if (!state) return;

                        // Change status
                        state.statusText.textContent = 'Paused - You can interact with the page';
                        state.statusIndicator.classList.add('paused');

                        // Swap buttons
                        state.pauseBtn.style.display = 'none';
                        state.continueBtn.style.display = 'flex';

                        // Enable page interaction
                        document.body.classList.remove('gemini-control-active');
                        state.overlay.style.pointerEvents = 'none';
                        state.panel.style.pointerEvents = 'auto';
                    })()
                `
            });
        } catch (e) {
            console.error('[ControlOverlay] Failed to pause:', e);
        }
    }

    /**
     * Continue automation - AI takes control again
     */
    async continue() {
        if (!this.isVisible || !this.isPaused) return;
        this.isPaused = false;

        try {
            await this.connection.sendCommand("Runtime.evaluate", {
                expression: `
                    (function() {
                        const state = window.__geminiControlState;
                        if (!state) return;

                        // Change status
                        state.statusText.textContent = 'AI is controlling the browser...';
                        state.statusIndicator.classList.remove('paused');

                        // Swap buttons
                        state.continueBtn.style.display = 'none';
                        state.pauseBtn.style.display = 'flex';

                        // Disable page interaction again
                        document.body.classList.add('gemini-control-active');
                        state.overlay.style.pointerEvents = 'auto';
                    })()
                `
            });
        } catch (e) {
            console.error('[ControlOverlay] Failed to continue:', e);
        }
    }

    /**
     * Update status message
     */
    async updateStatus(message) {
        if (!this.isVisible) return;

        try {
            await this.connection.sendCommand("Runtime.evaluate", {
                expression: `
                    (function() {
                        const state = window.__geminiControlState;
                        if (state && state.statusText) {
                            state.statusText.textContent = '${message.replace(/'/g, "\\'")}';
                        }
                    })()
                `
            });
        } catch (e) {
            console.error('[ControlOverlay] Failed to update status:', e);
        }
    }

    /**
     * Hide control overlay completely
     */
    async hide() {
        if (!this.isVisible) return;
        this.isVisible = false;
        this.isPaused = false;

        try {
            await this.connection.sendCommand("Runtime.evaluate", {
                expression: `
                    (function() {
                        const overlay = document.getElementById('gemini-control-overlay');
                        const styles = document.getElementById('gemini-control-styles');
                        
                        if (overlay) overlay.remove();
                        if (styles) styles.remove();
                        
                        document.body.classList.remove('gemini-control-active');
                        delete window.__geminiControlState;
                        delete window.__geminiControlAction;
                    })()
                `
            });
        } catch (e) {
            console.error('[ControlOverlay] Failed to hide overlay:', e);
        }
    }
}


// lib/logger.js

export class Logger {
    constructor(context) {
        this.context = context || 'Unknown';
    }
    
    info(message, data) { this._log('INFO', message, data); }
    warn(message, data) { this._log('WARN', message, data); }
    error(message, data) { this._log('ERROR', message, data); }
    
    _log(level, message, data) {
        const entry = {
            level,
            context: this.context,
            message,
            data: data ? JSON.parse(JSON.stringify(data)) : null, // Ensure serializable
            timestamp: Date.now()
        };
        
        // Log to local console for debugging
        const prefix = `[${this.context}]`;
        if (level === 'ERROR') console.error(prefix, message, data || '');
        else if (level === 'WARN') console.warn(prefix, message, data || '');
        else console.log(prefix, message, data || '');

        // Send to background for centralization
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                // Direct access (Background / Content Script / Popup)
                chrome.runtime.sendMessage({
                    action: 'LOG_ENTRY',
                    entry
                }).catch(() => {
                    // Ignore errors (e.g. if background is unreachable)
                });
            } else if (window.parent && window.parent !== window) {
                // Sandbox Iframe Environment
                window.parent.postMessage({
                    action: 'FORWARD_TO_BACKGROUND',
                    payload: {
                        action: 'LOG_ENTRY',
                        entry
                    }
                }, '*');
            }
        } catch(e) {
            // Context might not support messaging
        }
    }
}


// background/managers/auth_manager.js
import { fetchRequestParams } from '../../services/auth.js';

export class AuthManager {
    constructor() {
        this.currentContext = null;
        this.lastModel = null;
        this.isInitialized = false;
    }

    async ensureInitialized() {
        if (this.isInitialized) return;
        
        try {
            const stored = await chrome.storage.local.get([
                'geminiContext', 
                'geminiModel'
            ]);
            
            if (stored.geminiContext) {
                this.currentContext = stored.geminiContext;
            }
            if (stored.geminiModel) {
                this.lastModel = stored.geminiModel;
            }

            this.isInitialized = true;
        } catch (e) {
            console.error("Failed to restore auth session:", e);
        }
    }

    /**
     * Gets credentials for the current account (always '0' in single-account mode).
     * If context is null, it fetches fresh tokens.
     */
    async getOrFetchContext() {
        if (this.currentContext) return this.currentContext;
            
        try {
            const params = await fetchRequestParams('0');
            this.currentContext = {
                atValue: params.atValue,
                blValue: params.blValue,
                authUser: params.authUserIndex || '0',
                contextIds: ['', '', '']
            };
            return this.currentContext;
        } catch (e) {
            console.warn(`Failed to fetch context:`, e);
            throw e;
        }
    }
    
    getCurrentIndex() {
        return '0';  // Always single account
    }

    checkModelChange(newModel) {
        // Reset context if model changed (forces re-init)
        if (this.lastModel && this.lastModel !== newModel) {
            this.currentContext = null;
        }
    }

    async updateContext(newContext, model) {
        this.currentContext = newContext;
        this.lastModel = model;
        
        await chrome.storage.local.set({ 
            geminiContext: this.currentContext,
            geminiModel: this.lastModel 
        });
    }

    async resetContext() {
        this.currentContext = null;
        this.lastModel = null;
        await chrome.storage.local.remove(['geminiContext', 'geminiModel']);
    }

    forceContextRefresh() {
        this.currentContext = null;
    }
}


// background/managers/auth_manager.js
import { fetchRequestParams } from '../../services/auth.js';

export class AuthManager {
    constructor() {
        this.currentContext = null;
        this.lastModel = null;
        this.accountIndices = ['0'];
        this.currentAccountPointer = 0;
        this.isInitialized = false;
    }

    async ensureInitialized() {
        if (this.isInitialized) return;
        
        try {
            const stored = await chrome.storage.local.get([
                'geminiContext', 
                'geminiModel', 
                'geminiAccountIndices', 
                'geminiAccountPointer'
            ]);
            
            if (stored.geminiContext) {
                this.currentContext = stored.geminiContext;
            }
            if (stored.geminiModel) {
                this.lastModel = stored.geminiModel;
            }
            
            // Load indices
            if (stored.geminiAccountIndices) {
                this.accountIndices = stored.geminiAccountIndices
                    .split(',')
                    .map(s => s.trim())
                    .filter(s => s !== "");
            }
            // Load last pointer
            if (typeof stored.geminiAccountPointer === 'number') {
                this.currentAccountPointer = stored.geminiAccountPointer;
            }

            this.isInitialized = true;
        } catch (e) {
            console.error("Failed to restore auth session:", e);
        }
    }

    /**
     * Rotates to the next account index and returns it.
     */
    async rotateAccount() {
        // Refresh list from storage in case it changed
        const stored = await chrome.storage.local.get(['geminiAccountIndices']);
        if (stored.geminiAccountIndices) {
            this.accountIndices = stored.geminiAccountIndices
                .split(',')
                .map(s => s.trim())
                .filter(s => s !== "");
        }
        if (this.accountIndices.length === 0) this.accountIndices = ['0'];

        this.currentAccountPointer = (this.currentAccountPointer + 1) % this.accountIndices.length;
        await chrome.storage.local.set({ geminiAccountPointer: this.currentAccountPointer });
        
        console.log(`[Gemini Nexus] Rotated to account index: ${this.accountIndices[this.currentAccountPointer]}`);
        return this.accountIndices[this.currentAccountPointer];
    }

    /**
     * Gets credentials for the current account pointer.
     * If context is null, it fetches fresh tokens.
     */
    async getOrFetchContext() {
        if (this.currentContext) return this.currentContext;

        const targetIndex = this.accountIndices[this.currentAccountPointer] || '0';
        try {
            const params = await fetchRequestParams(targetIndex);
            this.currentContext = {
                atValue: params.atValue,
                blValue: params.blValue,
                authUser: params.authUserIndex || targetIndex,
                contextIds: ['', '', '']
            };
            return this.currentContext;
        } catch (e) {
            console.warn(`Failed to fetch context for account ${targetIndex}:`, e);
            throw e;
        }
    }

    getCurrentIndex() {
        return this.accountIndices[this.currentAccountPointer] || '0';
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
        
        // Rotate to spread load on reset
        if (this.accountIndices.length > 1) {
            await this.rotateAccount();
        }
    }

    forceContextRefresh() {
        this.currentContext = null;
    }
}

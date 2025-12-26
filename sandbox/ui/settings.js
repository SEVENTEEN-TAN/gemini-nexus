
// sandbox/ui/settings.js
import { saveShortcutsToStorage, saveThemeToStorage, requestThemeFromStorage, saveLanguageToStorage, requestLanguageFromStorage, saveTextSelectionToStorage, requestTextSelectionFromStorage, saveSidebarBehaviorToStorage, saveImageToolsToStorage, requestImageToolsFromStorage, saveAccountIndicesToStorage, requestAccountIndicesFromStorage, requestGemIdFromStorage, saveGemIdToStorage, sendToBackground } from '../../lib/messaging.js';
import { setLanguagePreference, getLanguagePreference } from '../core/i18n.js';
import { SettingsView } from './settings/view.js';
import { DEFAULT_SHORTCUTS } from '../../lib/constants.js';

export class SettingsController {
    constructor(callbacks) {
        this.callbacks = callbacks || {};

        // State
        this.defaultShortcuts = { ...DEFAULT_SHORTCUTS };
        this.shortcuts = { ...this.defaultShortcuts };

        this.textSelectionEnabled = true;
        this.imageToolsEnabled = true;
        this.accountIndices = "0";
        this.gemId = ""; // Gem ID state

        // Initialize View
        this.view = new SettingsView({
            onOpen: () => this.handleOpen(),
            onSave: (data) => this.saveSettings(data),
            onReset: () => this.resetSettings(),

            onThemeChange: (theme) => this.setTheme(theme),
            onLanguageChange: (lang) => this.setLanguage(lang),

            onTextSelectionChange: (val) => { this.textSelectionEnabled = (val === 'on' || val === true); saveTextSelectionToStorage(this.textSelectionEnabled); },
            onImageToolsChange: (val) => { this.imageToolsEnabled = (val === 'on' || val === true); saveImageToolsToStorage(this.imageToolsEnabled); },
            onSidebarBehaviorChange: (val) => saveSidebarBehaviorToStorage(val),
            onDownloadLogs: () => this.downloadLogs(),
            onSaveMcp: (json) => this.saveMcpConfig(json),
            onRefreshGems: () => this.refreshGemsList()
        });

        // External Trigger Binding
        const trigger = document.getElementById('settings-btn');
        if (trigger) {
            trigger.addEventListener('click', () => {
                this.open();
                if (this.callbacks.onOpen) this.callbacks.onOpen();
            });
        }

        // Listen for log data & MCP responses
        window.addEventListener('message', (e) => {
            if (e.data.action === 'BACKGROUND_MESSAGE' && e.data.payload) {
                const payload = e.data.payload;

                // Logs
                if (payload.logs) {
                    this.saveLogFile(payload.logs);
                    return;
                }

                // MCP Config Check (heuristic: starts with mcpServers key or checking known structure, 
                // but since GET_CONFIG returns stringified JSON...)
                // Actually, background/messages.js sends response directly.
                // sidepanel wraps it in { payload: response }.

                // If it looks like MCP config (string)
                if (typeof payload === 'string' && payload.includes('"mcpServers"')) {
                    this.view.setMcpConfig(payload);
                    return;
                }

                // If it's a save result
                if (payload.success !== undefined && payload.mcpServers === undefined) {
                    // Assume it's save result if prompt save returns success
                    // But wait, saveConfig returns { success: true/false }
                    if (payload.success) {
                        alert("MCP Configuration Saved!");
                    } else if (payload.error) {
                        alert("Error Saving MCP Config: " + payload.error);
                    }
                }
            }
        });
    }

    open() {
        this.view.open();
    }

    close() {
        this.view.close();
    }

    handleOpen() {
        // Sync state to view
        this.view.setShortcuts(this.shortcuts);
        this.view.setLanguageValue(getLanguagePreference());
        this.view.setToggles(this.textSelectionEnabled, this.imageToolsEnabled);
        this.view.setAccountIndices(this.accountIndices);
        this.view.setGemId(this.gemId); // Set Gem ID in view

        // Refresh from storage
        requestTextSelectionFromStorage();
        requestImageToolsFromStorage();
        requestAccountIndicesFromStorage();

        // Load Gem ID
        // Load Gem ID
        requestGemIdFromStorage();

        // Fetch MCP Config
        this.fetchMcpConfig();

        this.fetchGithubStars();
        
        // Auto-load Gems list when opening settings
        this.refreshGemsList(false); // false = don't force refresh, use cache if available
    }

    saveSettings(data) {
        // Shortcuts
        this.shortcuts = data.shortcuts;
        saveShortcutsToStorage(this.shortcuts);

        // General Toggles
        this.textSelectionEnabled = data.textSelection;
        saveTextSelectionToStorage(this.textSelectionEnabled);

        this.imageToolsEnabled = data.imageTools;
        saveImageToolsToStorage(this.imageToolsEnabled);

        // Accounts
        let val = data.accountIndices.trim();
        if (!val) val = "0";
        this.accountIndices = val;
        const cleaned = val.replace(/[^0-9,]/g, '');
        saveAccountIndicesToStorage(cleaned);

        // Gem ID
        // Gem ID
        this.gemId = data.gemId || "";
        saveGemIdToStorage(this.gemId);
    }

    resetSettings() {
        this.view.setShortcuts(this.defaultShortcuts);
        this.view.setAccountIndices("0");
    }

    downloadLogs() {
        sendToBackground({ action: 'GET_LOGS' });
    }

    saveLogFile(logs) {
        if (!logs || logs.length === 0) {
            alert("No logs to download.");
            return;
        }

        const text = logs.map(l => {
            const time = new Date(l.timestamp).toISOString();
            const dataStr = l.data ? ` | Data: ${JSON.stringify(l.data)}` : '';
            return `[${time}] [${l.level}] [${l.context}] ${l.message}${dataStr}`;
        }).join('\n');

        // Send to parent to handle download (Sandbox restriction workaround)
        window.parent.postMessage({
            action: 'DOWNLOAD_LOGS',
            payload: {
                text: text,
                filename: `gemini-nexus-logs-${Date.now()}.txt`
            }
        }, '*');
    }

    // --- State Updates (From View or Storage) ---

    setTheme(theme) {
        this.view.applyVisualTheme(theme);
        saveThemeToStorage(theme);
    }

    updateTheme(theme) {
        this.view.setThemeValue(theme);
    }

    setLanguage(newLang) {
        setLanguagePreference(newLang);
        saveLanguageToStorage(newLang);
        document.dispatchEvent(new CustomEvent('gemini-language-changed'));
    }

    updateLanguage(lang) {
        setLanguagePreference(lang);
        this.view.setLanguageValue(lang);
        document.dispatchEvent(new CustomEvent('gemini-language-changed'));
    }

    updateShortcuts(payload) {
        if (payload) {
            this.shortcuts = { ...this.defaultShortcuts, ...payload };
            this.view.setShortcuts(this.shortcuts);
        }
    }

    updateTextSelection(enabled) {
        this.textSelectionEnabled = enabled;
        this.view.setToggles(this.textSelectionEnabled, this.imageToolsEnabled);
    }

    updateImageTools(enabled) {
        this.imageToolsEnabled = enabled;
        this.view.setToggles(this.textSelectionEnabled, this.imageToolsEnabled);
    }

    updateSidebarBehavior(behavior) {
        this.view.setSidebarBehavior(behavior);
    }

    updateAccountIndices(indicesString) {
        this.accountIndices = indicesString || "0";
        this.view.setAccountIndices(this.accountIndices);
    }

    async fetchGithubStars() {
        if (this.view.hasFetchedStars()) return;

        try {
            const res = await fetch('https://api.github.com/repos/yeahhe365/gemini-nexus');
            if (res.ok) {
                const data = await res.json();
                this.view.displayStars(data.stargazers_count);
            }
        } catch (e) {
            this.view.displayStars(null);
        }
    }

    // --- MCP Methods ---

    fetchMcpConfig() {
        sendToBackground({ action: 'MCP_GET_CONFIG' });
    }

    saveMcpConfig(jsonStr) {
        // Basic validation
        try {
            JSON.parse(jsonStr);
        } catch (e) {
            alert("Invalid JSON format");
            return;
        }
        sendToBackground({ action: 'MCP_SAVE_CONFIG', json: jsonStr });
    }

    async refreshGemsList(forceRefresh = true) {
        this.view.showGemsStatus('Loading Gems...', false);
        console.log('[Settings] Refreshing Gems list, forceRefresh:', forceRefresh);
        
        try {
            // Send request via postMessage (sandbox can't use chrome.runtime directly)
            const response = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Request timeout after 15 seconds'));
                }, 15000);
                
                const messageId = `gems_${Date.now()}`;
                
                const handleResponse = (event) => {
                    if (event.data.action === 'GEMS_LIST_RESPONSE' && event.data.messageId === messageId) {
                        clearTimeout(timeout);
                        window.removeEventListener('message', handleResponse);
                        resolve(event.data.response);
                    }
                };
                
                window.addEventListener('message', handleResponse);
                
                // Send to parent (sidepanel)
                window.parent.postMessage({
                    action: 'FETCH_GEMS_LIST',
                    messageId: messageId,
                    userIndex: this.accountIndices || '0',
                    forceRefresh: forceRefresh
                }, '*');
            });
            
            console.log('[Settings] Gems response received:', response);
            
            if (response && response.gems && response.gems.length > 0) {
                this.view.populateGemsList(response.gems);
                this.view.showGemsStatus(`Found ${response.gems.length} Gems`, false);
                
                // Clear status after 3 seconds
                setTimeout(() => {
                    this.view.clearGemsStatus();
                }, 3000);
            } else if (response && response.error) {
                console.error('[Settings] Gems API returned error:', response.error);
                this.view.showGemsStatus(`Error: ${response.error}`, true);
            } else {
                console.warn('[Settings] No Gems found in response');
                this.view.showGemsStatus('No Gems found. You can still enter Gem ID manually below.', false);
                // Don't clear this message automatically
            }
        } catch (error) {
            console.error('[Settings] Error fetching Gems:', error);
            console.error('[Settings] Error stack:', error.stack);
            this.view.showGemsStatus(`Failed to load Gems: ${error.message}`, true);
        }
    }
}

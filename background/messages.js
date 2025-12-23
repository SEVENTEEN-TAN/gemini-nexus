
// background/messages.js
import { SessionMessageHandler } from './handlers/session.js';
import { UIMessageHandler } from './handlers/ui.js';

/**
 * Sets up the global runtime message listener.
 * @param {GeminiSessionManager} sessionManager 
 * @param {ImageHandler} imageHandler 
 * @param {BrowserControlManager} controlManager
 * @param {LogManager} logManager
 * @param {MCPManager} mcpManager
 */
export function setupMessageListener(sessionManager, imageHandler, controlManager, logManager, mcpManager) {

    // Inject MCP Manager into Session Manager so it can use tools
    sessionManager.setMCPManager(mcpManager);

    const sessionHandler = new SessionMessageHandler(sessionManager, imageHandler, controlManager);
    const uiHandler = new UIMessageHandler(imageHandler);

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

        // --- LOGGING SYSTEM ---
        if (request.action === 'LOG_ENTRY') {
            logManager.add(request.entry);
            return false;
        }

        if (request.action === 'GET_LOGS') {
            sendResponse({ logs: logManager.getLogs() });
            return true;
        }

        // Open a tab in background (without switching focus)
        if (request.action === 'OPEN_TAB_BACKGROUND') {
            chrome.tabs.create({ url: request.url, active: false });
            return false;
        }

        // --- MCP MANAGEMENT ---
        if (request.action === 'MCP_SAVE_CONFIG') {
            mcpManager.saveConfig(request.json).then(result => {
                sendResponse(result);
            });
            return true;
        }

        if (request.action === 'MCP_GET_CONFIG') {
            chrome.storage.local.get('mcpConfig').then(data => {
                const config = data.mcpConfig || { mcpServers: {} };
                sendResponse(JSON.stringify(config, null, 2));
            });
            return true;
        }

        if (request.action === 'MCP_GET_TOOLS') {
            const tools = mcpManager.getAllTools();
            sendResponse({ tools: tools });
            return true;
        }

        if (request.action === 'MCP_GET_STATUS') {
            const debugInfo = mcpManager.getDebugInfo();
            sendResponse({ servers: debugInfo });
            return true;
        }

        // Delegate to Session Handler (Prompt, Context, Quick Ask, Browser Control)
        if (sessionHandler.handle(request, sender, sendResponse)) {
            return true;
        }

        // Delegate to UI Handler (Image, Capture, Sidepanel)
        if (uiHandler.handle(request, sender, sendResponse)) {
            return true;
        }

        return false;
    });
}

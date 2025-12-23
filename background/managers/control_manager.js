
// background/managers/control_manager.js
import { BrowserConnection } from '../control/connection.js';
import { SnapshotManager } from '../control/snapshot.js';
import { BrowserActions } from '../control/actions.js';

/**
 * Main Controller handling Chrome DevTools MCP functionalities.
 * Orchestrates connection, snapshots, and action execution.
 */
export class BrowserControlManager {
    constructor() {
        this.connection = new BrowserConnection();
        this.snapshotManager = new SnapshotManager(this.connection);
        this.actions = new BrowserActions(this.connection, this.snapshotManager);
    }

    // --- Internal Helpers ---

    async ensureConnection() {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tab) return false;
        
        // Check restricted URLs before trying to attach
        if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:'))) {
            return false;
        }

        await this.connection.attach(tab.id);
        return true;
    }

    async getSnapshot() {
        if (!this.connection.attached) {
             const success = await this.ensureConnection();
             if (!success) return null;
        }
        return await this.snapshotManager.takeSnapshot();
    }

    // --- Execution Entry Point ---

    async execute(toolCall) {
        try {
            const { name, args } = toolCall;
            const success = await this.ensureConnection();
            if (!success) return "Error: No active tab found or restricted URL.";

            console.log(`[MCP] Executing tool: ${name}`, args);

            let result;
            switch (name) {
                // Actions handled by BrowserActions
                case 'navigate_page':
                    result = await this.actions.navigatePage(args);
                    break;
                case 'new_page':
                    result = await this.actions.newPage(args);
                    break;
                case 'close_page':
                    result = await this.actions.closePage(args);
                    break;
                case 'take_screenshot':
                    result = await this.actions.takeScreenshot(args);
                    break;
                case 'click':
                    result = await this.actions.clickElement(args);
                    break;
                case 'drag_element':
                    result = await this.actions.dragElement(args);
                    break;
                case 'hover':
                    result = await this.actions.hoverElement(args);
                    break;
                case 'fill':
                    result = await this.actions.fillElement(args);
                    break;
                case 'fill_form':
                    result = await this.actions.fillForm(args);
                    break;
                case 'press_key':
                    result = await this.actions.pressKey(args);
                    break;
                case 'handle_dialog':
                    result = await this.actions.input.handleDialog(args);
                    break;
                case 'wait_for':
                    result = await this.actions.waitFor(args);
                    break;
                case 'evaluate_script':
                    result = await this.actions.evaluateScript(args);
                    break;
                case 'run_javascript':
                case 'run_script': // alias
                    result = await this.actions.evaluateScript(args);
                    break;
                case 'list_pages':
                    result = await this.actions.listPages();
                    break;
                case 'select_page':
                    result = await this.actions.selectPage(args);
                    break;
                case 'attach_file':
                    result = await this.actions.attachFile(args);
                    break;
                
                // Emulation
                case 'emulate':
                    result = await this.actions.emulate(args);
                    break;
                case 'resize_page':
                    result = await this.actions.resizePage(args);
                    break;

                // Performance
                case 'performance_start_trace':
                case 'start_trace': // Alias
                    result = await this.actions.startTrace(args);
                    break;
                case 'performance_stop_trace':
                case 'stop_trace': // Alias
                    result = await this.actions.stopTrace(args);
                    break;
                case 'performance_analyze_insight':
                    result = await this.actions.analyzeInsight(args);
                    break;

                // Observability Tools
                case 'get_logs':
                    result = await this.actions.observation.getLogs();
                    break;
                case 'get_network_activity': // Legacy simple view
                    result = await this.actions.observation.getNetworkActivity();
                    break;
                case 'list_network_requests':
                    result = await this.actions.observation.listNetworkRequests(args);
                    break;
                case 'get_network_request':
                    result = await this.actions.observation.getNetworkRequest(args);
                    break;
                
                // Snapshot handled by SnapshotManager
                case 'take_snapshot':
                    result = await this.snapshotManager.takeSnapshot(args);
                    break;
                    
                default:
                    result = `Error: Unknown tool '${name}'`;
            }

            return result;

        } catch (e) {
            console.error(`[MCP] Tool execution error:`, e);
            return `Error executing ${toolCall.name}: ${e.message}`;
        }
    }
}

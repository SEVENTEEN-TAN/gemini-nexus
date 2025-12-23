
// sandbox/controllers/mcp_controller.js
// Handles MCP server selection and state management in the UI

export class MCPController {
    constructor(appController) {
        this.app = appController;
        this.selectedMcpIds = new Set(); // Currently selected MCP server IDs
        this.mcpServers = {}; // { id: { name, status, toolCount } }

        this.initElements();
        this.initListeners();
    }

    initElements() {
        this.mcpPicker = document.getElementById('mcp-picker');
        this.mcpServerList = document.getElementById('mcp-server-list');
        this.mcpTagsContainer = document.getElementById('mcp-tags');
        this.actionMcpBtn = document.getElementById('action-mcp');
        this.actionMenu = document.getElementById('action-menu');
    }

    initListeners() {
        // Open MCP picker when clicking MCP menu item
        if (this.actionMcpBtn) {
            this.actionMcpBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePicker();
            });
        }

        // Close picker when clicking outside
        document.addEventListener('click', (e) => {
            if (this.mcpPicker && !this.mcpPicker.classList.contains('hidden')) {
                if (!this.mcpPicker.contains(e.target) &&
                    e.target !== this.actionMcpBtn &&
                    !this.actionMcpBtn?.contains(e.target)) {
                    this.closePicker();
                }
            }
        });

        // Remove tag handler (event delegation)
        if (this.mcpTagsContainer) {
            this.mcpTagsContainer.addEventListener('click', (e) => {
                const removeBtn = e.target.closest('.mcp-tag-remove');
                if (removeBtn) {
                    const mcpId = removeBtn.dataset.mcpId;
                    if (mcpId) {
                        this.deselectMcp(mcpId);
                    }
                }
            });
        }
    }

    togglePicker() {
        if (this.mcpPicker) {
            const isHidden = this.mcpPicker.classList.contains('hidden');
            if (isHidden) {
                this.openPicker();
            } else {
                this.closePicker();
            }
        }
    }

    openPicker() {
        // Close action menu first
        if (this.actionMenu) {
            this.actionMenu.classList.add('hidden');
        }

        // Request MCP server status from background
        this.requestMcpStatus();

        if (this.mcpPicker) {
            this.mcpPicker.classList.remove('hidden');
        }
    }

    closePicker() {
        if (this.mcpPicker) {
            this.mcpPicker.classList.add('hidden');
        }
    }

    requestMcpStatus() {
        window.parent.postMessage({
            action: 'FORWARD_TO_BACKGROUND',
            payload: { action: 'MCP_GET_STATUS' }
        }, '*');
    }

    // Called when receiving MCP status from background
    handleMcpStatus(servers) {
        this.mcpServers = servers || {};
        this.renderServerList();
    }

    renderServerList() {
        if (!this.mcpServerList) return;

        const serverIds = Object.keys(this.mcpServers);

        if (serverIds.length === 0) {
            this.mcpServerList.innerHTML = `
                <div class="mcp-empty-message">
                    No MCP servers configured.<br>
                    Go to Settings to add servers.
                </div>
            `;
            return;
        }

        this.mcpServerList.innerHTML = serverIds.map(id => {
            const server = this.mcpServers[id];
            const isSelected = this.selectedMcpIds.has(id);
            const isError = server.status === 'error';
            const isConnected = server.status === 'connected';

            return `
                <div class="mcp-server-item ${isSelected ? 'selected' : ''} ${isError ? 'error' : ''}" 
                     data-mcp-id="${id}">
                    <div class="mcp-server-checkbox"></div>
                    <div class="mcp-server-info">
                        <div class="mcp-server-name">${this.escapeHtml(id)}</div>
                        <div class="mcp-server-status">
                            <span class="mcp-status-dot ${isConnected ? 'connected' : ''} ${isError ? 'error' : ''}"></span>
                            ${server.toolCount || 0} tools
                        </div>
                    </div>
                    ${server.toolCount > 0 ? `<span class="mcp-server-tools">${server.toolCount}</span>` : ''}
                </div>
            `;
        }).join('');

        // Add click handlers
        this.mcpServerList.querySelectorAll('.mcp-server-item').forEach(item => {
            item.addEventListener('click', () => {
                const mcpId = item.dataset.mcpId;
                if (mcpId) {
                    this.toggleMcpSelection(mcpId);
                }
            });
        });
    }

    toggleMcpSelection(mcpId) {
        if (this.selectedMcpIds.has(mcpId)) {
            this.deselectMcp(mcpId);
        } else {
            this.selectMcp(mcpId);
        }
    }

    selectMcp(mcpId) {
        this.selectedMcpIds.add(mcpId);
        this.updateTagsUI();
        this.renderServerList(); // Refresh checkboxes
    }

    deselectMcp(mcpId) {
        this.selectedMcpIds.delete(mcpId);
        this.updateTagsUI();
        this.renderServerList();
    }

    updateTagsUI() {
        if (!this.mcpTagsContainer) return;

        const ids = Array.from(this.selectedMcpIds);

        if (ids.length === 0) {
            this.mcpTagsContainer.classList.remove('has-tags');
            this.mcpTagsContainer.innerHTML = '';
            return;
        }

        this.mcpTagsContainer.classList.add('has-tags');
        this.mcpTagsContainer.innerHTML = ids.map(id => `
            <div class="mcp-tag">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                <span>${this.escapeHtml(id)}</span>
                <button class="mcp-tag-remove" data-mcp-id="${id}" title="Remove">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `).join('');
    }

    // Get selected MCP IDs for sending with message
    getSelectedMcpIds() {
        return Array.from(this.selectedMcpIds);
    }

    // Check if any MCP is selected
    hasMcpSelected() {
        return this.selectedMcpIds.size > 0;
    }

    // Clear all selections (e.g., on new chat)
    clearSelections() {
        this.selectedMcpIds.clear();
        this.updateTagsUI();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

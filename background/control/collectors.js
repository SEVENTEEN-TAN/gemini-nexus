
// background/control/collectors.js

export class NetworkCollector {
    constructor() {
        this.requests = new Map();
        this.maxItems = 300; // Increased history for deeper debugging
    }

    onEvent(method, params) {
        if (method === 'Network.requestWillBeSent') {
            const { requestId, request, type, timestamp } = params;
            // Filter out data URLs to save memory/tokens
            if (request.url.startsWith('data:')) return;

            this.requests.set(requestId, {
                id: requestId,
                url: request.url,
                method: request.method,
                type: type,
                status: 'pending',
                startTime: timestamp,
                size: 0,
                requestHeaders: request.headers,
                postData: request.postData,
                responseHeaders: null,
                completed: false
            });
            this._prune();
        } else if (method === 'Network.responseReceived') {
            const { requestId, response } = params;
            if (this.requests.has(requestId)) {
                const req = this.requests.get(requestId);
                req.status = response.status;
                req.mimeType = response.mimeType;
                req.responseHeaders = response.headers;
            }
        } else if (method === 'Network.loadingFinished') {
            const { requestId, encodedDataLength } = params;
            if (this.requests.has(requestId)) {
                const req = this.requests.get(requestId);
                req.status = req.status === 'pending' ? 200 : req.status; // Assume 200 if responseReceived didn't fire (cached)
                req.size = encodedDataLength;
                req.completed = true;
            }
        } else if (method === 'Network.loadingFailed') {
            const { requestId, errorText } = params;
            if (this.requests.has(requestId)) {
                const req = this.requests.get(requestId);
                req.status = `failed (${errorText})`;
                req.completed = true;
            }
        }
    }

    _prune() {
        if (this.requests.size > this.maxItems) {
            const firstKey = this.requests.keys().next().value;
            this.requests.delete(firstKey);
        }
    }

    // Used by get_network_activity (Legacy/Simple)
    getFormatted() {
        const output = [];
        const recent = Array.from(this.requests.values()).slice(-20);
        for (const req of recent) {
            output.push(`[${req.method}] ${req.url} (${req.status}) - ${req.type}`);
        }
        return output.join('\n');
    }

    // New: Advanced List with filtering
    getList(resourceTypes, limit = 50) {
        let items = Array.from(this.requests.values());
        
        if (resourceTypes && Array.isArray(resourceTypes) && resourceTypes.length > 0) {
            const allowed = resourceTypes.map(t => t.toLowerCase());
            items = items.filter(r => r.type && allowed.includes(r.type.toLowerCase()));
        }

        // Return latest N, reversed (newest first)
        return items.slice(-limit).reverse();
    }

    // New: Get specific request
    getRequest(requestId) {
        return this.requests.get(requestId);
    }
}

export class LogCollector {
    constructor() {
        this.logs = [];
        this.maxItems = 50;
    }

    onEvent(method, params) {
        if (method === 'Log.entryAdded') {
            const { entry } = params;
            this._add({
                type: entry.level,
                text: entry.text,
                source: entry.source,
                timestamp: entry.timestamp
            });
        } else if (method === 'Runtime.consoleAPICalled') {
            const { type, args, timestamp } = params;
            const text = args.map(a => a.value || a.description || (a.type === 'object' ? '[Object]' : '')).join(' ');
            this._add({
                type: type,
                text: text,
                source: 'console',
                timestamp: timestamp
            });
        } else if (method === 'Runtime.exceptionThrown') {
            const { exceptionDetails } = params;
            this._add({
                type: 'error',
                text: exceptionDetails.text + (exceptionDetails.exception ? ': ' + exceptionDetails.exception.description : ''),
                source: 'runtime',
                timestamp: Date.now()
            });
        } else if (method === 'Audits.issueAdded') {
            const { issue } = params;
            // Simplify issue details for the LLM
            const details = JSON.stringify(issue.details);
            this._add({
                type: 'issue',
                text: `${issue.code}: ${details}`,
                source: 'audits',
                timestamp: Date.now()
            });
        }
    }

    _add(logEntry) {
        this.logs.push(logEntry);
        if (this.logs.length > this.maxItems) {
            this.logs.shift();
        }
    }

    getFormatted() {
        return this.logs.map(l => `[${l.type.toUpperCase()}] ${l.source}: ${l.text}`).join('\n');
    }
}

export class DialogCollector {
    constructor() {
        this.activeDialog = null;
    }

    onEvent(method, params) {
        if (method === 'Page.javascriptDialogOpening') {
            this.activeDialog = {
                type: params.type, // alert, confirm, prompt, beforeunload
                message: params.message,
                defaultPrompt: params.defaultPrompt,
                url: params.url
            };
        } else if (method === 'Page.javascriptDialogClosed') {
            this.activeDialog = null;
        }
    }

    getFormatted() {
        if (!this.activeDialog) return null;
        return `[Blocking Dialog Active] Type: ${this.activeDialog.type}, Message: "${this.activeDialog.message}"`;
    }
}

export class CollectorManager {
    constructor() {
        this.network = new NetworkCollector();
        this.logs = new LogCollector();
        this.dialogs = new DialogCollector();
    }

    handleEvent(method, params) {
        if (method.startsWith('Network.')) {
            this.network.onEvent(method, params);
        }
        if (method.startsWith('Log.') || method.startsWith('Runtime.') || method.startsWith('Audits.')) {
            this.logs.onEvent(method, params);
        }
        if (method.startsWith('Page.javascriptDialog')) {
            this.dialogs.onEvent(method, params);
        }
    }

    clear() {
        this.network = new NetworkCollector();
        this.logs = new LogCollector();
        this.dialogs = new DialogCollector();
    }
}

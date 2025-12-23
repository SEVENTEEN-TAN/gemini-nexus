
// background/handlers/session/context_handler.js

export class ContextHandler {
    constructor(sessionManager) {
        this.sessionManager = sessionManager;
    }

    handleSetContext(request, sendResponse) {
        this.sessionManager.setContext(request.context, request.model)
            .then(() => sendResponse({status: "context_updated"}));
        return true;
    }

    handleResetContext(request, sendResponse) {
        this.sessionManager.resetContext()
            .then(() => sendResponse({status: "reset"}));
        return true;
    }
}

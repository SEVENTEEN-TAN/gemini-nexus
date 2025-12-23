// background/handlers/session/prompt_handler.js
import { appendAiMessage, appendUserMessage } from '../../managers/history_manager.js';
import { PromptBuilder } from './prompt/builder.js';
import { ToolExecutor } from './prompt/tool_executor.js';

export class PromptHandler {
    constructor(sessionManager, controlManager) {
        this.sessionManager = sessionManager;
        this.builder = new PromptBuilder(controlManager);
        this.toolExecutor = new ToolExecutor(controlManager);
    }

    handle(request, sendResponse) {
        (async () => {
            const onUpdate = (partialText, partialThoughts) => {
                // Catch errors if receiver (UI) is closed/unavailable
                chrome.runtime.sendMessage({
                    action: "GEMINI_STREAM_UPDATE",
                    text: partialText,
                    thoughts: partialThoughts
                }).catch(() => {}); 
            };

            try {
                // 1. Build Initial Prompt (with Preamble/Context)
                let currentPromptText = await this.builder.build(request);
                let currentFiles = request.files;
                
                let loopCount = 0;
                const MAX_LOOPS = 10;
                let keepLooping = true;

                // --- AUTOMATED FEEDBACK LOOP ---
                while (keepLooping && loopCount < MAX_LOOPS) {
                    
                    // 2. Send to Gemini
                    const result = await this.sessionManager.handleSendPrompt({
                        ...request,
                        text: currentPromptText,
                        files: currentFiles
                    }, onUpdate);

                    if (!result || result.status !== 'success') {
                        // If error, notify UI and break loop
                        if (result) chrome.runtime.sendMessage(result).catch(() => {});
                        break;
                    }

                    // 3. Save AI Response to History
                    if (request.sessionId) {
                        await appendAiMessage(request.sessionId, result);
                    }
                    
                    // Notify UI of the result (replaces streaming bubble)
                    chrome.runtime.sendMessage(result).catch(() => {});

                    // 4. Process Tool Execution (if any)
                    let toolResult = null;
                    if (request.enableBrowserControl) {
                        toolResult = await this.toolExecutor.executeIfPresent(result.text, onUpdate);
                    }

                    // 5. Decide Next Step
                    if (toolResult) {
                        // Tool executed, feed back to model (Loop continues)
                        loopCount++;
                        currentFiles = toolResult.files || []; // Send new files if any, or clear previous files
                        
                        // Format observation for the model
                        currentPromptText = `[Tool Output from ${toolResult.toolName}]:\n\`\`\`\n${toolResult.output}\n\`\`\`\n\n(Proceed with the next step or confirm completion)`;
                        
                        // Save "User" message (Tool Output) to history to keep context in sync
                        if (request.sessionId) {
                            const userMsg = `🛠️ **Tool Output:**\n\`\`\`\n${toolResult.output}\n\`\`\`\n\n*(Proceeding to step ${loopCount + 1})*`;
                            
                            let historyImages = toolResult.files ? toolResult.files.map(f => f.base64) : null;
                            await appendUserMessage(request.sessionId, userMsg, historyImages);
                        }
                        
                        // Update UI status
                        onUpdate("Gemini is thinking...", `Observed output from tool. Planning next step (${loopCount}/${MAX_LOOPS})...`);
                        
                    } else {
                        // No tool execution, final answer reached
                        keepLooping = false;
                    }
                }

            } catch (e) {
                console.error("Prompt loop error:", e);
                chrome.runtime.sendMessage({
                    action: "GEMINI_REPLY",
                    text: "Error: " + e.message,
                    status: "error"
                }).catch(() => {});
            } finally {
                sendResponse({ status: "completed" });
            }
        })();
        return true;
    }
}

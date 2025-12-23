// background/handlers/session/prompt/tool_executor.js
import { parseToolCommand } from '../utils.js';

export class ToolExecutor {
    constructor(controlManager) {
        this.controlManager = controlManager;
    }

    async executeIfPresent(text, onUpdate) {
        if (!this.controlManager) return null;

        const toolCommand = parseToolCommand(text);
        if (!toolCommand) return null;

        const toolName = toolCommand.name;
        onUpdate(`Executing tool: ${toolName}...`, "Processing tool execution...");

        let output = "";
        let files = null;

        try {
            const execResult = await this.controlManager.execute({
                name: toolName,
                args: toolCommand.args || {}
            });

            // Handle structured result (image + text) which usually comes from take_screenshot
            if (execResult && typeof execResult === 'object' && execResult.image) {
                output = execResult.text;
                files = [{
                    base64: execResult.image,
                    type: "image/png",
                    name: "screenshot.png"
                }];
            } else {
                output = execResult;
            }
        } catch (err) {
            output = `Error executing tool: ${err.message}`;
        }

        return {
            toolName,
            output,
            files
        };
    }
}

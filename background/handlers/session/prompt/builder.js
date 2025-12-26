// background/handlers/session/prompt/builder.js
import { getActiveTabContent } from '../utils.js';
import { BROWSER_CONTROL_PREAMBLE } from './preamble.js';

export class PromptBuilder {
    constructor(controlManager) {
        this.controlManager = controlManager;
    }

    async build(request) {
        let systemPreamble = "";

        if (request.includePageContext) {
            const pageContent = await getActiveTabContent();
            if (pageContent) {
                systemPreamble += `Webpage Context:
\`\`\`text
${pageContent}
\`\`\`

`;
            }
        }

        if (request.enableBrowserControl) {
            // Enable control overlay when browser control is requested
            if (this.controlManager) {
                await this.controlManager.enableControlMode();
            }
            
            systemPreamble += BROWSER_CONTROL_PREAMBLE;

            // Inject Snapshot (Structured Vision)
            if (this.controlManager) {
                try {
                    const snapshot = await this.controlManager.getSnapshot();
                    if (snapshot) {
                        systemPreamble += `
[Current Page Accessibility Tree (Structured Vision)]:
\`\`\`text
${snapshot}
\`\`\`
`;
                    } else {
                        systemPreamble += `\n[System: Could not capture initial snapshot. You may need to navigate to a page or use 'take_snapshot' manually.]\n`;
                    }
                } catch (e) {
                    console.warn("Auto-snapshot injection failed:", e);
                }
            }
        }

        let finalPrompt = request.text;
        if (systemPreamble) {
            finalPrompt = systemPreamble + "Question: " + finalPrompt;
        }
        return finalPrompt;
    }
}

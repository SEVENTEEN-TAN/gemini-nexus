
// background/control/actions/input/mouse.js
import { BaseActionHandler } from '../base.js';

export class MouseActions extends BaseActionHandler {
    
    async clickElement({ uid, dblClick = false }) {
        const objectId = await this.getObjectIdFromUid(uid);
        const backendNodeId = this.snapshotManager.getBackendNodeId(uid);

        try {
            // 1. Scroll element into view to ensure coordinates are valid
            await this.cmd("DOM.scrollIntoViewIfNeeded", { objectId });

            // 2. Get click coordinates
            const { model } = await this.cmd("DOM.getBoxModel", { backendNodeId });
            if (!model || !model.content) throw new Error("No box model found");

            // Calculate center of content quad [x1, y1, x2, y2, x3, y3, x4, y4]
            const x = (model.content[0] + model.content[4]) / 2;
            const y = (model.content[1] + model.content[5]) / 2;

            // 3. Dispatch Trusted Input Events wrapped in WaitHelper
            await this.waitHelper.execute(async () => {
                // Move to location
                await this.cmd("Input.dispatchMouseEvent", { 
                    type: "mouseMoved", x, y 
                });

                // First Click
                await this.cmd("Input.dispatchMouseEvent", { 
                    type: "mousePressed", x, y, button: "left", clickCount: 1 
                });
                await this.cmd("Input.dispatchMouseEvent", { 
                    type: "mouseReleased", x, y, button: "left", clickCount: 1 
                });

                // Second Click (if requested)
                if (dblClick) {
                    await this.cmd("Input.dispatchMouseEvent", { 
                        type: "mousePressed", x, y, button: "left", clickCount: 2 
                    });
                    await this.cmd("Input.dispatchMouseEvent", { 
                        type: "mouseReleased", x, y, button: "left", clickCount: 2 
                    });
                }
            });

            return `Clicked element ${uid} at ${Math.round(x)},${Math.round(y)}${dblClick ? ' (Double Click)' : ''}`;

        } catch (e) {
            console.warn("Physical click failed, attempting JS fallback:", e);
            
            // Fallback: Robust JS Simulation wrapped in WaitHelper
            await this.waitHelper.execute(async () => {
                await this.cmd("Runtime.callFunctionOn", {
                    objectId: objectId,
                    functionDeclaration: `function() { 
                        this.focus(); 
                        const opts = { bubbles: true, cancelable: true, view: window };
                        this.dispatchEvent(new MouseEvent('mousedown', opts));
                        this.dispatchEvent(new MouseEvent('mouseup', opts));
                        this.click(); 
                    }`
                });
            });

            return `Clicked element ${uid} (JS Fallback)`;
        }
    }

    async dragElement({ from_uid, to_uid }) {
        if (!from_uid || !to_uid) return "Error: 'from_uid' and 'to_uid' are required.";
        
        try {
            const fromObjectId = await this.getObjectIdFromUid(from_uid);
            const toObjectId = await this.getObjectIdFromUid(to_uid);
            const fromBackendNodeId = this.snapshotManager.getBackendNodeId(from_uid);
            const toBackendNodeId = this.snapshotManager.getBackendNodeId(to_uid);

            // Calculate start coordinates
            await this.cmd("DOM.scrollIntoViewIfNeeded", { objectId: fromObjectId });
            const { model: fromModel } = await this.cmd("DOM.getBoxModel", { backendNodeId: fromBackendNodeId });
            if (!fromModel || !fromModel.content) throw new Error("No box model for from_uid");
            const startX = (fromModel.content[0] + fromModel.content[4]) / 2;
            const startY = (fromModel.content[1] + fromModel.content[5]) / 2;

            // Calculate end coordinates
            await this.cmd("DOM.scrollIntoViewIfNeeded", { objectId: toObjectId });
            const { model: toModel } = await this.cmd("DOM.getBoxModel", { backendNodeId: toBackendNodeId });
            if (!toModel || !toModel.content) throw new Error("No box model for to_uid");
            const endX = (toModel.content[0] + toModel.content[4]) / 2;
            const endY = (toModel.content[1] + toModel.content[5]) / 2;

            await this.waitHelper.execute(async () => {
                // Perform Drag
                // 1. Move to start
                await this.cmd("Input.dispatchMouseEvent", { type: "mouseMoved", x: startX, y: startY });
                // 2. Press
                await this.cmd("Input.dispatchMouseEvent", { type: "mousePressed", x: startX, y: startY, button: "left", clickCount: 1 });
                
                // 3. Drag steps (simulating movement)
                const steps = 10;
                for (let i = 1; i <= steps; i++) {
                    const x = startX + (endX - startX) * (i / steps);
                    const y = startY + (endY - startY) * (i / steps);
                    await this.cmd("Input.dispatchMouseEvent", { type: "mouseMoved", x: x, y: y, button: "left" });
                    await new Promise(r => setTimeout(r, 50));
                }

                // 4. Release
                await this.cmd("Input.dispatchMouseEvent", { type: "mouseReleased", x: endX, y: endY, button: "left", clickCount: 1 });
            });

            return `Dragged element ${from_uid} to ${to_uid}.`;
        } catch (e) {
            return `Error dragging element: ${e.message}`;
        }
    }

    async hoverElement({ uid }) {
        const objectId = await this.getObjectIdFromUid(uid);
        const backendNodeId = this.snapshotManager.getBackendNodeId(uid);

        try {
            await this.cmd("DOM.scrollIntoViewIfNeeded", { objectId });
            const { model } = await this.cmd("DOM.getBoxModel", { backendNodeId });
            if (!model || !model.content) throw new Error("No box model found");

            const x = (model.content[0] + model.content[4]) / 2;
            const y = (model.content[1] + model.content[5]) / 2;

            // Hover usually doesn't trigger navigation, but we wait for DOM updates (tooltips, menus)
            await this.waitHelper.waitForStableDOM(1500, 200); 

            await this.cmd("Input.dispatchMouseEvent", {
                type: "mouseMoved", x, y
            });

            return `Hovered element ${uid} at ${Math.round(x)},${Math.round(y)}`;
        } catch (e) {
            console.warn("Hover failed:", e);
            return `Error hovering element ${uid}: ${e.message}`;
        }
    }
}

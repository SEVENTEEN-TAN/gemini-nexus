
// background/control/actions/input/keyboard.js
import { BaseActionHandler } from '../base.js';

export class KeyboardActions extends BaseActionHandler {
    
    async fillElement({ uid, value }) {
        const objectId = await this.getObjectIdFromUid(uid);
        
        await this.waitHelper.execute(async () => {
            // Enhanced JS injection to handle Select and ContentEditable
            // Pass value as argument to avoid syntax errors with special chars
            await this.cmd("Runtime.callFunctionOn", {
                objectId: objectId,
                functionDeclaration: `function(val) { 
                    this.focus();
                    
                    const tagName = this.tagName;
                    const isSelect = tagName === 'SELECT';
                    const isContentEditable = this.isContentEditable;
                    const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA';

                    if (isSelect) {
                        let found = false;
                        // 1. Try matching by value attribute
                        for (let i = 0; i < this.options.length; i++) {
                            if (this.options[i].value === val) {
                                this.selectedIndex = i;
                                found = true;
                                break;
                            }
                        }
                        // 2. Try matching by visible text
                        if (!found) {
                            for (let i = 0; i < this.options.length; i++) {
                                if (this.options[i].text === val) {
                                    this.selectedIndex = i;
                                    found = true;
                                    break;
                                }
                            }
                        }
                        // 3. Fallback to direct assignment
                        if (!found) this.value = val;
                    } else if (isContentEditable) {
                        // Use execCommand for better undo history support where possible
                        // First select all content to replace it
                        document.execCommand('selectAll', false, null);
                        document.execCommand('insertText', false, val);
                        
                        // Fallback if execCommand fails or adds nothing (e.g. empty string)
                        if (this.innerText !== val && val !== "") {
                            this.innerText = val;
                        }
                    } else {
                        // Standard input/textarea
                        this.value = val;
                    }
                    
                    // Dispatch standard events to trigger framework listeners (React, Vue, etc.)
                    this.dispatchEvent(new Event('input', { bubbles: true })); 
                    this.dispatchEvent(new Event('change', { bubbles: true })); 
                    
                    // Specific for some selects
                    if (isSelect) {
                        this.dispatchEvent(new Event('click', { bubbles: true }));
                    }
                }`,
                arguments: [{ value: value }]
            });
        });

        return `Filled element ${uid}`;
    }

    async pressKey({ key }) {
        const keyMap = {
            'Enter': { windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, key: 'Enter', code: 'Enter', text: '\r' },
            'Backspace': { windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8, key: 'Backspace', code: 'Backspace' },
            'Tab': { windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9, key: 'Tab', code: 'Tab' },
            'Escape': { windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27, key: 'Escape', code: 'Escape' },
            'Delete': { windowsVirtualKeyCode: 46, nativeVirtualKeyCode: 46, key: 'Delete', code: 'Delete' },
            'ArrowDown': { windowsVirtualKeyCode: 40, nativeVirtualKeyCode: 40, key: 'ArrowDown', code: 'ArrowDown' },
            'ArrowUp': { windowsVirtualKeyCode: 38, nativeVirtualKeyCode: 38, key: 'ArrowUp', code: 'ArrowUp' },
            'ArrowLeft': { windowsVirtualKeyCode: 37, nativeVirtualKeyCode: 37, key: 'ArrowLeft', code: 'ArrowLeft' },
            'ArrowRight': { windowsVirtualKeyCode: 39, nativeVirtualKeyCode: 39, key: 'ArrowRight', code: 'ArrowRight' },
            'PageUp': { windowsVirtualKeyCode: 33, nativeVirtualKeyCode: 33, key: 'PageUp', code: 'PageUp' },
            'PageDown': { windowsVirtualKeyCode: 34, nativeVirtualKeyCode: 34, key: 'PageDown', code: 'PageDown' },
            'End': { windowsVirtualKeyCode: 35, nativeVirtualKeyCode: 35, key: 'End', code: 'End' },
            'Home': { windowsVirtualKeyCode: 36, nativeVirtualKeyCode: 36, key: 'Home', code: 'Home' },
            'Space': { windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32, key: ' ', code: 'Space', text: ' ' }
        };

        try {
            await this.waitHelper.execute(async () => {
                if (keyMap[key]) {
                    const def = keyMap[key];
                    // Sending both keyDown and keyUp
                    await this.cmd("Input.dispatchKeyEvent", { type: 'keyDown', ...def });
                    await this.cmd("Input.dispatchKeyEvent", { type: 'keyUp', ...def });
                } else if (key.length === 1) {
                    // Character input
                    await this.cmd("Input.dispatchKeyEvent", { type: 'keyDown', text: key, key: key });
                    await this.cmd("Input.dispatchKeyEvent", { type: 'keyUp', text: key, key: key });
                } else {
                    throw new Error(`Key '${key}' not supported.`);
                }
            });

            return `Pressed key: ${key}`;
        } catch (e) {
            return `Error pressing key ${key}: ${e.message}`;
        }
    }
}

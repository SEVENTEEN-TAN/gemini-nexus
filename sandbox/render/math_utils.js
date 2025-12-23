
// sandbox/render/math_utils.js

export class MathHandler {
    constructor() {
        this.blocks = [];
    }

    protect(text) {
        this.blocks = [];
        
        const protect = (regex, isDisplay) => {
            text = text.replace(regex, (match, content) => {
                const id = `@@MATH_BLOCK_${this.blocks.length}@@`;
                this.blocks.push({ id, content, isDisplay });
                return id;
            });
        };

        // 1. Block Math: \$\$ ... \$\$ (Gemini specific)
        protect(/\\\$\$([\s\S]+?)\\\$\$/g, true);
        
        // 2. Block Math: $$ ... $$
        protect(/\$\$([\s\S]+?)\$\$/g, true);

        // 3. Block Math: \[ ... \]
        protect(/\\\[([\s\S]+?)\\\]/g, true);

        // 4. Inline Math: \$ ... \$ (Gemini specific)
        protect(/\\\$([^$]+?)\\\$/g, false);

        // 5. Inline Math: \( ... \)
        protect(/\\\(([\s\S]+?)\\\)/g, false);

        // 6. Inline Math: $ ... $ (Standard LaTeX)
        protect(/(?<!\\)\$([^$\n]+?)(?<!\\)\$/g, false);

        return text;
    }

    restore(html) {
        this.blocks.forEach(({ id, content, isDisplay }) => {
            // Escape HTML chars inside latex to prevent browser parsing issues
            const safeContent = content
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            
            // Use standard delimiters for KaTeX
            const delim = isDisplay ? '$$' : '$';
            
            html = html.replace(id, `${delim}${safeContent}${delim}`);
        });
        return html;
    }
}

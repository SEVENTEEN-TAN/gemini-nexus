<div align="center">
  <h1>Gemini Nexus</h1>
  <p>A powerful AI assistant Chrome Extension powered by Google Gemini.</p>
</div>

## Overview

Gemini Nexus integrates Google's Gemini models directly into your browsing experience. It features a side panel for chat, a floating toolbar for quick actions, and image analysis capabilities.

## Architecture

*   **Side Panel**: The main chat interface (`sidepanel/`).
*   **Sandbox**: Secure iframe environment for rendering Markdown and handling logic (`sandbox/`).
*   **Content Scripts**: Floating toolbar and page interaction (`content/`).
*   **Background**: Service worker handling API calls and session management (`background/`).

## Run Locally

**Prerequisites:** Node.js

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Build the extension:
    ```bash
    npm run build
    ```

3.  Load into Chrome:
    *   Open `chrome://extensions/`
    *   Enable "Developer mode"
    *   Click "Load unpacked"
    *   Select the `dist` folder (or root if running in dev mode without bundling).

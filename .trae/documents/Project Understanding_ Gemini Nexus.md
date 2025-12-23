# Gemini Nexus Project Analysis

## 1. Project Overview
**Gemini Nexus (v4.0.0)** is a sophisticated **Agentic Chrome Extension** that integrates Google Gemini into the browser. It goes beyond a simple chat interface by implementing a full **Autonomous Browser Agent** capable of interacting with web pages.

## 2. Technical Architecture
The project uses **Vanilla JavaScript with ES Modules (ESM)** and **Vite** for building. It follows a secure and modular architecture:

*   **Background (`background/`)**: The "Brain".
    *   **Service Worker**: Manages sessions and the **Agent Loop**.
    *   **PromptHandler**: Implements a `while` loop (up to 10 steps) that allows Gemini to think, execute tools, and observe results before answering.
    *   **ToolExecutor**: Parses Gemini's response for JSON tool commands and executes them.
*   **Sandbox (`sandbox/`)**: The "View" & "Controller".
    *   **Iframe Pattern**: Runs inside `sidepanel/` but isolated in a sandbox. This allows safe rendering of Markdown/HTML without CSP conflicts.
    *   **Logic**: Handles user input, rendering, and state management, communicating with the Background via a message bus.
*   **Content Scripts (`content/`)**: The "Hands".
    *   Injects a toolbar and overlay into web pages.
    *   Handles DOM interaction, image cropping, and text selection.

## 3. Key Capabilities (The "Agent")
The extension defines a set of tools in `preamble.js` that Gemini can use:
*   **Interaction**: `click`, `fill`, `hover`, `drag_element`, `press_key`.
*   **Navigation**: `navigate_page`, `new_page`, `close_page`.
*   **Observation**: `take_snapshot` (Accessibility Tree), `take_screenshot`, `get_logs`.
*   **DevTools**: `list_network_requests`, `get_network_request`, `performance_start/stop_trace`.
*   **Scripting**: `evaluate_script` (DOM), `run_javascript` (Logic).

## 4. Codebase Status
*   **Framework**: Custom Vanilla JS (No React/Vue).
*   **Deprecated**: `index.tsx` explicitly states it is deprecated.
*   **Style**: Modular CSS in `css/` directory.

## 5. Next Steps
You can now ask me to:
*   Add a new tool to the agent.
*   Modify the UI or Themes.
*   Debug the "Agent Loop" or specific tools.
*   Remove the deprecated `index.tsx` file.

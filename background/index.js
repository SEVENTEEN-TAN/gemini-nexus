
// background/index.js
import { GeminiSessionManager } from './managers/session_manager.js';
import { ImageManager } from './managers/image_manager.js';
import { BrowserControlManager } from './managers/control_manager.js';
import { LogManager } from './managers/log_manager.js';
import { setupContextMenus } from './menus.js';
import { setupMessageListener } from './messages.js';
import { keepAliveManager } from './managers/keep_alive.js';

// Setup Sidepanel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Initialize Managers
const logManager = new LogManager();
const sessionManager = new GeminiSessionManager();
const imageManager = new ImageManager();
const controlManager = new BrowserControlManager();

// Initialize Modules
setupContextMenus(imageManager);
setupMessageListener(sessionManager, imageManager, controlManager, logManager);

// Initialize Advanced Keep-Alive (Cookie Rotation)
keepAliveManager.init();

# Troubleshoot "Summarize" Button Text Issue

## 1. Issue Analysis
The user reports that the "Summarize" button still displays English text despite:
1. Updating `sandbox/core/i18n.js` to include "总结".
2. Updating `sandbox/ui/templates/footer.js` to set the default HTML to "总结".

## 2. Potential Causes
1.  **Vite Build**: The project uses Vite (confirmed by `vite.config.ts`). The extension might be loading from a `dist/` directory that hasn't been updated. The user might need to run `npm run build` to reflect changes if they are loading the extension from `dist/`.
2.  **Browser Caching**: Chrome extensions aggressively cache files.
3.  **Language Preference**: The `i18n.js` logic might be forcing English if the user's browser language or saved preference is 'en'.

## 3. Action Plan
1.  **Check Build Status**: Run `npm run build` to ensure the `dist/` folder (if used) is up-to-date.
2.  **Force Chinese Default**: To be absolutely sure, I will modify `i18n.js` to force the `summarize` key to return "总结" even in English, or ensure the fallback logic is correct.
3.  **Verify Template**: Double-check `sandbox/ui/templates/footer.js` content one more time.

## 4. Execution Steps
1.  Run `npm run build` to update any bundled artifacts.
2.  (Optional) If the user is running in dev mode, they might need to reload the extension in `chrome://extensions`.

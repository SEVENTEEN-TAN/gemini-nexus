
// services/gems.js
// Service for fetching and managing Google Gems

import { fetchRequestParams } from './auth.js';

/**
 * Fetch user's Gem list from Gemini
 * This attempts to extract Gems from the Gemini app page
 * @param {string} userIndex - Account index (default: '0')
 * @returns {Promise<Array>} List of Gems with {id, name, description}
 */
export async function fetchGemsList(userIndex = '0') {
    try {
        // Construct URL for Gemini app page
        let url = 'https://gemini.google.com/app';
        if (userIndex && userIndex !== '0') {
            url = `https://gemini.google.com/u/${userIndex}/app`;
        }

        console.log(`[Gems] Fetching Gems list for account ${userIndex} from ${url}...`);
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            console.error(`[Gems] HTTP Error: ${response.status} ${response.statusText}`);
            throw new Error(`Failed to fetch Gems: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        console.log(`[Gems] Received HTML response, length: ${html.length} chars`);
        
        // Try to extract Gems data from the page
        const gems = extractGemsFromHTML(html);
        
        console.log(`[Gems] Extraction complete. Found ${gems.length} Gems:`, gems.map(g => ({ id: g.id.substring(0, 12), name: g.name })));
        return gems;
        
    } catch (error) {
        console.error('[Gems] Error fetching Gems list:', error);
        console.error('[Gems] Error stack:', error.stack);
        throw error; // Re-throw to let caller handle it
    }
}

/**
 * Extract Gems data from HTML
 * Looks for various patterns where Gems might be stored
 */
function extractGemsFromHTML(html) {
    const gems = [];
    
    try {
        console.log('[Gems] Starting HTML parsing...');
        
        // Pattern 1: Look for AF_initDataCallback with Gems data
        // Google often uses this pattern: AF_initDataCallback({key:'ds:X',data:[...]})
        console.log('[Gems] Trying Pattern 1: AF_initDataCallback...');
        const initDataPattern = /AF_initDataCallback\s*\(\s*\{[^}]*key\s*:\s*['"]ds:\d+['"][^}]*data\s*:\s*(\[[\s\S]*?\])\s*\}\s*\)/g;
        let match;
        let pattern1Count = 0;
        
        while ((match = initDataPattern.exec(html)) !== null) {
            pattern1Count++;
            try {
                const data = JSON.parse(match[1]);
                const extractedGems = findGemsInData(data);
                if (extractedGems.length > 0) {
                    console.log(`[Gems] Pattern 1 match ${pattern1Count} found ${extractedGems.length} gems`);
                    gems.push(...extractedGems);
                }
            } catch (e) {
                // Skip invalid JSON blocks
                continue;
            }
        }
        console.log(`[Gems] Pattern 1 total matches: ${pattern1Count}`);
        
        // Pattern 2: Look for WIZ_global_data
        console.log('[Gems] Trying Pattern 2: WIZ_global_data...');
        const wizPattern = /WIZ_global_data\s*=\s*(\{[\s\S]*?\});/;
        const wizMatch = html.match(wizPattern);
        if (wizMatch) {
            console.log('[Gems] WIZ_global_data found, parsing...');
            try {
                const wizData = JSON.parse(wizMatch[1]);
                const extractedGems = findGemsInData(wizData);
                console.log(`[Gems] Pattern 2 found ${extractedGems.length} gems`);
                gems.push(...extractedGems);
            } catch (e) {
                console.warn('[Gems] Failed to parse WIZ_global_data:', e.message);
            }
        } else {
            console.log('[Gems] WIZ_global_data not found');
        }
        
        // Pattern 3: Look for direct gem URLs in the HTML
        // URL pattern: /gem/[GEM_ID]
        console.log('[Gems] Trying Pattern 3: gem URLs...');
        const gemUrlPattern = /href=["'](?:https?:\/\/gemini\.google\.com)?\/(u\/\d+\/)?gem\/([a-zA-Z0-9_-]+)["']/g;
        const gemIds = new Set();
        let pattern3Count = 0;
        
        while ((match = gemUrlPattern.exec(html)) !== null) {
            const gemId = match[2];
            if (gemId && !gemIds.has(gemId) && gemId.length >= 8) {
                pattern3Count++;
                gemIds.add(gemId);
                // We have the ID but not the name, add with placeholder
                gems.push({
                    id: gemId,
                    name: `Gem ${gemId.substring(0, 8)}`,
                    description: ''
                });
            }
        }
        console.log(`[Gems] Pattern 3 found ${pattern3Count} gem URLs`);
        
    } catch (error) {
        console.error('[Gems] Error parsing HTML:', error);
        console.error('[Gems] Error stack:', error.stack);
    }
    
    // Remove duplicates based on ID
    const uniqueGems = [];
    const seenIds = new Set();
    
    for (const gem of gems) {
        if (!seenIds.has(gem.id)) {
            seenIds.add(gem.id);
            uniqueGems.push(gem);
        }
    }
    
    return uniqueGems;
}

/**
 * Recursively search for Gem data structures in parsed JSON
 */
function findGemsInData(data, depth = 0) {
    const gems = [];
    const maxDepth = 10; // Prevent infinite recursion
    
    if (depth > maxDepth) return gems;
    
    if (Array.isArray(data)) {
        for (const item of data) {
            // Check if this looks like a Gem object
            if (isGemObject(item)) {
                const gem = parseGemObject(item);
                if (gem) gems.push(gem);
            } else if (typeof item === 'object' && item !== null) {
                gems.push(...findGemsInData(item, depth + 1));
            }
        }
    } else if (typeof data === 'object' && data !== null) {
        for (const value of Object.values(data)) {
            if (isGemObject(value)) {
                const gem = parseGemObject(value);
                if (gem) gems.push(gem);
            } else if (typeof value === 'object' && value !== null) {
                gems.push(...findGemsInData(value, depth + 1));
            }
        }
    }
    
    return gems;
}

/**
 * Check if an object looks like a Gem data structure
 */
function isGemObject(obj) {
    if (!obj || typeof obj !== 'object') return false;
    
    // Look for common Gem identifiers
    // Gems typically have an ID and a name/title
    if (Array.isArray(obj)) {
        // Google's data often uses array format
        // Check for patterns like: [gemId, name, ...]
        if (obj.length >= 2 && 
            typeof obj[0] === 'string' && 
            obj[0].match(/^[a-zA-Z0-9_-]{8,}$/) &&
            typeof obj[1] === 'string') {
            return true;
        }
    } else {
        // Object format
        const hasId = obj.id || obj.gemId || obj.gem_id;
        const hasName = obj.name || obj.title || obj.displayName;
        return !!(hasId && hasName);
    }
    
    return false;
}

/**
 * Parse a Gem object into standard format
 */
function parseGemObject(obj) {
    try {
        if (Array.isArray(obj)) {
            // Array format: [id, name, description?, ...]
            return {
                id: obj[0],
                name: obj[1] || `Gem ${obj[0].substring(0, 8)}`,
                description: obj[2] || ''
            };
        } else {
            // Object format
            const id = obj.id || obj.gemId || obj.gem_id;
            const name = obj.name || obj.title || obj.displayName || `Gem ${id.substring(0, 8)}`;
            const description = obj.description || obj.desc || '';
            
            return { id, name, description };
        }
    } catch (error) {
        return null;
    }
}

/**
 * Fetch a specific Gem's details
 * @param {string} gemId - The Gem ID
 * @param {string} userIndex - Account index
 * @returns {Promise<Object>} Gem details
 */
export async function fetchGemDetails(gemId, userIndex = '0') {
    try {
        let url = `https://gemini.google.com/gem/${gemId}`;
        if (userIndex && userIndex !== '0') {
            url = `https://gemini.google.com/u/${userIndex}/gem/${gemId}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch Gem details: ${response.status}`);
        }

        const html = await response.text();
        
        // Try to extract Gem name from the page title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        let name = `Gem ${gemId.substring(0, 8)}`;
        
        if (titleMatch && titleMatch[1]) {
            // Clean up the title (remove "- Gemini" suffix if present)
            name = titleMatch[1].replace(/\s*[-–]\s*Gemini.*$/i, '').trim();
        }
        
        return {
            id: gemId,
            name: name,
            description: ''
        };
        
    } catch (error) {
        console.error('[Gems] Error fetching Gem details:', error);
        return {
            id: gemId,
            name: `Gem ${gemId.substring(0, 8)}`,
            description: ''
        };
    }
}

/**
 * Cache for Gems list to avoid repeated fetches
 */
let gemsCache = {
    data: null,
    timestamp: 0,
    accountIndex: null
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get Gems list with caching
 */
export async function getCachedGemsList(userIndex = '0', forceRefresh = false) {
    const now = Date.now();
    
    // Return cached data if valid
    if (!forceRefresh && 
        gemsCache.data && 
        gemsCache.accountIndex === userIndex &&
        (now - gemsCache.timestamp) < CACHE_DURATION) {
        return gemsCache.data;
    }
    
    // Fetch new data
    const gems = await fetchGemsList(userIndex);
    
    // Update cache
    gemsCache = {
        data: gems,
        timestamp: now,
        accountIndex: userIndex
    };
    
    return gems;
}

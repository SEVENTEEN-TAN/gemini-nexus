
// services/gems_api.js
// Precise API for fetching Gems list from Gemini

import { fetchRequestParams } from './auth.js';

/**
 * Fetch Gems list using the batchexecute API
 * This uses the exact same endpoint as the Gemini web app
 * @param {string} userIndex - Account index (default: '0')
 * @returns {Promise<Array>} List of Gems
 */
export async function fetchGemsListAPI(userIndex = '0') {
    try {
        console.log(`[GemsAPI] Fetching Gems for account ${userIndex}...`);
        
        // Get authentication parameters
        const auth = await fetchRequestParams(userIndex);
        
        // Construct the batchexecute URL
        const params = new URLSearchParams({
            'rpcids': 'CNgdBe',
            'source-path': userIndex === '0' ? '/app' : `/u/${userIndex}/app`,
            'bl': auth.blValue || 'boq_assistant-bard-web-server_20251217.07_p5',
            'hl': 'zh-CN',
            '_reqid': Math.floor(Math.random() * 900000) + 100000,
            'rt': 'c'
        });
        
        const url = `https://gemini.google.com/u/${userIndex}/_/BardChatUi/data/batchexecute?${params.toString()}`;
        
        // Construct the f.req payload
        // Format: [[[rpcId, jsonData, null, "generic"]]]
        const rpcData = [1, ["zh-CN"], 0];
        const fReq = JSON.stringify([
            [
                ["CNgdBe", JSON.stringify(rpcData), null, "generic"]
            ]
        ]);
        
        console.log('[GemsAPI] Request URL:', url);
        console.log('[GemsAPI] f.req payload:', fReq);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
                'X-Same-Domain': '1',
                'X-Goog-AuthUser': userIndex
            },
            body: new URLSearchParams({
                'at': auth.atValue,
                'f.req': fReq
            }),
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        console.log('[GemsAPI] Response length:', text.length, 'chars');
        
        // Parse the response
        const gems = parseGemsResponse(text);
        console.log(`[GemsAPI] Parsed ${gems.length} Gems`);
        
        return gems;
        
    } catch (error) {
        console.error('[GemsAPI] Error fetching Gems:', error);
        throw error;
    }
}

/**
 * Parse the batchexecute response to extract Gems
 * The response format is multi-line with JSON data
 */
function parseGemsResponse(responseText) {
    const gems = [];
    
    try {
        // The response has multiple lines, we need the data line
        const lines = responseText.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            // Skip non-JSON lines
            if (!line.startsWith('[')) continue;
            
            try {
                const data = JSON.parse(line);
                
                // Look for the CNgdBe response
                // Format: [["wrb.fr", "CNgdBe", "[...]"]]
                if (Array.isArray(data) && data.length > 0) {
                    for (const item of data) {
                        if (Array.isArray(item) && item.length >= 3 && item[1] === 'CNgdBe') {
                            // Parse the third element which contains the Gems data
                            const gemsData = JSON.parse(item[2]);
                            
                            // The structure is: [null, null, [[gemId, gemData], [gemId, gemData], ...]]
                            if (Array.isArray(gemsData) && gemsData.length >= 3 && Array.isArray(gemsData[2])) {
                                const gemsList = gemsData[2];
                                
                                for (const gemEntry of gemsList) {
                                    if (Array.isArray(gemEntry) && gemEntry.length >= 2) {
                                        const gemId = gemEntry[0];
                                        const gemData = gemEntry[1];
                                        
                                        if (Array.isArray(gemData) && gemData.length >= 1) {
                                            const name = gemData[0] || `Gem ${gemId.substring(0, 8)}`;
                                            const systemPrompt = gemData[1] || '';
                                            const description = gemEntry.length >= 3 && Array.isArray(gemEntry[2]) ? gemEntry[2][0] : '';
                                            
                                            gems.push({
                                                id: gemId,
                                                name: name,
                                                description: description || systemPrompt.substring(0, 100),
                                                systemPrompt: systemPrompt
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (e) {
                // Skip invalid JSON lines
                continue;
            }
        }
        
    } catch (error) {
        console.error('[GemsAPI] Error parsing response:', error);
    }
    
    return gems;
}

/**
 * Cache for Gems list
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
export async function getCachedGemsListAPI(userIndex = '0', forceRefresh = false) {
    const now = Date.now();
    
    // Return cached data if valid
    if (!forceRefresh && 
        gemsCache.data && 
        gemsCache.accountIndex === userIndex &&
        (now - gemsCache.timestamp) < CACHE_DURATION) {
        console.log('[GemsAPI] Returning cached data');
        return gemsCache.data;
    }
    
    // Fetch new data
    const gems = await fetchGemsListAPI(userIndex);
    
    // Update cache
    gemsCache = {
        data: gems,
        timestamp: now,
        accountIndex: userIndex
    };
    
    return gems;
}

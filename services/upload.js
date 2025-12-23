
// services/upload.js
import { dataUrlToBlob } from '../lib/utils.js';

// Upload file to Google's content-push service using standard multipart/form-data
// This aligns with the 'gemini-webapi' Python implementation
export async function uploadFile(fileObj, signal) {
    console.log("Uploading file...", fileObj.name);
    
    // 1. Prepare Blob
    const blob = await dataUrlToBlob(fileObj.base64);
    
    // 2. Prepare FormData
    const formData = new FormData();
    // The key must be 'file'. Content-Type is auto-set by browser with boundary.
    formData.append('file', blob, fileObj.name);

    // 3. Execute Upload
    // Endpoint: https://content-push.googleapis.com/upload
    // Header: Push-ID required
    const response = await fetch('https://content-push.googleapis.com/upload', {
        method: 'POST',
        signal: signal,
        headers: {
            'Push-ID': 'feeds/mcudyrk2a4khkz'
        },
        body: formData
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
    }

    const responseText = await response.text();
    console.log("File upload success");
    
    // Returns the identifier (e.g. /contrib_service/ttl_1d/...)
    return responseText;
}


// crop_utils.js

export async function cropImage(base64, area) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // area contains CSS pixels, but image is Device Pixels (High DPI)
            // We usually need to scale coordinates by pixelRatio
            const scale = area.pixelRatio || 1;
            
            canvas.width = area.width * scale;
            canvas.height = area.height * scale;
            
            ctx.drawImage(
                img,
                area.x * scale, area.y * scale, area.width * scale, area.height * scale, // Source
                0, 0, canvas.width, canvas.height // Destination
            );
            
            resolve(canvas.toDataURL('image/png'));
        };
        img.src = base64;
    });
}


// background/control/actions/emulation.js
import { BaseActionHandler } from './base.js';

const NETWORK_CONDITIONS = {
    'Offline': { offline: true, downloadThroughput: 0, uploadThroughput: 0, latency: 0 },
    'Slow 3G': { offline: false, downloadThroughput: ((500 * 1024) / 8) * 0.8, uploadThroughput: ((500 * 1024) / 8) * 0.8, latency: 400 * 5 },
    'Fast 3G': { offline: false, downloadThroughput: ((1.6 * 1024 * 1024) / 8) * 0.9, uploadThroughput: ((750 * 1024) / 8) * 0.9, latency: 150 * 3.75 },
    'Slow 4G': { offline: false, downloadThroughput: ((1.6 * 1024 * 1024) / 8), uploadThroughput: ((750 * 1024) / 8), latency: 150 * 2.5 },
    'Fast 4G': { offline: false, downloadThroughput: ((1.6 * 1024 * 1024) / 8), uploadThroughput: ((750 * 1024) / 8), latency: 150 }
};

export class EmulationActions extends BaseActionHandler {
    async emulate({ networkConditions, cpuThrottlingRate, geolocation }) {
        let response = [];

        // 1. Network Emulation
        if (networkConditions !== undefined) {
            let conditions = null;
            let multiplier = 1;

            if (networkConditions === 'No emulation') {
                conditions = { offline: false, downloadThroughput: -1, uploadThroughput: -1, latency: 0 };
            } else if (NETWORK_CONDITIONS[networkConditions]) {
                conditions = NETWORK_CONDITIONS[networkConditions];
                // Approximate multiplier based on conditions
                if (networkConditions === 'Slow 3G') multiplier = 10;
                else if (networkConditions === 'Fast 3G') multiplier = 5;
                else if (networkConditions === 'Slow 4G') multiplier = 2.5;
            }

            if (conditions) {
                await this.cmd('Network.enable'); // Ensure Network domain is enabled
                await this.cmd('Network.emulateNetworkConditions', conditions);
                this.waitHelper.updateMultipliers(this.waitHelper.cpuMultiplier, multiplier);
                response.push(`Network set to ${networkConditions}`);
            }
        }

        // 2. CPU Throttling
        if (cpuThrottlingRate !== undefined) {
            const rate = Math.max(1, cpuThrottlingRate);
            await this.cmd('Emulation.setCPUThrottlingRate', { rate });
            this.waitHelper.updateMultipliers(rate, this.waitHelper.networkMultiplier);
            response.push(`CPU throttling set to ${rate}x`);
        }

        // 3. Geolocation
        if (geolocation !== undefined) {
            if (geolocation === null) {
                await this.cmd('Emulation.clearGeolocationOverride');
                response.push('Geolocation override cleared');
            } else {
                const { latitude, longitude, accuracy = 1 } = geolocation;
                await this.cmd('Emulation.setGeolocationOverride', {
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    accuracy: accuracy
                });
                response.push(`Geolocation set to Lat: ${latitude}, Lon: ${longitude}`);
            }
        }

        return response.length ? response.join(', ') : "No emulation changes applied.";
    }

    async resizePage({ width, height }) {
        if (!width || !height) return "Error: 'width' and 'height' are required for resize_page.";
        
        try {
            await this.cmd('Emulation.setDeviceMetricsOverride', {
                width: width,
                height: height,
                deviceScaleFactor: 1, // Default to standard desktop scale
                mobile: false
            });
            return `Viewport resized to ${width}x${height}.`;
        } catch (e) {
            return `Error resizing page: ${e.message}`;
        }
    }
}
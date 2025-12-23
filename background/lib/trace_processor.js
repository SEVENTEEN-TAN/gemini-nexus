
// background/lib/trace_processor.js

/**
 * Lightweight Trace Parser
 * Extracts Core Web Vitals and key performance metrics from raw CDP trace events.
 * Simulates the output format of chrome-devtools-frontend's TraceEngine.
 */
export class TraceProcessor {
    static process(events) {
        if (!events || events.length === 0) {
            return { error: "No trace events collected." };
        }

        const metrics = {
            fcp: null,
            lcp: null,
            cls: 0,
            domContentLoaded: null,
            load: null
        };

        let navigationStart = 0;
        let url = "";

        // Iterate events to find metrics
        for (const e of events) {
            const name = e.name;
            const args = e.args;

            if (name === 'navigationStart' && !navigationStart) {
                navigationStart = e.ts;
                if (args && args.data && args.data.documentLoaderURL) {
                    url = args.data.documentLoaderURL;
                }
            }

            // FCP
            if (name === 'firstContentfulPaint' && !metrics.fcp) {
                metrics.fcp = (e.ts - navigationStart) / 1000;
            }

            // LCP Candidate
            if (name === 'largestContentfulPaint::Candidate') {
                const duration = (e.ts - navigationStart) / 1000;
                // Keep the latest candidate as the LCP
                metrics.lcp = duration;
            }

            // CLS (Layout Shift)
            if (name === 'LayoutShift') {
                if (args && args.data && !args.data.hadRecentInput) {
                    metrics.cls += (args.data.score || 0);
                }
            }
            
            // Document Load
            if (name === 'DomContentLoadedEventEnd') {
                metrics.domContentLoaded = (e.ts - navigationStart) / 1000;
            }
            if (name === 'LoadEventEnd') {
                metrics.load = (e.ts - navigationStart) / 1000;
            }
        }

        return {
            url,
            metrics,
            eventCount: events.length
        };
    }

    static formatSummary(result) {
        if (result.error) return result.error;

        const m = result.metrics;
        const f = (val) => val ? val.toFixed(2) : 'N/A';

        return `## Summary of Performance trace findings:
URL: ${result.url || 'Unknown'}
Events Captured: ${result.eventCount}

# Metrics (Observed):
- First Contentful Paint (FCP): ${f(m.fcp)} ms
- Largest Contentful Paint (LCP): ${f(m.lcp)} ms
- Cumulative Layout Shift (CLS): ${m.cls.toFixed(4)}
- DOM Content Loaded: ${f(m.domContentLoaded)} ms
- Load Event: ${f(m.load)} ms

# Available Insights:
(Note: Deep insight analysis requires full Chrome DevTools Frontend integration. Basic metrics provided above.)

- **LCP Analysis**: ${m.lcp > 2500 ? "LCP is slow (>2.5s). Optimize render blocking resources and image loading." : "LCP is good."}
- **CLS Analysis**: ${m.cls > 0.1 ? "Layout stability issues detected. Check for unsized images or dynamic content injection." : "Layout is stable."}
`;
    }
}

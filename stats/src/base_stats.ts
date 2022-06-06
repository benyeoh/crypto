const ss = require("simple-statistics");

export function getPathStatistics(mapping: Object) {
    let statistics = [];
    for (const [k, v] of Object.entries(mapping)) {
        let statsData = {
            optimalDelta: {
                tenth: ss.quantile(v.optimalDeltas.concat([v.lastOptimalDelta]), 0.1),
                quarter: ss.quantile(v.optimalDeltas.concat([v.lastOptimalDelta]), 0.25),
                mean: ss.mean(v.optimalDeltas.concat([v.lastOptimalDelta])),
                median: ss.median(v.optimalDeltas.concat([v.lastOptimalDelta])),
                stdDev: v.optimalDeltas.length >= 1 ? ss.sampleStandardDeviation(v.optimalDeltas.concat([v.lastOptimalDelta])) : null,
                skewness: v.optimalDeltas.length >= 2 ? ss.sampleSkewness(v.optimalDeltas.concat([v.lastOptimalDelta])) : null
            },

            optimalVol: {
                tenth: ss.quantile(v.optimalVols.concat([v.lastOptimalVol]), 0.1),
                quarter: ss.quantile(v.optimalVols.concat([v.lastOptimalVol]), 0.25),
                mean: ss.mean(v.optimalVols.concat([v.lastOptimalVol]).map((x) => x / 1.0)),
                median: ss.median(v.optimalVols.concat([v.lastOptimalVol]).map((x) => x / 1.0)),
                stdDev: v.optimalVols.length >= 1 ? ss.sampleStandardDeviation(v.optimalVols.concat([v.lastOptimalVol]).map((x) => x / 1.0)) : null,
                skewness: v.optimalVols.length >= 2 ? ss.sampleSkewness(v.optimalVols.concat([v.lastOptimalVol]).map((x) => x / 1.0)) : null
            },

            swapPrice: {
                tenth: ss.quantile(v.swapPrices.concat([v.lastSwapPrice]), 0.1),
                quarter: ss.quantile(v.swapPrices.concat([v.lastSwapPrice]), 0.25),
                mean: ss.mean(v.swapPrices.concat([v.lastSwapPrice])),
                median: ss.median(v.swapPrices.concat([v.lastSwapPrice])),
                stdDev: v.swapPrices.length >= 1 ? ss.sampleStandardDeviation(v.swapPrices.concat([v.lastSwapPrice])) : null,
                skewness: v.swapPrices.length >= 2 ? ss.sampleSkewness(v.swapPrices.concat([v.lastSwapPrice])) : null
            },

            duration: {
                tenth: ss.quantile(v.durations.concat([v.lastDuration]).map((x) => x / 1000.0), 0.1),
                quarter: ss.quantile(v.durations.concat([v.lastDuration]).map((x) => x / 1000.0), 0.25),
                min: ss.min(v.durations.concat([v.lastDuration]).map((x) => x / 1000.0)),
                mean: ss.mean(v.durations.concat([v.lastDuration]).map((x) => x / 1000.0)),
                median: ss.median(v.durations.concat([v.lastDuration]).map((x) => x / 1000.0)),
                stdDev: v.durations.length >= 1 ? ss.sampleStandardDeviation(v.durations.concat([v.lastDuration]).map((x) => x / 1000.0)) : null,
                skewness: v.durations.length >= 2 ? ss.sampleSkewness(v.durations.concat([v.lastDuration]).map((x) => x / 1000.0)) : null
            },

            uniqueOccurences: v.durations.length + 1
        };

        statsData["volPerDelta"] = {
            quarter: statsData.optimalVol.quarter / statsData.optimalDelta.quarter,
            mean: statsData.optimalVol.mean / statsData.optimalDelta.mean,
            median: statsData.optimalVol.median / statsData.optimalDelta.median,
        };

        statistics.push([k, statsData]);
    }

    return statistics;
}

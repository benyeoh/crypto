const ss = require("simple-statistics");

export function getSorter2(k1, k2, asc = false) {
    if (!asc) {
        return ((a, b) => b[1][k1][k2] - a[1][k1][k2]);
    } else {
        return ((a, b) => a[1][k1][k2] - b[1][k1][k2]);
    }
}

export function getSorter(k1, asc = false) {
    if (!asc) {
        return ((a, b) => b[1][k1] - a[1][k1]);
    } else {
        return ((a, b) => a[1][k1] - b[1][k1]);
    }
}

export function getFilterByKey(filterPaths, filterExchanges) {
    return ((pathMapping) => {
        const paths = pathMapping[0].split("|")[0].split(",");
        const networks = pathMapping[0].split("|")[1].split(",");
        if (filterPaths.length > 0 && filterPaths.length != paths.length) {
            return false;
        }

        if (filterExchanges.length > 0 && filterExchanges.length != networks.length) {
            return false;
        }

        for (let i = 0; i < filterPaths.length; i++) {
            if (paths[i].match(filterPaths[i]) === null) {
                return false;
            }
        }

        for (let i = 0; i < filterExchanges.length; i++) {
            if (networks[i].match(filterExchanges[i]) === null) {
                return false;
            }
        }

        return true;
    });
}

export function getPathStatistics(mapping: Object) {
    let statistics = [];
    for (const [k, v] of Object.entries(mapping)) {
        let statsData = {
            optimalDelta: {
                mean: ss.mean(v.optimalDeltas.concat([v.lastOptimalDelta])),
                median: ss.median(v.optimalDeltas.concat([v.lastOptimalDelta])),
                stdDev: v.optimalDeltas.length >= 1 ? ss.sampleStandardDeviation(v.optimalDeltas.concat([v.lastOptimalDelta])) : null,
                skewness: v.optimalDeltas.length >= 2 ? ss.sampleSkewness(v.optimalDeltas.concat([v.lastOptimalDelta])) : null
            },

            optimalVol: {
                mean: ss.mean(v.optimalVols.concat([v.lastOptimalVol]).map((x) => x / 1.0)),
                median: ss.median(v.optimalVols.concat([v.lastOptimalVol]).map((x) => x / 1.0)),
                stdDev: v.optimalVols.length >= 1 ? ss.sampleStandardDeviation(v.optimalVols.concat([v.lastOptimalVol]).map((x) => x / 1.0)) : null,
                skewness: v.optimalVols.length >= 2 ? ss.sampleSkewness(v.optimalVols.concat([v.lastOptimalVol]).map((x) => x / 1.0)) : null
            },

            swapPrice: {
                mean: ss.mean(v.swapPrices.concat([v.lastSwapPrice])),
                median: ss.median(v.swapPrices.concat([v.lastSwapPrice])),
                stdDev: v.swapPrices.length >= 1 ? ss.sampleStandardDeviation(v.swapPrices.concat([v.lastSwapPrice])) : null,
                skewness: v.swapPrices.length >= 2 ? ss.sampleSkewness(v.swapPrices.concat([v.lastSwapPrice])) : null
            },

            duration: {
                mean: ss.mean(v.durations.concat([v.lastDuration]).map((x) => x / 1000.0)),
                median: ss.median(v.durations.concat([v.lastDuration]).map((x) => x / 1000.0)),
                stdDev: v.durations.length >= 1 ? ss.sampleStandardDeviation(v.durations.concat([v.lastDuration]).map((x) => x / 1000.0)) : null,
                skewness: v.durations.length >= 2 ? ss.sampleSkewness(v.durations.concat([v.lastDuration]).map((x) => x / 1000.0)) : null
            },

            uniqueOccurences: v.durations.length + 1
        };

        statsData["volPerDelta"] = {
            mean: statsData.optimalVol.mean / statsData.optimalDelta.mean,
            median: statsData.optimalVol.median / statsData.optimalDelta.median,
        };

        statistics.push([k, statsData]);
    }

    return statistics;
}

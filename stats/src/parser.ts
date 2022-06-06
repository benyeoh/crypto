const glob = require("glob");
const path = require("path");
const fs = require("fs");
const assert = require("assert");
const { getPathSpec, getCoinsFromKey, getExchangeIDsFromKey } = require("./path_utils.js");

export function parseTradePaths(inRootDirs, outDirs = null) {

    let mergedPathMappings = {};

    for (let k = 0; k < inRootDirs.length; k++) {
        let inRootDir = inRootDirs[k];
        let outDir = outDirs[k];

        // Fetch all pair files
        const allCoinDirs = glob.sync(path.join(inRootDir, "*")).filter((path) => fs.lstatSync(path).isDirectory());
        for (let i = 0; i < allCoinDirs.length; i++) {
            let coinName = path.basename(allCoinDirs[i]);
            let pathFiles = glob.sync(path.join(allCoinDirs[i], "*.json"))
            pathFiles.sort((a, b) => {
                let aTime = parseInt(a.split(",")[0]);
                let bTime = parseInt(b.split(",")[0]);
                return aTime - bTime;
            });

            //let pathMapping: Map<string, any> = new Map();
            let pathMapping = {};
            for (let j = 0; j < pathFiles.length; j++) {
                try {
                    let allPaths = JSON.parse(fs.readFileSync(pathFiles[j], { encoding: 'utf8', flag: 'r' }));
                    parseOneTimestamp(pathMapping, allPaths);
                } catch (err) {
                    console.log(`Malformed. Skipping ${pathFiles[j]}.`);
                }
            }

            if (coinName in mergedPathMappings) {
                mergedPathMappings[coinName] = mergeTradePaths(mergedPathMappings[coinName], pathMapping);
            } else {
                mergedPathMappings[coinName] = pathMapping;
            }

            if (outDir) {
                let outPath = path.join(outDir, "stats_" + coinName + ".json")
                console.log("Writing to: " + outPath);
                fs.writeFile(outPath, JSON.stringify(pathMapping, null, 4), { encoding: 'utf8' }, (err) => { if (err) { console.log(err); } });
            }
        }
    }

    return mergedPathMappings;
}

export function mergeTradePaths(pathMapping1, pathMapping2) {
    let newPathMapping = JSON.parse(JSON.stringify(pathMapping1));
    for (const [pathKey, prop2] of Object.entries(pathMapping2)) {
        if (pathKey in newPathMapping) {
            let prop1 = newPathMapping[pathKey];

            prop1["durations"] = prop1["durations"].concat(prop2["durations"]);
            prop1["swapPrices"] = prop1["swapPrices"].concat(prop2["swapPrices"]);
            prop1["optimalDeltas"] = prop1["optimalDeltas"].concat(prop2["optimalDeltas"]);
            prop1["optimalVols"] = prop1["optimalVols"].concat(prop2["optimalVols"]);

            prop1["lastOccurences"] += prop2["lastOccurences"];

            if (prop1["lastTimestamp"] >= prop2["lastTimestamp"]) {
                prop1["durations"].push(prop2["lastDuration"]);
                prop1["swapPrices"].push(prop2["lastSwapPrice"]);
                prop1["optimalDeltas"].push(prop2["lastOptimalDelta"]);
                prop1["optimalVols"].push(prop2["lastOptimalVol"]);
            } else {
                prop1["durations"].push(prop1["lastDuration"]);
                prop1["swapPrices"].push(prop1["lastSwapPrice"]);
                prop1["optimalDeltas"].push(prop1["lastOptimalDelta"]);
                prop1["optimalVols"].push(prop1["lastOptimalVol"]);

                prop1["lastDuration"] = prop2["lastDuration"];
                prop1["lastSwapPrice"] = prop2["lastSwapPrice"];
                prop1["lastOptimalDelta"] = prop2["lastOptimalDelta"];
                prop1["lastOptimalVol"] = prop2["lastOptimalVol"];
                prop1["lastTimestamp"] = prop2["lastTimestamp"];

            }
        } else {
            newPathMapping[pathKey] = JSON.parse(JSON.stringify(prop2));
        }
    }

    return newPathMapping;
}

export function parseTradePathsFromFiles(inDirs) {
    let mergedPathMappings = {};

    for (let k = 0; k < inDirs.length; k++) {
        let inDir = inDirs[k];

        const allTradeFiles = glob.sync(path.join(inDir, "stats_*.json"));
        for (let i = 0; i < allTradeFiles.length; i++) {
            let tradePaths = JSON.parse(fs.readFileSync(allTradeFiles[i], { encoding: "utf8", flag: "r" }));
            let coinName = path.basename(allTradeFiles[i]).split(".")[0].split("_")[1];

            if (coinName in mergedPathMappings) {
                mergedPathMappings[coinName] = mergeTradePaths(mergedPathMappings[coinName], tradePaths);
            } else {
                mergedPathMappings[coinName] = tradePaths;
            }
        }
    }

    return mergedPathMappings;
}

export function parseOneTimestamp(mapping, allPaths) {

    let timestamp = allPaths.timestamp;

    for (let i = 0; i < allPaths.paths.length; i++) {
        let path = allPaths.paths[i];
        let { pathKey, pairAddrs } = getPathSpec(path)
        if (!(pathKey in mapping)) {//(!mapping.has(pathKey)) {
            mapping[pathKey] = {
                lastOptimalDelta: path.optimalDelta,
                lastSwapPrice: path.swapPrice,
                lastOptimalVol: path.optimalVol,
                lastOccurences: 1,
                lastDuration: 1,
                lastTimestamp: timestamp,
                durations: [],
                swapPrices: [],
                optimalDeltas: [],
                optimalVols: [],
                pairAddrs: pairAddrs
            };
        } else {
            // Path already defined
            //let pathData = mapping.get(pathKey);
            let pathData = mapping[pathKey];
            const MAX_DURATION = 15000;

            if (timestamp - pathData.lastTimestamp < MAX_DURATION) {
                // Same occurence
                assert(timestamp - pathData.lastTimestamp > 0);
                pathData.lastOptimalDelta = (pathData.lastOptimalDelta * pathData.lastOccurences + path.optimalDelta) / (pathData.lastOccurences + 1);
                pathData.lastSwapPrice = (pathData.lastSwapPrice * pathData.lastOccurences + path.swapPrice) / (pathData.lastOccurences + 1);
                pathData.lastOptimalVol = (pathData.lastOptimalVol * pathData.lastOccurences + path.optimalVol) / (pathData.lastOccurences + 1);
                pathData.lastOccurences += 1;
                pathData.lastDuration += timestamp - pathData.lastTimestamp;
                pathData.lastTimestamp = timestamp;
            } else {
                pathData.swapPrices.push(pathData.lastSwapPrice);
                pathData.optimalDeltas.push(pathData.lastOptimalDelta);
                pathData.durations.push(pathData.lastDuration);
                pathData.optimalVols.push(pathData.lastOptimalVol);

                pathData.lastOptimalDelta = path.optimalDelta;
                pathData.lastOptimalVol = path.optimalVol;
                pathData.lastSwapPrice = path.swapPrice;
                pathData.lastOccurences = 1;
                pathData.lastDuration = 1;
                pathData.lastTimestamp = timestamp;
            }
        }
    }
}

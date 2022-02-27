const glob = require("glob");
const path = require("path");
const fs = require("fs");
const assert = require("assert");

export function parseTradePaths(inRootDir, outDir = null) {
    // Fetch all pair files
    const allCoinDirs = glob.sync(path.join(inRootDir, "*")).filter((path) => fs.lstatSync(path).isDirectory());
    let allPathMappings = {};
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
            let allPaths = JSON.parse(fs.readFileSync(pathFiles[j], { encoding: 'utf8', flag: 'r' }));
            parseOneTimestamp(pathMapping, allPaths);
        }

        allPathMappings[coinName] = pathMapping;
        if (outDir) {
            let outPath = path.join(outDir, "stats_" + coinName + ".json")
            console.log("Writing to: " + outPath);
            fs.writeFile(outPath, JSON.stringify(pathMapping, null, 4), { encoding: 'utf8' }, (err) => { if (err) { console.log(err); } });
        }
    }

    return allPathMappings;
}

export function parseTradePathsFromFiles(inDir) {
    const allTradeFiles = glob.sync(path.join(inDir, "stats_*.json"));
    let allPathMappings = {};
    for (let i = 0; i < allTradeFiles.length; i++) {
        let tradePaths = JSON.parse(fs.readFileSync(allTradeFiles[i], { encoding: "utf8", flag: "r" }));
        let coinName = path.basename(allTradeFiles[i]).split(".")[0].split("_")[1];
        allPathMappings[coinName] = tradePaths;
    }

    return allPathMappings;
}

export function parseOneTimestamp(mapping, allPaths) {

    let timestamp = allPaths.timestamp;

    for (let i = 0; i < allPaths.paths.length; i++) {
        let path = allPaths.paths[i];
        let nodeKey = path.path[0].node.name;
        let edgeKey = "";
        let pairAddrs = [];
        for (let j = 1; j < path.path.length - 1; j++) {
            nodeKey += `,${path.path[j].node.name}`;
            edgeKey += `${path.path[j].edge.exchangeID},`;
            pairAddrs.push([path.path[j].edge.exchangeID, path.path[j].edge.addr]);
        }

        nodeKey += `,${path.path.slice(-1)[0].node.name}`;
        edgeKey += path.path.slice(-1)[0].edge.exchangeID;
        pairAddrs.push([path.path.slice(-1)[0].edge.exchangeID, path.path.slice(-1)[0].edge.addr]);

        let pathKey = nodeKey + "|" + edgeKey;
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
            const MAX_DURATION = 30000;

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

export function getCoinsFromKey(key) {
    return key.split("|")[0].split(",");
}

export function getExchangeIDsFromKey(key) {
    return key.split("|")[1].split(",");
}

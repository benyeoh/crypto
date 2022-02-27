const workerpool = require("workerpool");
const { findTrades } = require("../../pairs_arbitrage/find_trades.js");

function filterPaths(allPaths, coinAvail) {
    let filteredPaths = [];
    for (let i = 0; i < allPaths.length; i++) {
        let skip = false;

        let curPath = allPaths[i];
        let curCoin = curPath.path[0].node.name;
        let lastNetwork = null;
        for (let j = 1; j < curPath.path.length; j++) {
            let thisNetwork = curPath.path[j].edge.exchangeID.split("(")[1].slice(0, -1);
            if (lastNetwork !== thisNetwork) {
                if (!(curCoin in coinAvail) || !(coinAvail[curCoin].includes(thisNetwork))) {
                    // console.log(`curCoin: ${curCoin}, thisNetwork: ${thisNetwork}`);
                    // process.exit();
                    skip = true;
                    break;
                }
            }

            curCoin = curPath.path[j].node.name;
            lastNetwork = thisNetwork;
        }

        if (!skip) {
            filteredPaths.push(curPath);
        }
    }

    return filteredPaths;
}

function workerFindTrades(pairsList, coinID, maxPathLen, minDelta, minLiquidity, coinAvail) {
    let paths = findTrades(pairsList, coinID, maxPathLen, minDelta, minLiquidity);
    return filterPaths(paths, coinAvail);
}

workerpool.worker({
    findTrades: workerFindTrades
});
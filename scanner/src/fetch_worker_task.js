const workerpool = require("workerpool");
const { findTrades } = require("../../pairs_arbitrage/find_trades.js");

function filterPaths(allPaths, coinAvail, coinStarts) {
    let filteredPaths = [];
    for (let i = 0; i < allPaths.length; i++) {
        let curPath = allPaths[i];

        let firstCoinName = curPath.path[0].node.name;
        let firstCoinPeg = curPath.path[0].node.peg;

        // Only consider the coin if it's in the list of coins that are available for trades
        // If we also only consider pegged coins, then we check that the coin is not
        // the same coin but pegged to the same underlying
        let lastCoinName = curPath.path[curPath.path.length - 1].node.name;
        let lastCoinPeg = curPath.path[curPath.path.length - 1].node.peg;
        if (lastCoinName in coinStarts &&
            (!coinStarts[firstCoinName]["pegOnly"] || (firstCoinPeg === null) || (lastCoinPeg === firstCoinPeg && lastCoinName !== firstCoinName))) {
            let skip = false;

            let curCoin = firstCoinName;
            let lastNetwork = null;
                
            for (let j = 1; j < curPath.path.length; j++) {
                let pathNode = curPath.path[j];
                let outputTokenInfo = pathNode["node"];
                let pairInfo = pathNode["edge"];
                let inputToken = pairInfo.token1;
                let outputToken = pairInfo.token2;
                
                if (outputTokenInfo.name === pairInfo.token1.name) {
                    // Swap order
                    inputToken = pairInfo.token2;
                    outputToken = pairInfo.token1;
                }

                let thisNetwork = pairInfo.exchangeID.split("(")[1].slice(0, -1);
                if (lastNetwork !== thisNetwork || inputToken.name !== curCoin) {
                    if (!(inputToken.name in coinAvail) || !(coinAvail[inputToken.name].includes(thisNetwork)) ||
                        !(curCoin in coinAvail) || !(coinAvail[curCoin].includes(thisNetwork))) {
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
                if (coinAvail[lastCoinName].includes(lastNetwork)) {
                    filteredPaths.push(curPath);
                }
            }

        }
    }

    return filteredPaths;
}

function workerFindTrades(pairsList, coinID, coinAvail, coinStarts) {
    //console.log(JSON.stringify(pairsList, null, 4));
    let paths = findTrades(pairsList, coinID, coinStarts[coinID]["maxPathLen"], coinStarts[coinID]["minDelta"], coinStarts[coinID]["minLiquidity"]);
    return filterPaths(paths, coinAvail, coinStarts);
}

workerpool.worker({
    findTrades: workerFindTrades
});
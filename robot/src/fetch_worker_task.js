const workerpool = require("workerpool");
const { findTrades } = require("../../pairs_arbitrage/find_trades.js");

function workerFindTrades(pairsList, coinID, maxPathLen, minDelta, minLiquidity, coinAvail) {
    let paths = findTrades(pairsList, coinID, maxPathLen, minDelta, minLiquidity);
    return paths;
}

workerpool.worker({
    findTrades: workerFindTrades
});
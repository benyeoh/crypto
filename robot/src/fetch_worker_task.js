const workerpool = require("workerpool");
const { findTrades } = require("../../pairs_arbitrage/find_trades.js");

function workerFindTrades(pairsList, coinID, maxPathLen, minDelta, minLiquidity) {
    return findTrades(pairsList, coinID, maxPathLen, minDelta, minLiquidity);
}

workerpool.worker({
    findTrades: workerFindTrades
});
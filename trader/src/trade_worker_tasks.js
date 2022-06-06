const workerpool = require("workerpool");
const { filterTrades } = require("./trade_filter.js");
const { findRiskyPairs } = require("./trade_utils.js");

function workerTradeFilter(pathList, acctState, minNumCrossNetwork, topK, moratoriumPairs, riskyPairs, blackOrWhiteList, timestamp) {
    return filterTrades(pathList, acctState, minNumCrossNetwork, topK, moratoriumPairs, riskyPairs, blackOrWhiteList, timestamp);;
}

function workerFindRiskyPairs(pathList) {
    return findRiskyPairs(pathList);
}

workerpool.worker({
    filterTrades: workerTradeFilter,
    findRiskyPairs: workerFindRiskyPairs
});
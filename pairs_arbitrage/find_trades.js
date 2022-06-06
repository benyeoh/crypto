#!/usr/bin/env -S npx ts-node
"use strict";
exports.__esModule = true;
exports.findTrades = void 0;
var fs = require("fs");
var glob = require("glob");
var commander_1 = require("commander");
var cpmm = require("./src/cpmm");
var graph = require("./src/graph");
var traverse = require("./src/traverse");
function findTrades(pairsList, coinID, maxPathLen, minDelta, minLiquidity) {
    // Create a graph model of all pairs and find all possible swap paths
    var pairsGraph = new graph.Graph();
    var traverser = new traverse.BFSCycleTraverser(maxPathLen);
    for (var i = 0; i < pairsList.length; i++) {
        graph.updateGraphFromPairs(pairsList[i], pairsGraph);
    }
    //let start = Date.now();
    traverser.traverse(pairsGraph, coinID);
    var paths = traverser.paths;
    //let elapsed = Date.now() - start;
    // Find potentially profitable paths
    //start = Date.now();
    var profitPaths = [];
    for (var i = 0; i < paths.length; i++) {
        var model = new cpmm.ApproxCPMM(paths[i]);
        var optVol = model.computeOptimalVolume();
        var optDelta = model.computeDelta(optVol);
        var liquidity = model.computeLiquidity();
        // console.log(`${coinID} ${optDelta} ${liquidity} ${optVol}`);
        if (optVol > 0 && liquidity > minLiquidity && optDelta > minDelta) {
            var arbFactor = model.computeArbitrageFactor(optVol);
            var swapPrice = model.computeSwapPrice();
            var pathSpec = {
                path: paths[i],
                optimalVol: optVol,
                optimalDelta: optDelta,
                thresholdDelta: minDelta,
                swapPrice: swapPrice,
                liquidity: liquidity,
                arbFactor: arbFactor
            };
            profitPaths.push(pathSpec);
        }
    }
    //let elapsed2 = Date.now() - start;
    //console.log(`${coinID} ---------------------------------- 1: ${elapsed}, 2: ${elapsed2}, paths: ${paths.length}`)
    // Sort according to ascending delta
    profitPaths.sort(function (a, b) { return a.optimalDelta - b.optimalDelta; });
    //console.log(`${coinID} ---------------------------------- Number paths: ${profitPaths.length}`)
    return profitPaths;
}
exports.findTrades = findTrades;
if (require.main === module) {
    commander_1.program.requiredOption('-p, --pairs <path to json>', "Input path to pairs data json. Accepts >1 files with wildcards.");
    commander_1.program.option('-c, --coin <string>', "Name of the coin to find trades. Default is USDC.", "USDC");
    commander_1.program.option('-l, --maxPathLen <number>', "Maximum path length for trades. Default is 3.", "3");
    commander_1.program.option('-n, --topNumPaths <number>', "Filters in only top n paths. Default is 10.", "10");
    commander_1.program.option('-d, --minDelta <number>', "Minimum delta to consider at the optimal trade volume. Default is 0.", "0");
    commander_1.program.option('-k, --minLiquidity <number>', "Minimum effective liquidity to consider for trades volume. Default is 0.", "0");
    commander_1.program.option('-o, --output <path to json>', "Output filepath to save trade path.");
    commander_1.program.parse();
    var options = commander_1.program.opts();
    // Fetch all pair files
    var allPairFiles = glob.sync(options.pairs);
    var pairsList = [];
    // Create a graph model of all pairs and find all possible swap paths
    for (var i = 0; i < allPairFiles.length; i++) {
        var pairs = JSON.parse(fs.readFileSync(allPairFiles[i], "utf8"));
        pairsList.push(pairs);
    }
    var profitPaths = findTrades(pairsList, options.coin, parseInt(options.maxPathLen), parseFloat(options.minDelta), parseFloat(options.minLiquidity));
    console.log(JSON.stringify(profitPaths.slice(-1), null, 4));
    if (options.output) {
        console.log("Writing to: ".concat(options.output));
        fs.writeFileSync(options.output, JSON.stringify(profitPaths.slice(-parseInt(options.topNumPaths)), null, 4), "utf8");
    }
    console.log("Number of +ve delta paths: ".concat(profitPaths.length));
}

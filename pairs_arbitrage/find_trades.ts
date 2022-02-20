#!/usr/bin/env -S npx ts-node
const fs = require("fs");
const glob = require("glob");

import { program } from "commander";
import * as cpmm from "./src/cpmm";
import * as graph from "./src/graph";
import * as traverse from "./src/traverse";

export function findTrades(pairsList, coinID, maxPathLen, minDelta, minLiquidity) {
    // Create a graph model of all pairs and find all possible swap paths
    const pairsGraph = new graph.Graph();
    const traverser = new traverse.BFSCycleTraverser(maxPathLen);
    for (let i = 0; i < pairsList.length; i++) {
        graph.updateGraphFromPairs(pairsList[i], pairsGraph);
    }

    traverser.traverse(pairsGraph, coinID);
    let paths = traverser.paths;

    // Find potentially profitable paths
    let profitPaths = [];
    for (let i = 0; i < paths.length; i++) {
        let model = new cpmm.CPMM(paths[i]);
        let swapPrice = model.computeSwapPrice();
        let optVol = model.computeOptimalVolume();
        let optDelta = model.computeDelta(optVol);
        let liquidity = model.computeLiquidity();

        if (optVol > 0 && liquidity > minLiquidity && optDelta > minDelta) {
            let pathSpec = {
                path: paths[i],
                optimalVol: optVol,
                optimalDelta: optDelta,
                swapPrice: swapPrice,
                liquidity: liquidity
            };

            profitPaths.push(pathSpec)
        }
    }

    // Sort according to ascending delta
    profitPaths.sort((a, b) => a.optimalDelta - b.optimalDelta);
    return profitPaths;
}

if (require.main === module) {
    program.requiredOption('-p, --pairs <path to json>', "Input path to pairs data json. Accepts >1 files with wildcards.");
    program.option('-c, --coin <string>', "Name of the coin to find trades. Default is USDC.", "USDC");
    program.option('-l, --maxPathLen <number>', "Maximum path length for trades. Default is 3.", "3");
    program.option('-n, --topNumPaths <number>', "Filters in only top n paths. Default is 10.", "10");
    program.option('-d, --minDelta <number>', "Minimum delta to consider at the optimal trade volume. Default is 0.", "0");
    program.option('-k, --minLiquidity <number>', "Minimum effective liquidity to consider for trades volume. Default is 0.", "0");
    program.option('-o, --output <path to json>', "Output filepath to save trade path.");

    program.parse()
    const options = program.opts()

    // Fetch all pair files
    const allPairFiles = glob.sync(options.pairs);
    let pairsList = [];
    // Create a graph model of all pairs and find all possible swap paths
    for (let i = 0; i < allPairFiles.length; i++) {
        let pairs = JSON.parse(fs.readFileSync(allPairFiles[i], "utf8"));
        pairsList.push(pairs);
    }

    let profitPaths = findTrades(pairsList,
        options.coin,
        parseInt(options.maxPathLen),
        parseFloat(options.minDelta),
        parseFloat(options.minLiquidity));

    console.log(JSON.stringify(profitPaths.slice(-1), null, 4));

    if (options.output) {
        console.log(`Writing to: ${options.output}`);
        fs.writeFileSync(options.output, JSON.stringify(profitPaths.slice(-parseInt(options.topNumPaths)), null, 4), "utf8");
    }

    console.log(`Number of +ve delta paths: ${profitPaths.length}`);
}
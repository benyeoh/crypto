#!/usr/bin/env -S npx ts-node
const fs = require("fs");
//const bignumber = require("bignumber.js");
const glob = require("glob");

import { program } from "commander";
import * as cpmm from "./src/cpmm";
import * as graph from "./src/graph";
import * as traverse from "./src/traverse";

program.requiredOption('-p, --pairs <path to json>', "Input path to pairs data json. Accepts >1 files with wildcards.");
program.option('-c, --coin <string>', "Name of the coin to find trades. Default is USDC.", "USDC");
program.option('-l, --maxPathLen <number>', "Maximum path length for trades. Default is 3.", "3");
program.option('-d, --minDelta <number>', "Minimum delta to consider at the optimal trade volume. Default is 0.", "0");
program.option('-k, --minLiquidity <number>', "Minimum effective liquidity to consider for trades volume. Default is 0.", "0");
program.option('-o, --output <path to json>', "Output filepath to save trade path.");

program.parse()
const options = program.opts()

// Fetch all pair files
const allPairFiles = glob.sync(options.pairs);

// Create a graph model of all pairs and find all possible swap paths
const pairsGraph = new graph.Graph();
const traverser = new traverse.BFSCycleTraverser(parseInt(options.maxPathLen));
for (let i = 0; i < allPairFiles.length; i++) {
    let pairs = JSON.parse(fs.readFileSync(allPairFiles[i], "utf8"));
    graph.updateGraphFromPairs(pairs, pairsGraph);
}
traverser.traverse(pairsGraph, options.coin);
let paths = traverser.paths;

// Find potentially profitable paths
const minDelta = parseFloat(options.minDelta);
const minLiquidity = parseFloat(options.minLiquidity);
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
console.log(JSON.stringify(profitPaths.slice(-3), null, 4));

if (options.output) {
    console.log(`Writing to: ${options.output}`);
    fs.writeFileSync(options.output, JSON.stringify(profitPaths, null, 4), "utf8");
}

console.log(`Number of +ve delta paths vs total: ${profitPaths.length} / ${paths.length}`);

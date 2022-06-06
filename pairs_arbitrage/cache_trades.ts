#!/usr/bin/env -S npx ts-node
import { assert } from "console";
import * as cpmm from "./src/cpmm";
import * as graph from "./src/graph";
import * as traverse from "./src/traverse";

export function precomputeTrades(pairsList, coinID, maxPathLen) {
    // NOTE: We use bitshift ops later to flag whether a pairs list exist 
    assert(pairsList.length < 32);

    // Create a graph model of all pairs and find all possible swap paths
    const pairsGraph = new graph.Graph();
    const traverser = new traverse.BFSCycleTraverser(maxPathLen);
    for (let i = 0; i < pairsList.length; i++) {
        let pairsInfo = pairsList[i];
        for (let j = 0; j < pairsInfo.pairs.length; j++) {
            let pair = pairsInfo.pairs[j];
            pair["availFlag"] = i;
            pair["pairIdx"] = j;
        }

        graph.updateGraphFromPairs(pairsInfo, pairsGraph);
    }

    traverser.traverse(pairsGraph, coinID);
    let paths = traverser.paths;

    let precomputedPaths = [];
    for (let i = 0; i < paths.length; i++) {
        let tokenPath = paths[i];
        let reqAvailFlags = 0;
        for (let j = 1; j < tokenPath.length; j++) {
            reqAvailFlags |= (1 << tokenPath[j]["edge"]["availFlag"]);
        }

        // TODO: Optimize by removing un-needed information from edge
        precomputedPaths.push({
            paths: tokenPath,
            reqAvailFlags
        });
    }

    return precomputedPaths;
}

export function findCachedTrades(pairsList, precomputedPaths, minDelta, minLiquidity) {
    let availFlags = 0;
    for (let i = 0; i < pairsList.length; i++) {
        if (pairsList[i] !== null) {
            availFlags |= (1 << i);
        }
    }

    let profitPaths = [];
    for (let i = 0; i < precomputedPaths.length; i++) {
        let cachedPath = precomputedPaths[i];
        if ((cachedPath.reqAvailFlags & availFlags) === cachedPath.reqAvailFlags) {
            // This path has updated entries
            let paths = [cachedPath.paths[0]];
            for (let j = 1; j < cachedPath.paths.length; j++) {
                let pairsInfo = pairsList[cachedPath.paths[j].edge.availFlag];
                let idx = cachedPath.paths[j].edge.pairIdx;
                paths.push({
                    node: cachedPath.paths[j].node,
                    edge: pairsInfo.pairs[idx]
                });
            }

            let model = new cpmm.ApproxCPMM(paths);
            //let realmodel = new cpmm.CPMM(paths);

            //console.log(`Liquidity: ${realmodel.computeLiquidity().toNumber()} vs ${approxModel.computeLiquidity()}`);
            let optVol = model.computeOptimalVolume();
            //console.log(`OptVol: ${realmodel.computeOptimalVolume().toNumber()} vs ${approxModel.computeOptimalVolume()}`);
            let optDelta = model.computeDelta(optVol);
            let liquidity = model.computeLiquidity();
            // console.log(`${coinID} ${optDelta} ${liquidity} ${optVol}`);
            //console.log(liquidity);
            if (optVol > 0 && liquidity > minLiquidity && optDelta > minDelta) {
                //let model = new cpmm.CPMM(paths);
                // let optVol = model.computeOptimalVolume().toNumber();
                // let optDelta = model.computeDelta(optVol).toNumber();
                // let liquidity = model.computeLiquidity().toNumber();
                let arbFactor = model.computeArbitrageFactor(optVol);
                let swapPrice = model.computeSwapPrice();
                let pathSpec = {
                    path: paths,
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
    }

    // Sort according to ascending delta
    profitPaths.sort((a, b) => a.optimalDelta - b.optimalDelta);
    return profitPaths;

}
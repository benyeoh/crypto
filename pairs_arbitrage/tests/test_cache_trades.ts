#!/usr/bin/env -S npx ts-node
const assert = require("assert");
const fs = require("fs");

import { findTrades } from "../find_trades";
import { precomputeTrades, findCachedTrades } from "../cache_trades"

let pairsList1 = JSON.parse(fs.readFileSync(__dirname + "/pairs_arbitrum_sushiswap_v2.json"));
let pairsList2 = JSON.parse(fs.readFileSync(__dirname + "/pairs_fantom_spookyswap_v2.json"));
let pairsList3 = JSON.parse(fs.readFileSync(__dirname + "/pairs_polygon_sushiswap_v2.json"));
let pairsList4 = JSON.parse(fs.readFileSync(__dirname + "/pairs_polygon_quickswap_v2.json"));
let pairsList5 = JSON.parse(fs.readFileSync(__dirname + "/pairs_binancesc_pancakeswap_v2.json"));
let pairsList6 = JSON.parse(fs.readFileSync(__dirname + "/pairs_avalanche_pangolin_v2.json"));
let pairsList7 = JSON.parse(fs.readFileSync(__dirname + "/pairs_fantom_sushiswap_v2.json"));

console.log("Running findTrades ...")
let allPairsList = [pairsList1, pairsList2, pairsList3, pairsList4, pairsList5, pairsList6, pairsList7];

let start = Date.now();
let trades1 = findTrades(allPairsList, "USDC", 4, 1, 0);
console.log(`${Date.now() - start}`);

console.log("Precomputing ...")
start = Date.now();
let preTrades = precomputeTrades(allPairsList, "USDC", 4);
console.log(`${Date.now() - start}`);

console.log("Running cached version ...")
start = Date.now();
let trades2 = findCachedTrades(allPairsList, preTrades, 1, 0);
console.log(`${Date.now() - start}`);

//console.log(trades1);
//console.log(JSON.stringify(trades2, null, 4));

console.log(`Num trades: ${trades1.length} vs ${trades2.length}`);
assert(trades1.length === trades2.length);

for (let i = 0; i < trades1.length; i++) {
    let trade1 = trades1[i];
    let trade2 = trades2[i];

    assert(trade1.path[0].node.name === trade2.path[0].node.name);

    for (let j = 1; j < trade1.path.length; j++) {
        let entry1 = trade1.path[j];
        let entry2 = trade2.path[j];

        assert(entry1.node.name === entry2.node.name);
        let edge1 = entry1.edge;
        let edge2 = entry2.edge;
        assert(edge1.addr === edge2.addr);
        assert(edge1.token1.name === edge2.token1.name);
        assert(edge1.token2.name === edge2.token2.name);
        assert(edge1.token1Reserve === edge2.token1Reserve);
        assert(edge1.token2Reserve === edge2.token2Reserve);
        assert(edge1.timestamp === edge2.timestamp);
        //console.log(`${edge1.timestamp} vs ${edge2.timestamp}`);
    }

    assert(trade1["optimalVol"] === trade2["optimalVol"]);
    assert(trade1["optimalDelta"] === trade2["optimalDelta"]);
    assert(trade1["thresholdDelta"] === trade2["thresholdDelta"]);
    assert(trade1["swapPrice"] === trade2["swapPrice"]);
    assert(trade1["liquidity"] === trade2["liquidity"]);
    assert(trade1["arbFactor"] === trade2["arbFactor"]);
    //console.log(`${ trade1["arbFactor"]} vs ${ trade2["arbFactor"]}`);
}

console.log("Done!");
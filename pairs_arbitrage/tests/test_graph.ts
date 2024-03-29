#!/usr/bin/env -S npx ts-node
import * as graph from "../src/graph";
import * as traverse from "../src/traverse";
const assert = require("assert");

const test_pairs = {
    "name": "Uniswap V2",
    "factory": "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    "network": "Ethereum",
    "pairs": [
        {
            "addr": "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc",
            "token1": {
                "name": "USDC",
                "addr": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                "decimals": 6,
                "peg": "USD"
            },
            "token2": {
                "name": "ETH",
                "addr": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                "decimals": 18,
                "peg": "ETH"
            },
            "token1Reserve": "107882978.172857",
            "token2Reserve": "41492.995329546261157873",
            "timestamp": 1643887343,
            "rateA": 0.997,
            "rateB": 1
        },

        {
            "addr": "0xBb2b8038a1640196FbE3e38816F3e67Cba72D940",
            "token1": {
                "name": "BTC",
                "addr": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
                "decimals": 8,
                "peg": "BTC"
            },
            "token2": {
                "name": "WETH",
                "addr": "bogus",
                "decimals": 18,
                "peg": "ETH"
            },
            "token1Reserve": "398.97628411",
            "token2Reserve": "5581.183277624102682414",
            "timestamp": 1643886084,
            "rateA": 0.997,
            "rateB": 1
        },

        {
            "addr": "0x004375Dff511095CC5A197A54140a24eFEF3A416",
            "token1": {
                "name": "WBTC",
                "addr": "bogus2",
                "decimals": 8,
                "peg": "BTC"
            },
            "token2": {
                "name": "USDC",
                "addr": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                "decimals": 6,
                "peg": "USD"
            },
            "token1Reserve": "6.84848333",
            "token2Reserve": "250377.037837",
            "timestamp": 1643884223,
            "rateA": 0.997,
            "rateB": 1
        }
    ]
}

let g = new graph.Graph();
graph.updateGraphFromPairs(test_pairs, g);
let cycleTraverser = new traverse.BFSCycleTraverser();
cycleTraverser.traverse(g, "USDC");
console.log(JSON.stringify(cycleTraverser.paths, null, 4));

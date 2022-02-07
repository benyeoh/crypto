#!/usr/bin/env -S npx ts-node
const fs = require("fs");

import { program } from "commander";
import { fetchUniV2 } from "./src/utils";

export function fetch(coins, pairs, outPairsPath) {
    fetchUniV2(coins,
        pairs,
        outPairsPath,
        '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
        "https://polygon-mainnet.g.alchemy.com/v2/JHYlcNi99cWxxt5nvtmb1LR1qyITaYVT", // "https://polygon-rpc.com/");
        "Polygon",
        "QuickSwap V2");
}

if (require.main === module) {
    program.option('-c, --coins <path to json>', "Input path to coins json");
    program.option('-p, --pairs <path to json>', "Input/output path to pairs data json", './pairs_poly_quickv2.json')
    program.parse()
    const options = program.opts()

    let pairs, coins;
    try {
        coins = options.coins !== undefined && JSON.parse(fs.readFileSync(options.coins, "utf8"));
    } catch (err) {
        if (err?.code === 'ENOENT') {
            console.log(`Coins data file not found: ${options.coins}. Skipping coins fetch.`);
        } else {
            throw err;
        }
    }
    try {
        pairs = JSON.parse(fs.readFileSync(options.pairs, "utf8")).pairs;
    } catch (err) {
        if (err?.code === 'ENOENT') {
            console.log(`Pairs data file not found: ${options.pairs}.`);
        } else {
            throw err;
        }
    }

    fetch(coins, pairs, options.pairs);
}

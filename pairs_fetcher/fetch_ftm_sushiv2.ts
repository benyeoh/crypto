#!/usr/bin/env -S npx ts-node
const fs = require("fs");

import { program } from "commander";
import { ethers } from "ethers";
import { DEXFetcherUniV2 } from "./src/dex_fetcher"
import { filterCoins } from "./src/utils";

export async function fetch(coins, pairs, outPairsPath) {
    const uniV2DEXFactoryAddr = '0xc35DADB65012eC5796536bD9864eD8773aBc74C4';
    const provider = new ethers.providers.JsonRpcProvider("https://ftmrpc.ultimatenodes.io/");//"https://rpc.ftm.tools/");

    let fetcher = new DEXFetcherUniV2(provider)
    if (coins) {
        coins = filterCoins(coins, "fantom");
        console.log("Fetching pairs ...")
        pairs = await fetcher.fetchPairs(coins, uniV2DEXFactoryAddr)
        console.log(pairs)
    }

    console.log("Fetching pair params ...")
    pairs = await fetcher.updatePairs(pairs)
    console.log(pairs.slice(-3));

    const outPairs = {
        name: "SushiSwap V2",
        factory: uniV2DEXFactoryAddr,
        network: "Fantom",
        pairs: pairs
    }

    fs.writeFile(outPairsPath, JSON.stringify(outPairs, null, 4), "utf8", (err) => {
        err && console.log(err);
        console.log(`Done: ${outPairsPath}. Num Pairs: ${outPairs.pairs.length}`)
    });
}

if (require.main === module) {
    program.option('-c, --coins <path to json>', "Input path to coins json");
    program.option('-p, --pairs <path to json>', "Input/output path to pairs data json", './pairs_ftm_sushiv2.json')
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

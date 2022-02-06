#!/usr/bin/env -S npx ts-node
const fs = require("fs");
const path = require("path");

import { program } from "commander";
import { ethers } from "ethers";
import { DEXFetcherUniV2 } from "./src/dex_fetcher";
import * as ethUniV2 from "./fetch_eth_univ2";
import * as ftmSpooky from "./fetch_ftm_spooky";
import * as ftmSushiV2 from "./fetch_ftm_sushiv2";
import * as polyQuick from "./fetch_poly_quick";
import * as polySushiV2 from "./fetch_poly_sushiv2";

function readPairs(pairsPath) {
    let pairs;

    try {
        pairs = JSON.parse(fs.readFileSync(pairsPath, "utf8")).pairs;
    } catch (err) {
        if (err?.code === 'ENOENT') {
            console.log(`Pairs data file not found: ${pairsPath}.`);
        } else {
            throw err;
        }
    }

    return pairs;
}

async function fetch(coins, pairsDir, outPairsDir) {
    let pairsPath = path.join(pairsDir, "pairs_ftm_spooky.json");
    ftmSpooky.fetch(coins, readPairs(pairsPath), pairsPath);

    pairsPath = path.join(pairsDir, "pairs_ftm_sushiv2.json");
    ftmSushiV2.fetch(coins, readPairs(pairsPath), pairsPath);

    pairsPath = path.join(pairsDir, "pairs_poly_quick.json");
    polyQuick.fetch(coins, readPairs(pairsPath), pairsPath);

    pairsPath = path.join(pairsDir, "pairs_poly_sushiv2.json");
    polySushiV2.fetch(coins, readPairs(pairsPath), pairsPath);

    pairsPath = path.join(pairsDir, "pairs_eth_univ2.json");
    ethUniV2.fetch(coins, readPairs(pairsPath), pairsPath);
}

program.option('-c, --coins <path to json>', "Input path to coins json");
program.option('-p, --pairsDir <path to directory>', "Input/output directory to pairs data json", './')
program.parse()
const options = program.opts()

let coins;
try {
    coins = options.coins !== undefined && JSON.parse(fs.readFileSync(options.coins, "utf8"));
} catch (err) {
    if (err?.code === 'ENOENT') {
        console.log(`Coins data file not found: ${options.coins}. Skipping coins fetch.`);
    } else {
        throw err;
    }
}

fetch(coins, options.pairsDir, options.pairsDir);

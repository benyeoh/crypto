#!/usr/bin/env -S npx ts-node
const fs = require("fs");

import { program } from "commander";
import { fetchUniV2 } from "./src/utils";

export const DEF_PAIRS_PATH = "pairs_eth_univ2.json";
export const NET_NAME = "Ethereum";
export const DEX_NAME = "Uniswap V2";

const FACTORY_ADDR = '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f';
const RPC_NETWORKS = ["https://mainnet.infura.io/v3/6bcbb57004284277a354afb84fddda50"];
let curNetIdx = 0;

export function fetch(coins, pairs, outPairsPath) {
    return fetchUniV2(coins,
        pairs,
        outPairsPath,
        FACTORY_ADDR,
        RPC_NETWORKS[curNetIdx],
        NET_NAME,
        DEX_NAME).catch((err) => {
            console.error(`Failed RPC: ${RPC_NETWORKS[curNetIdx]}`);
            curNetIdx += 1;
            curNetIdx %= RPC_NETWORKS.length;
            console.error(`Switching next time to RPC: ${RPC_NETWORKS[curNetIdx]}`);
            throw err;
        });
}

if (require.main === module) {
    program.option('-c, --coins <path to json>', "Input path to coins json");
    program.option('-p, --pairs <path to json>', "Input/output path to pairs data json", `./${DEF_PAIRS_PATH}`)
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

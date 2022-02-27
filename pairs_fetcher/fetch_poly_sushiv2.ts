#!/usr/bin/env -S npx ts-node
const fs = require("fs");

import { program } from "commander";
import { fetchUniV2 } from "./src/utils";

export const DEF_PAIRS_PATH = "pairs_poly_sushiv2.json";
export const NET_NAME = "Polygon";
export const DEX_NAME = "SushiSwap V2";

const FACTORY_ADDR = '0xc35DADB65012eC5796536bD9864eD8773aBc74C4';
// Private rpcs:
// https://polygon-mainnet.g.alchemy.com/v2/JHYlcNi99cWxxt5nvtmb1LR1qyITaYVT (alchemy)
// https://rpc-mainnet.maticvigil.com/v1/9230747609c72f81fb32d1b70b8c8791fcda9e18 (matic vigil)
// https://speedy-nodes-nyc.moralis.io/0addbe156c5d6b97351c65cb/polygon/mainnet (moralis)
const RPC_NETWORKS = ["https://rpc-mainnet.matic.today", "https://rpc-mainnet.matic.quiknode.pro", "https://matic-mainnet-full-rpc.bwarelabs.com/", "https://polygon-rpc.com/"];
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
            console.log(`Coins data file not found: ${options.coins}.Skipping coins fetch.`);
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

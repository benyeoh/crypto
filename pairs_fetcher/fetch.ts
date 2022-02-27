#!/usr/bin/env -S npx ts-node
const fs = require("fs");
const path = require("path");

import { program } from "commander";
import * as ethUniV2 from "./fetch_eth_univ2";
import * as ftmSpooky from "./fetch_ftm_spookyv2";
import * as ftmSushiV2 from "./fetch_ftm_sushiv2";
import * as polyQuick from "./fetch_poly_quickv2";
import * as polySushiV2 from "./fetch_poly_sushiv2";
import * as arbiSushiV2 from "./fetch_arbi_sushiv2";
import * as polyPlasma from "./fetch_poly_plasmav2";
import * as bscPancakeV2 from "./fetch_bsc_pancakev2";
import * as cexGemini from "./fetch_gem_gemini";

function readPairs(pairsPath) {
    let pairs;
    if (pairsPath) {
        try {
            pairs = JSON.parse(fs.readFileSync(pairsPath, "utf8")).pairs;
        } catch (err) {
            if (err?.code === 'ENOENT') {
                console.log(`Pairs data file not found: ${pairsPath}.`);
            } else {
                throw err;
            }
        }
    }

    return pairs;
}

export const NAME_TO_EXCHANGE_MAP = {
    "ftm": [ftmSpooky, ftmSushiV2],
    "poly": [polySushiV2, polyQuick],// polyPlasma],
    "gem": [cexGemini],
    "bsc": [bscPancakeV2],
    "arbi": [arbiSushiV2],
    "eth": [ethUniV2]
}

export function fetchOne(module, coins, pairsOrDir, outPairsDir) {
    let pairs = typeof (pairsOrDir) === "string" ? readPairs(path.join(pairsOrDir, module.DEF_PAIRS_PATH)) : pairsOrDir[module.DEX_NAME + "/" + module.NET_NAME]?.pairs;
    let outPairsPath = outPairsDir ? path.join(outPairsDir, module.DEF_PAIRS_PATH) : null;
    return module.fetch(coins, pairs, outPairsPath);
}

export async function fetch(coins, pairsOrDir, outPairsDir, networks) {

    let promises = [];
    for (let i = 0; i < networks.length; i++) {
        if (networks[i] in NAME_TO_EXCHANGE_MAP) {
            let exchanges = NAME_TO_EXCHANGE_MAP[networks[i]]
            for (let j = 0; j < exchanges.length; j++) {
                promises.push(fetchOne(exchanges[j], coins, pairsOrDir, outPairsDir));
            }
        }
    }

    return await Promise.all(promises);
}

if (require.main === module) {
    program.option('-c, --coins <path to json>', "Input path to coins json");
    program.option('-p, --pairsDir <path to directory>', "Input/output directory to pairs data json", './')
    program.option('-n, --networks <comma delimted string>', "The networks/chains to look at. (poly, eth, ftm, arbi, bsc, gem)", "poly,ftm,arbi,bsc,gem")
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

    fetch(coins, options.pairsDir, options.pairsDir, options.networks.split(",")).then(() => { console.log("\nDone fetching!\n"); })
}
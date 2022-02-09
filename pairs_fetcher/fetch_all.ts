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

async function fetch(coins, pairsDir, outPairsDir, networks) {

    let pairsPath, outPairsPath;
    if (networks.includes("ftm")) {
        let pairsPath = path.join(pairsDir, "pairs_ftm_spookyv2.json");
        let outPairsPath = path.join(outPairsDir, "pairs_ftm_spookyv2.json");
        ftmSpooky.fetch(coins, readPairs(pairsPath), outPairsPath);
    }
    // pairsPath = path.join(pairsDir, "pairs_poly_plasmav2.json");
    // outPairsPath = path.join(outPairsDir, "pairs_poly_plasmav2.json");
    // polyPlasma.fetch(coins, readPairs(pairsPath), pairsPath);

    if (networks.includes("poly")) {
        pairsPath = path.join(pairsDir, "pairs_poly_quickv2.json");
        outPairsPath = path.join(outPairsDir, "pairs_poly_quickv2.json");
        polyQuick.fetch(coins, readPairs(pairsPath), outPairsPath);
    }

    if (networks.includes("ftm")) {
        pairsPath = path.join(pairsDir, "pairs_ftm_sushiv2.json");
        outPairsPath = path.join(outPairsDir, "pairs_ftm_sushiv2.json");
        ftmSushiV2.fetch(coins, readPairs(pairsPath), outPairsPath);
    }

    if (networks.includes("bsc")) {
        pairsPath = path.join(pairsDir, "pairs_bsc_pancakev2.json");
        outPairsPath = path.join(outPairsDir, "pairs_bsc_pancakev2.json");
        bscPancakeV2.fetch(coins, readPairs(pairsPath), outPairsPath);
    }

    if (networks.includes("arbi")) {
        pairsPath = path.join(pairsDir, "pairs_arbi_sushiv2.json");
        outPairsPath = path.join(outPairsDir, "pairs_arbi_sushiv2.json");
        arbiSushiV2.fetch(coins, readPairs(pairsPath), outPairsPath);
    }

    if (networks.includes("poly")) {
        pairsPath = path.join(pairsDir, "pairs_poly_sushiv2.json");
        outPairsPath = path.join(outPairsDir, "pairs_poly_sushiv2.json");
        polySushiV2.fetch(coins, readPairs(pairsPath), outPairsPath);
    }

    if (networks.includes("eth")) {
        pairsPath = path.join(pairsDir, "pairs_eth_univ2.json");
        outPairsPath = path.join(outPairsDir, "pairs_eth_univ2.json");
        ethUniV2.fetch(coins, readPairs(pairsPath), outPairsPath);
    }
}

program.option('-c, --coins <path to json>', "Input path to coins json");
program.option('-p, --pairsDir <path to directory>', "Input/output directory to pairs data json", './')
program.option('-n, --networks <comma delimted string>', "The networks/chains to look at. (poly, eth, ftm, arbi, bsc)", "poly,ftm,arbi,bsc")
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

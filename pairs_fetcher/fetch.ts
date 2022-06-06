#!/usr/bin/env -S npx ts-node
const fs = require("fs");
const path = require("path");
const HJSON = require("hjson");

import { program } from "commander";

// export const NAME_TO_EXCHANGE_MAP = {
//     "ftm": [ftmSpooky, ftmSushiV2],
//     "poly": [polySushiV2, polyQuick],// polyPlasma],
//     "gem": [cexGemini],
//     "bsc": [bscPancakeV2],
//     "arbi": [arbiSushiV2],
//     "eth": [ethUniV2]
// }

export class FetchModule {
    private nameToExchMap: Object;

    constructor(fetchSpec: Object) {
        this.nameToExchMap = {};

        for (const [networkID, networkProp] of Object.entries(fetchSpec)) {
            this.nameToExchMap[networkID] = [];

            for (const [exchID, exchProp] of Object.entries(networkProp)) {
                let moduleName = Object.keys(exchProp)[0];
                let moduleSpec = exchProp[moduleName];
                //console.log(moduleSpec);
                const { createModule } = require(`./${moduleName}`);
                this.nameToExchMap[networkID].push(createModule(networkID, exchID, moduleSpec));
            }
        }
    }

    public get NAME_TO_EXCHANGE_MAP(): Object {
        return this.nameToExchMap;
    }

    private readPairs(pairsPath) {
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

    private fetchOne(module, coins, pairsOrDir, outPairsDir) {
        let pairs = typeof (pairsOrDir) === "string" ?
            this.readPairs(path.join(pairsOrDir, module.DEF_PAIRS_PATH)) :
            pairsOrDir[module.DEX_NAME + "/" + module.NET_NAME]?.pairs;
        let outPairsPath = outPairsDir ? path.join(outPairsDir, module.DEF_PAIRS_PATH) : null;
        return module.fetch(coins, pairs, outPairsPath);
    }

    public async fetch(coins, pairsOrDir, outPairsDir) {
        let promises = [];
        for (const [networkID, exchanges] of Object.entries(this.NAME_TO_EXCHANGE_MAP)) {
            for (let j = 0; j < exchanges.length; j++) {
                promises.push(this.fetchOne(exchanges[j], coins, pairsOrDir, outPairsDir));
            }
        }
        return await Promise.all(promises);
    }
}

if (require.main === module) {
    program.option('-c, --coins <path to json>', "Input path to coins json");
    program.option('-p, --pairsDir <path to directory>', "Input/output directory to pairs data json", './')
    program.option('-s, --fetchSpecs <path to json/hjson spec file>', "The spec file of networks/chains to look at.", __dirname + "/fetch_spec.hjson")
    program.parse()
    const options = program.opts()

    let coins;
    try {
        coins = options.coins !== undefined && HJSON.parse(fs.readFileSync(options.coins, "utf8"));
    } catch (err) {
        if (err?.code === 'ENOENT') {
            console.log(`Coins data file not found: ${options.coins}. Skipping coins fetch.`);
        } else {
            throw err;
        }
    }

    let fetchSpecs = HJSON.parse(fs.readFileSync(options.fetchSpecs, "utf8"));
    (new FetchModule(fetchSpecs)).fetch(coins, options.pairsDir, options.pairsDir).then(() => { console.log("\nDone fetching!\n"); })
}
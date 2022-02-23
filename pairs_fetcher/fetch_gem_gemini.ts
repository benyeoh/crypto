#!/usr/bin/env -S npx ts-node
const fs = require("fs");
import { CEXGeminiFetcher } from "./src/cex_gemini_fetcher";
import { program } from "commander";
import { filterCoins } from "./src/utils";

export const DEF_PAIRS_PATH = "pairs_gem_gemini.json";
export const NET_NAME = "Gemini";
export const DEX_NAME = "Gemini CEX";

export async function fetch(coins, pairs, outPairsPath) {
    let fetcher = new CEXGeminiFetcher();
    if (coins) {
        coins = filterCoins(coins, "gemini");
        console.log(`Fetching pairs for Gemini ...`)
        pairs = fetcher.fetchPairs(coins);
    }

    //console.log(`Updating params for Gemini ...`);
    let updatedPairs = await fetcher.updatePairs(pairs);
    //console.log(`${JSON.stringify(updatedPairs, null, 4)}`);

    const outPairs = {
        name: DEX_NAME,
        network: NET_NAME,
        pairs: updatedPairs,
        timestamp: Date.now()
    }

    //console.log(`Updated: ${outPairs.name}. Num Pairs: ${outPairs.pairs.length}`)
    if (outPairsPath) {
        fs.writeFile(outPairsPath, JSON.stringify(outPairs, null, 4), "utf8", (err) => {
            err && console.log(err);
            console.log(`Written: ${outPairsPath}.`)
        });
    }

    return outPairs;
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

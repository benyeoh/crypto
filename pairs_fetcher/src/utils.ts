const fs = require("fs");
import { ethers } from "ethers";
import { DEXFetcherUniV2 } from "./dex_fetcher"

export function filterCoins(coins: Object, network: string): Object {
    coins = JSON.parse(JSON.stringify(coins));

    let keysToRemove = []
    for (const [k, v] of Object.entries(coins)) {
        if (v["address"] instanceof Object) {
            if (network in v["address"]) {
                v["address"] = v["address"][network];
            } else {
                keysToRemove.push(k);
            }
        }
    }

    for (let i = 0; i < keysToRemove.length; i++) {
        delete coins[keysToRemove[i]];
    }

    return coins;
}

let urlToFetcher = {};

export async function fetchUniV2(coins: Object, pairs: any[], outPairsPath: string, factoryAddr: string, rpcURL: string, network: string, dexName: string) {
    const uniV2DEXFactoryAddr = factoryAddr;
    if (!(rpcURL in urlToFetcher)) {
        const provider = new ethers.providers.JsonRpcProvider({ url: rpcURL, timeout: 30000 });
        urlToFetcher[rpcURL] = new DEXFetcherUniV2(provider);
    }

    let fetcher = urlToFetcher[rpcURL];

    if (coins) {
        coins = filterCoins(coins, network.toLowerCase());
        console.log(`Fetching pairs for ${dexName} at ${network}: ${rpcURL} ...`);
        pairs = await fetcher.fetchPairs(coins, uniV2DEXFactoryAddr);
        // console.log(pairs)
    }

    console.log(`Updating params for ${dexName} at ${network}: ${rpcURL} ...`);
    pairs = await fetcher.updatePairs(pairs);
    //console.log(pairs.slice(-1));

    const outPairs = {
        name: dexName,
        factory: uniV2DEXFactoryAddr,
        network: network,
        pairs: pairs,
        timestamp: Date.now()
    };

    console.log(`Done: ${dexName} (${network}). Num Pairs: ${outPairs.pairs.length}`);
    if (outPairsPath) {
        fs.writeFile(outPairsPath, JSON.stringify(outPairs, null, 4), "utf8", (err) => {
            err && console.log(err);
            console.log(`Written: ${outPairsPath}.`);
        });
    }

    return outPairs;
}

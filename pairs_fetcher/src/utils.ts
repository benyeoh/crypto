const fs = require("fs");
import { ethers } from "ethers";
//import { DEXFetcherUniV2 } from "./dex_fetcher"
import { DEXFetcherUniV2Multicall } from "./dex_fetcher_multicall";
import { StaticFeesJsonRpcProvider } from "./provider";

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

export async function fetchUniV2(
    coins: Object,
    pairs: any[],
    outPairsPath: string,
    factoryAddr: string,
    rpcURL: string,
    network: string,
    dexName: string,
    multicallAddr: string = null,
    filterLowLiquidity: boolean = false) {

    const uniV2DEXFactoryAddr = factoryAddr;

    let callID = network + " " + dexName;
    if (!(callID in urlToFetcher)) {
        urlToFetcher[callID] = {};
    }

    if (!(rpcURL in urlToFetcher[callID])) {
        const provider = new StaticFeesJsonRpcProvider({ url: rpcURL, timeout: 5000, allowGzip: true });
        urlToFetcher[callID][rpcURL] = new DEXFetcherUniV2Multicall();
        await urlToFetcher[callID][rpcURL].initialize(provider, multicallAddr);
    }

    let fetcher = urlToFetcher[callID][rpcURL];

    try {
        if (coins) {
            coins = filterCoins(coins, network.toLowerCase());
            console.log(`Fetching pairs for ${dexName} at ${network}: ${rpcURL} ...`);
            pairs = await fetcher.fetchPairs(coins, uniV2DEXFactoryAddr);
            //console.log(pairs)
        }

        //console.log(`Updating params for ${dexName} at ${network}: ${rpcURL} ...`);
        pairs = await fetcher.updatePairs(pairs);
        //console.log(pairs.slice(-1));

        if (filterLowLiquidity) {
            let filteredPairs = [];
            // TODO: Filter only USD pegged items for now
            const MIN_USD_VALUE = 500.0;
            for (let i = 0; i < pairs.length; i++) {
                if (!((pairs[i].token1.peg === "USD" && Number(pairs[i].token1Reserve) < MIN_USD_VALUE) ||
                    (pairs[i].token2.peg === "USD" && Number(pairs[i].token2Reserve) < MIN_USD_VALUE))) {
                    filteredPairs.push(pairs[i]);
                }
            }
            if (pairs.length !== filteredPairs.length) {
                console.log(`${dexName} at ${network}: Removed ${pairs.length - filteredPairs.length} pairs due to low liquidity ...`);
            }

            pairs = filteredPairs;
        }
    } catch (err) {
        delete urlToFetcher[callID][rpcURL];
        throw err;
    }

    const outPairs = {
        name: dexName,
        factory: uniV2DEXFactoryAddr,
        network: network,
        pairs: pairs,
        timestamp: Date.now()
    };

    //console.log(`Updated: ${dexName} (${network}). Num Pairs: ${outPairs.pairs.length}`);
    if (outPairsPath) {
        fs.writeFile(outPairsPath, JSON.stringify(outPairs, null, 4), "utf8", (err) => {
            err && console.log(err);
            console.log(`Written: ${outPairsPath}.`);
        });
    }

    return outPairs;
}

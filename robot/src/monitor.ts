const workerpool = require("workerpool");

import { rejects } from 'assert';
import chalk from 'chalk';
import * as fetch from "../../pairs_fetcher/fetch";
import { PairStates } from "./pair_states";

export class Monitor {
    private coins: Object;
    private networks: Array<string>;
    private coinStart: Object;
    private coinAvail: Object;
    private updateTime: number;
    private staleTime: number;
    private findTradesTime: number;
    private pairStates: Array<PairStates>;

    constructor(coins, tradeCoins, updateTime = 1500, staleTime = 1500 + 500, findTradesTime = 1000) {
        this.coins = coins;
        this.updateTime = updateTime;
        this.staleTime = staleTime;
        this.findTradesTime = findTradesTime;
        this.parseTradeCoins(tradeCoins);
    }

    private parseTradeCoins(tradeCoins: Object) {
        let coinAvail = {};
        let coinStart = {};
        let networks = new Set<string>();

        function processAvail(avail) {
            let translatedAvail = [];
            for (let i = 0; i < avail.length; i++) {
                let exchanges = fetch.NAME_TO_EXCHANGE_MAP[avail[i]];
                translatedAvail.push(exchanges[0].NET_NAME);
            }
            return translatedAvail;
        }

        if ("*" in tradeCoins) {
            for (const [k, v] of Object.entries(this.coins)) {
                coinAvail[k] = processAvail(tradeCoins["*"].availability);
            }

            for (let i = 0; i < tradeCoins["*"].availability.length; i++) {
                networks.add(tradeCoins["*"].availability[i]);
            }

            delete tradeCoins["*"];
        }

        for (const [k, v] of Object.entries(tradeCoins)) {
            coinAvail[k] = processAvail(v.availability);
            for (let i = 0; i < v.availability.length; i++) {
                networks.add(v.availability[i]);
            }
            if ("trade" in v) {
                coinStart[k] = v.trade;
            }
        }

        this.coinAvail = coinAvail;
        this.coinStart = coinStart;
        this.networks = Array.from(networks);
    }

    async go(pathCallback = [], filterAddrs = null) {
        const pool = workerpool.pool(__dirname + "/fetch_worker_task.js", {
            minWorkers: "max",
            workerType: "auto"
        });

        this.pairStates = [];
        for (let i = 0; i < this.networks.length; i++) {
            let mods = fetch.NAME_TO_EXCHANGE_MAP[this.networks[i]];
            for (let j = 0; j < mods.length; j++) {
                this.pairStates.push(new PairStates(mods[j], this.updateTime));
            }
        }

        console.log("Starting async pair updates ...");
        for (let i = 0; i < this.pairStates.length; i++) {
            let exchangeID = this.pairStates[i].getFetcher().DEX_NAME + ` (${this.pairStates[i].getFetcher().NET_NAME})`;
            let pairFilterAddrs = filterAddrs ? filterAddrs[exchangeID] : null;
            this.pairStates[i].initialize(this.coins, pairFilterAddrs).then(() => {
                this.pairStates[i].start();
            });
        }

        let iterNum = 0;
        let bestDeltas = [];
        let foundOccurences = 0;
        for (let i = 0; i < Object.keys(this.coinStart).length; i++) {
            bestDeltas.push(0);
        }

        while (true) {
            let now = Date.now();
            let allPairs = [];
            let pairNames = [];
            for (let i = 0; i < this.pairStates.length; i++) {
                let pairs = this.pairStates[i].getState();
                if ((now - pairs.timestamp) < this.staleTime) {
                    // Perform a deep copy to be safe
                    allPairs.push(JSON.parse(JSON.stringify(pairs)));
                    //allPairs.push(pairs);
                    pairNames.push(chalk.green(pairs.name + " (" + pairs.network + ")"));
                } else {
                    pairNames.push(chalk.red(pairs.name + " (" + pairs.network + ")"));
                }
            }

            console.log(chalk.grey("Finding trades: [ ") + pairNames.join(" | ") + "]");

            let waitTimeout = new Promise((res) => { setTimeout(res, this.findTradesTime); });
            let pathPromises = [];
            let pathCoin = [];
            for (const [k, v] of Object.entries(this.coinStart)) {
                pathCoin.push(k);
                pathPromises.push(pool.exec("findTrades", [allPairs, k, v.maxPathLen, v.minDelta, v.minLiquidity, this.coinAvail]));
            }

            // Wait for results of trade finding
            let allPathResults = [];
            for (let i = 0; i < pathPromises.length; i++) {
                let results = await pathPromises[i].catch((err) => {
                    console.log(chalk.dim.gray(`${err.message}`));
                    return [];
                });

                allPathResults.push(results);
            }

            // Notify custom callbacks of trades found
            for (let j = 0; j < pathCallback.length; j++) {
                pathCallback[j](allPathResults, pathCoin, now);
            }

            // Some logging
            let foundOne = 0;
            for (let i = 0; i < allPathResults.length; i++) {
                let allPaths = allPathResults[i];
                let path = allPaths.slice(-1)[0];
                if (path) {
                    console.log(`Results for ${pathCoin[i]}:`);
                    console.log(JSON.stringify(path, null, 4));
                    if (path.optimalDelta >= bestDeltas[i]) {
                        bestDeltas[i] = path.optimalDelta;
                    }

                    foundOne = 1;
                }
            }

            foundOccurences += foundOne;

            console.log(`${chalk.cyan(new Date().toLocaleString())}: Finished iteration ${iterNum}. `
                + `Found ${chalk.green(foundOccurences)} so far. Best deltas: ${chalk.yellow(bestDeltas)}`);
            iterNum += 1;

            // Wait for timeout
            await waitTimeout;
        }
    }
}

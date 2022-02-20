const workerpool = require("workerpool");
import * as fetch from "../../pairs_fetcher/fetch";
import { PairStates } from "./pair_states";

export class Monitor {
    private coins: Object;
    private logDir: string;
    private networks: Array<string>;
    private coinStart: Object;
    private coinAvail: Object;
    private updateTime: number;
    private staleTime: number;
    private findTradesTime: number;
    private pairStates: Array<PairStates>;

    constructor(coins, logDir, tradeCoins, updateTime = 3000, staleTime = 3000 * 2, findTradesTime = 1000) {
        this.coins = coins;
        this.logDir = logDir;
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
                translatedAvail.push(exchanges[0].NET_NAME)
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
            for (let i = 0; i < v.availability; i++) {
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

    async go() {
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

        let initPromises = [];
        for (let i = 0; i < this.pairStates.length; i++) {
            initPromises.push(this.pairStates[i].initialize(this.coins));
        }

        console.log("Waiting for pairs to initialize ...")
        await Promise.all(initPromises);

        console.log("Starting async pair updates ...");
        for (let i = 0; i < this.pairStates.length; i++) {
            this.pairStates[i].start();
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
            let allPairsNames = [];
            for (let i = 0; i < this.pairStates.length; i++) {
                let pairs = this.pairStates[i].getState();
                if ((now - pairs.timestamp) < this.staleTime) {
                    allPairs.push(pairs);
                    allPairsNames.push(pairs.name + " (" + pairs.network + ")");
                }
            }

            console.log(`Finding trades for: ${allPairsNames}`);
            let waitTimeout = new Promise((res) => { setTimeout(res, this.findTradesTime); });
            let pathPromises = [];
            let pathCoin = [];
            for (const [k, v] of Object.entries(this.coinStart)) {
                //console.log(`Finding trade for ${k} ...`)
                pathCoin.push(k);
                pathPromises.push(pool.exec("findTrades", [allPairs, k, v.maxPathLen, v.minDelta, v.minLiquidity]));
            }

            try {
                let allPaths = await Promise.all(pathPromises);
                for (let i = 0; i < allPaths.length; i++) {
                    let path = allPaths[i].slice(-1)[0];
                    if (path) {
                        console.log(`Results for ${pathCoin[i]}:`);
                        console.log(JSON.stringify(path, null, 4));
                        if (path.optimalDelta >= bestDeltas[i]) {
                            bestDeltas[i] = path.optimalDelta;
                        }

                        foundOccurences += 1;
                    }
                }
            } catch (err) {
                //console.error(err);
            }

            console.log(`${Date().toString()}: Finished iteration ${iterNum}. Found ${foundOccurences} so far. Best deltas: ${bestDeltas}`);
            iterNum += 1;

            // Wait for timeout
            await waitTimeout;
        }
    }

    // async go() {
    //     const pool = workerpool.pool(__dirname + "/fetch_worker_task.js", {
    //         minWorkers: "max",
    //         workerType: "auto"
    //     });

    //     let exchangePairs = {};

    //     while (true) {
    //         try {
    //             let fetchedPairs = await fetch.fetch(this.coins, exchangePairs, this.logDir, this.networks);
    //             for (let i = 0; i < fetchedPairs.length; i++) {
    //                 exchangePairs[fetchedPairs[i]["name"] + "/" + fetchedPairs[i]["network"]] = fetchedPairs[i];
    //             }
    //             break;
    //         } catch (err) {
    //             console.error(err);
    //             await new Promise((res) => { setTimeout(res, 10000); });

    //             console.log("Re-fetching all data ...")
    //         }
    //     }

    //     await new Promise((res) => { setTimeout(res, 10000); });

    //     let iterNum = 0;
    //     let bestDeltas = [];
    //     let foundOccurences = 0;
    //     for (let i = 0; i < Object.keys(this.coinStart).length; i++) {
    //         bestDeltas.push(0);
    //     }

    //     while (true) {
    //         console.log("Scanning ...");

    //         try {
    //             let waitTimeout = new Promise((res) => { setTimeout(res, this.updateTime); });

    //             // Get pairs
    //             console.log("Fetching pairs ...")
    //             let allPairs = await fetch.fetch(null, exchangePairs, this.logDir, this.networks);

    //             // Find trades
    //             console.log("Finding trades ...")
    //             let pathPromises = [];
    //             let pathCoin = [];
    //             for (const [k, v] of Object.entries(this.coinStart)) {
    //                 console.log(`Finding trade for ${k} ...`)
    //                 pathCoin.push(k);
    //                 pathPromises.push(pool.exec("findTrades", [allPairs, k, v.maxPathLen, v.minDelta, v.minLiquidity]));
    //             }

    //             let allPaths = await Promise.all(pathPromises);
    //             for (let i = 0; i < allPaths.length; i++) {
    //                 let path = allPaths[i].slice(-1)[0];
    //                 if (path) {
    //                     console.log(`Results for ${pathCoin[i]}:`);
    //                     console.log(JSON.stringify(path, null, 4));
    //                     if (path.optimalDelta >= bestDeltas[i]) {
    //                         bestDeltas[i] = path.optimalDelta;
    //                     }

    //                     foundOccurences += 1;
    //                 }
    //             }

    //             console.log(`${Date().toString()}: Finished iteration ${iterNum}. Found ${foundOccurences} so far. Best deltas: ${bestDeltas}`);
    //             iterNum += 1;

    //             // Wait for timeout
    //             await waitTimeout;
    //         } catch (err) {
    //             console.error(err);
    //             await new Promise((res) => { setTimeout(res, this.updateTime); });
    //         }
    //     }
    // }
}
